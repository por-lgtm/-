'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import Papa from 'papaparse'
import { startOfDay, parseISO, isBefore, addDays, format } from 'date-fns'

// --- Types ---
export type StockUpdateReason = 'PURCHASE' | 'LAUNDRY' | 'LOST' | 'DISCARD' | 'CORRECTION' | 'OTHER'

export type BookingRow = {
    booking_id: string
    checkin_date: string
    guests: string
}

// --- Constants & Formulas ---
function ceilHalf(n: number) {
    return Math.ceil(n / 2)
}

function calculateConsumption(guests: number, formulaType: string): number {
    const N = guests
    if (N <= 0) return 0
    switch (formulaType) {
        case 'SIMPLE': return N
        case 'TOWEL_B': return N + ceilHalf(N) + 8
        case 'TOWEL_F': return N + ceilHalf(N) + 3
        default: return N
    }
}

// --- Actions ---

export async function updateStock(itemId: string, delta: number, reason: StockUpdateReason, memo?: string, absoluteValue?: number) {
    try {
        let finalDelta = delta
        if (reason === 'CORRECTION' && absoluteValue !== undefined) {
            const current = await prisma.stockSnapshot.findUnique({ where: { itemId } })
            const currentCount = current?.shelfCount ?? 0
            finalDelta = absoluteValue - currentCount
        }

        if (finalDelta === 0 && reason !== 'CORRECTION') return { success: true }

        await prisma.$transaction([
            prisma.actualEvent.create({
                data: { itemId, delta: finalDelta, reason, memo }
            }),
            prisma.stockSnapshot.upsert({
                where: { itemId },
                update: { shelfCount: { increment: finalDelta } },
                create: { itemId, shelfCount: finalDelta }
            })
        ])

        revalidatePath('/')
        return { success: true }
    } catch (error) {
        console.error('Failed to update stock:', error)
        return { success: false, error: 'Failed to update stock' }
    }
}

export async function updateStockBatch(updates: { itemId: string, delta: number }[]) {
    try {
        const transaction = updates.map(u =>
            prisma.actualEvent.create({
                data: {
                    itemId: u.itemId,
                    delta: u.delta,
                    reason: 'OTHER',
                    memo: '一括操作'
                }
            })
        )

        const snapshotUpdates = updates.map(u =>
            prisma.stockSnapshot.upsert({
                where: { itemId: u.itemId },
                update: { shelfCount: { increment: u.delta } },
                create: { itemId: u.itemId, shelfCount: u.delta }
            })
        )

        await prisma.$transaction([...transaction, ...snapshotUpdates])

        revalidatePath('/')
        return { success: true }
    } catch (error) {
        console.error('Failed to batch update:', error)
        return { success: false, error: 'Failed to batch update' }
    }
}

export async function importBookings(formData: FormData) {
    const file = formData.get('file') as File
    if (!file) return { success: false, error: 'No file uploaded' }

    const text = await file.text()
    const { data, errors } = Papa.parse<BookingRow>(text, { header: true, skipEmptyLines: true })

    if (errors.length > 0) console.error('CSV Parse Errors:', errors)

    const items = await prisma.item.findMany()
    let count = 0

    try {
        for (const row of data) {
            if (!row.booking_id || !row.checkin_date || !row.guests) continue
            const guests = parseInt(row.guests, 10)
            if (isNaN(guests)) continue
            const checkIn = parseISO(row.checkin_date)

            await prisma.booking.upsert({
                where: { bookingId: row.booking_id },
                update: { checkIn, guests, importedAt: new Date() },
                create: { bookingId: row.booking_id, checkIn, guests, importedAt: new Date() }
            })

            await prisma.plannedEvent.deleteMany({ where: { bookingId: row.booking_id } })

            const plannedEventsData = items.map(item => {
                const consumption = calculateConsumption(guests, item.formulaType)
                return {
                    bookingId: row.booking_id,
                    itemId: item.id,
                    date: startOfDay(checkIn),
                    delta: -consumption,
                    note: `Booking #${row.booking_id} Check-in`,
                }
            })

            if (plannedEventsData.length > 0) {
                await prisma.plannedEvent.createMany({ data: plannedEventsData })
            }
            count++
        }
        revalidatePath('/')
        return { success: true, count }
    } catch (error) {
        console.error('Import failed:', error)
        return { success: false, error: 'Import failed' }
    }
}

export async function getForecastData(days = 14) {
    const today = startOfDay(new Date())
    const endDate = addDays(today, days)

    const stocks = await prisma.stockSnapshot.findMany()
    const items = await prisma.item.findMany()

    const stockMap = new Map<string, { current: number, name: string }>()
    items.forEach(item => {
        const s = stocks.find(s => s.itemId === item.id)
        stockMap.set(item.id, { current: s?.shelfCount ?? 0, name: item.name })
    })

    const planned = await prisma.plannedEvent.findMany({
        where: { date: { gte: today, lte: endDate } },
        orderBy: { date: 'asc' }
    })

    // Forecast now returns { count: number, events: PlannedEvent[] }
    const forecast: Record<string, Record<string, { count: number, events: any[] }>> = {}
    const runningStock = new Map<string, number>()
    stockMap.forEach((v, k) => runningStock.set(k, v.current))

    // Fetch related bookings to get guest counts
    const bookingIds = Array.from(new Set(planned.map(e => e.bookingId).filter(Boolean)))
    const bookings = await prisma.booking.findMany({
        where: { bookingId: { in: bookingIds } }
    })
    const bookingMap = new Map<string, number>()
    bookings.forEach(b => bookingMap.set(b.bookingId, b.guests))

    for (let i = 0; i <= days; i++) {
        const d = addDays(today, i)
        const dKey = format(d, 'yyyy-MM-dd')

        // Find events for this specific day
        const daysEvents = planned.filter(e => startOfDay(e.date).getTime() === d.getTime())

        // Apply deltas to running stock
        daysEvents.forEach(e => {
            const current = runningStock.get(e.itemId) ?? 0
            runningStock.set(e.itemId, current + e.delta)
        })

        // Capture snapshot for this day, now including events per item
        const dailyStatus: Record<string, { count: number, events: any[] }> = {}
        items.forEach(item => {
            const itemEvents = daysEvents.filter(e => e.itemId === item.id).map(e => ({
                ...e,
                guests: e.bookingId ? bookingMap.get(e.bookingId) : undefined
            }))
            dailyStatus[item.id] = {
                count: runningStock.get(item.id) ?? 0,
                events: itemEvents
            }
        })
        forecast[dKey] = dailyStatus
    }

    const shortages: { date: string, itemName: string, count: number }[] = []
    for (const [date, statuses] of Object.entries(forecast)) {
        for (const [itemId, data] of Object.entries(statuses)) {
            if (data.count < 0) {
                shortages.push({
                    date,
                    itemName: stockMap.get(itemId)?.name ?? itemId,
                    count: data.count
                })
            }
        }
    }
    shortages.sort((a, b) => a.date.localeCompare(b.date))

    return { stockMap: Object.fromEntries(stockMap), forecast, shortages }
}

export async function getHistoryData(days = 30) {
    const today = startOfDay(new Date())
    const startDate = addDays(today, -days)

    const stocks = await prisma.stockSnapshot.findMany()
    const items = await prisma.item.findMany()

    const stockMap = new Map<string, { current: number, name: string }>()
    items.forEach(item => {
        const s = stocks.find(s => s.itemId === item.id)
        stockMap.set(item.id, { current: s?.shelfCount ?? 0, name: item.name })
    })

    const events = await prisma.actualEvent.findMany({
        where: { createdAt: { gte: startDate } },
        orderBy: { createdAt: 'desc' }
    })

    const history: Record<string, Record<string, { count: number, events: any[] }>> = {}
    const runningStock = new Map<string, number>()
    stockMap.forEach((v, k) => runningStock.set(k, v.current))

    const eventsByDay: Record<string, typeof events> = {}
    events.forEach(e => {
        const dKey = format(e.createdAt, 'yyyy-MM-dd')
        if (!eventsByDay[dKey]) eventsByDay[dKey] = []
        eventsByDay[dKey].push(e)
    })

    for (let i = 0; i < days; i++) {
        const d = addDays(today, -i)
        const dKey = format(d, 'yyyy-MM-dd')

        const dailyStatus: Record<string, { count: number, events: any[] }> = {}
        items.forEach(item => {
            const dayEvents = (eventsByDay[dKey] || []).filter(e => e.itemId === item.id)
            dailyStatus[item.id] = {
                count: runningStock.get(item.id) ?? 0,
                events: dayEvents
            }
        })
        history[dKey] = dailyStatus

        const daysEvents = eventsByDay[dKey] || []
        daysEvents.forEach(e => {
            const current = runningStock.get(e.itemId) ?? 0
            runningStock.set(e.itemId, current - e.delta)
        })
    }
    return { stockMap: Object.fromEntries(stockMap), history }
}

export async function saveSystemSetting(key: string, value: string) {
    await prisma.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
    })
}

export async function getSystemSetting(key: string) {
    const setting = await prisma.systemSetting.findUnique({ where: { key } })
    return setting?.value ?? ''
}

export async function syncGoogleBookings(url: string) {
    if (!url) return { success: false, error: 'URL is required' }
    try {
        let csvUrl = url
        if (url.includes('/pubhtml')) {
            csvUrl = url.replace('/pubhtml', '/pub?output=csv')
        } else if (url.includes('/edit')) {
            csvUrl = url.replace(/\/edit.*$/, '/export?format=csv')
        }

        console.log('Fetching CSV from:', csvUrl)
        const res = await fetch(csvUrl)
        if (!res.ok) throw new Error('Failed to fetch CSV')
        const text = await res.text()
        const { data } = Papa.parse(text, { header: true, skipEmptyLines: true })

        const items = await prisma.item.findMany()
        let count = 0

        const validBookingIds = new Set<string>()

        for (const row of data as any[]) {
            const dateStr = row['日付']
            const name = row['宿泊者名'] ?? row['人数'] // Fallback for old format if needed, but prioritize '宿泊者名'
            const guestsStr = row['人数'] ?? row['備考'] // Prioritize '人数' for guests

            if (!dateStr || !guestsStr) continue
            const guests = parseInt(guestsStr, 10)
            if (isNaN(guests)) continue

            const normalizedDate = dateStr.replaceAll('/', '-')
            const checkIn = parseISO(normalizedDate)
            const bookingId = `${normalizedDate}-${name}`
            validBookingIds.add(bookingId)

            await prisma.booking.upsert({
                where: { bookingId },
                update: { checkIn, guests, importedAt: new Date() },
                create: { bookingId, checkIn, guests, importedAt: new Date() }
            })
            await prisma.plannedEvent.deleteMany({ where: { bookingId } })

            const plannedEventsData = items.map(item => {
                const consumption = calculateConsumption(guests, item.formulaType)
                return {
                    bookingId,
                    itemId: item.id,
                    date: startOfDay(checkIn),
                    delta: -consumption,
                    note: `${name}様 Check-in`,
                }
            })
            if (plannedEventsData.length > 0) await prisma.plannedEvent.createMany({ data: plannedEventsData })
            count++
        }

        // --- Handle Deletions ---
        // Find existing bookings that are NOT in the validBookingIds set
        const allBookings = await prisma.booking.findMany({ select: { bookingId: true } })
        const idsToDelete = allBookings
            .map(b => b.bookingId)
            .filter(id => !validBookingIds.has(id))

        if (idsToDelete.length > 0) {
            console.log('Deleting missing bookings:', idsToDelete)
            await prisma.plannedEvent.deleteMany({ where: { bookingId: { in: idsToDelete } } })
            await prisma.booking.deleteMany({ where: { bookingId: { in: idsToDelete } } })
        }

        revalidatePath('/')
        return { success: true, count }
    } catch (error) {
        console.error('Sync failed:', error)
        return { success: false, error: 'Sync failed' }
    }
}
