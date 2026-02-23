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

export type AnalysisResult = {
    success: boolean
    totalRows: number
    validCount: number
    errorCount: number
    rows: {
        rowNumber: number
        date?: string
        name?: string
        guests?: number
        isValid: boolean
        error?: string
        rawData: any
    }[]
    error?: string
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

function parseFlexibleDate(dateStr: string): Date {
    if (!dateStr) return new Date(NaN)

    // Normalize separators
    const normalized = dateStr.replaceAll('/', '-')

    // Try standard parseISO first
    const d1 = parseISO(normalized)
    if (!isNaN(d1.getTime())) return d1

    // Handle single digit month/day (YYYY-M-D -> YYYY-MM-DD)
    const parts = normalized.split('-')
    if (parts.length === 3) {
        const y = parts[0]
        const m = parts[1].padStart(2, '0')
        const day = parts[2].padStart(2, '0')
        const d2 = parseISO(`${y}-${m}-${day}`)
        if (!isNaN(d2.getTime())) return d2
    }

    return new Date(NaN)
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

        // スプシ書き込み（失敗しても在庫更新はロールバックしない）
        const webhookUrl = await getSystemSetting('HISTORY_WEBHOOK_URL')
        if (webhookUrl) {
            const detail = memo
                ? `${reason}: ${memo}`
                : reason === 'CORRECTION' ? '棚卸し訂正' : '在庫調整'
            await pushToHistorySheet(webhookUrl, detail).catch(e =>
                console.error('History sheet push failed (ignored):', e)
            )
        }

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

        // スプシ書き込み（失敗しても在庫更新はロールバックしない）
        const webhookUrl = await getSystemSetting('HISTORY_WEBHOOK_URL')
        if (webhookUrl) {
            await pushToHistorySheet(webhookUrl, '在庫調整 (一括)').catch(e =>
                console.error('History sheet push failed (ignored):', e)
            )
        }

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

            const checkIn = parseFlexibleDate(row.checkin_date)
            if (isNaN(checkIn.getTime())) {
                console.error(`Invalid date in CSV: ${row.checkin_date}`)
                continue
            }

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

            const checkIn = parseFlexibleDate(dateStr)
            if (isNaN(checkIn.getTime())) continue

            // Re-format normalizedDate for ID stability (YYYY-MM-DD)
            const stableDateStr = format(checkIn, 'yyyy-MM-dd')
            const bookingId = `${stableDateStr}-${name}`
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
        return { success: false, error: String(error) }
    }
}

export async function analyzeGoogleSheet(url: string): Promise<AnalysisResult> {
    if (!url) return { success: false, totalRows: 0, validCount: 0, errorCount: 0, rows: [], error: 'URL is required' }

    try {
        let csvUrl = url
        if (url.includes('/pubhtml')) {
            csvUrl = url.replace('/pubhtml', '/pub?output=csv')
        } else if (url.includes('/edit')) {
            csvUrl = url.replace(/\/edit.*$/, '/export?format=csv')
        }

        console.log('Analyzing CSV from:', csvUrl)
        const res = await fetch(csvUrl)
        if (!res.ok) throw new Error('Failed to fetch CSV')
        const text = await res.text()
        const { data } = Papa.parse(text, { header: true, skipEmptyLines: true })

        const rows: AnalysisResult['rows'] = []
        let validCount = 0
        let errorCount = 0

        // @ts-ignore
        data.forEach((row: any, index: number) => {
            const rowNumber = index + 2 // 1-based + header
            const dateStr = row['日付']
            const name = row['宿泊者名'] ?? row['人数'] // Fallback logic same as sync
            const guestsStr = row['人数'] ?? row['備考']

            let isValid = true
            let error = undefined
            let parsedDate = undefined
            let parsedGuests = undefined

            if (!dateStr) {
                isValid = false
                error = '日付が空です'
            } else {
                const d = parseFlexibleDate(dateStr)
                if (isNaN(d.getTime())) {
                    isValid = false
                    error = `日付形式が不正です (${dateStr})`
                } else {
                    parsedDate = format(d, 'yyyy-MM-dd')
                }
            }

            if (!guestsStr) {
                // If guests is missing, it might be valid if it's not a booking row?
                // But simplified logic: if date is present, we expect a booking.
                if (isValid) {
                    isValid = false
                    error = '人数(または宿泊者名)が空です'
                }
            } else {
                const g = parseInt(guestsStr, 10)
                if (isNaN(g)) {
                    if (isValid) {
                        isValid = false
                        error = `人数が数値ではありません (${guestsStr})`
                    }
                } else {
                    parsedGuests = g
                }
            }

            if (isValid) {
                validCount++
            } else {
                errorCount++
            }

            rows.push({
                rowNumber,
                date: parsedDate ?? dateStr, // Show parsed if success, else raw
                name: name,
                guests: parsedGuests,
                isValid,
                error,
                rawData: row
            })
        })

        return {
            success: true,
            totalRows: data.length,
            validCount,
            errorCount,
            rows: rows.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
        }

    } catch (error) {
        console.error('Analysis failed:', error)
        return { success: false, totalRows: 0, validCount: 0, errorCount: 0, rows: [], error: String(error) }
    }
}
// ... existing code ...

export async function syncStockSheet(url: string): Promise<{
    success: boolean
    count?: number
    changes?: { name: string; before: number; after: number }[]
    date?: string
    detail?: string
    error?: string
}> {
    if (!url) return { success: false, error: 'URL is required' }

    try {
        let csvUrl = url
        if (url.includes('/pubhtml')) {
            csvUrl = url.replace('/pubhtml', '/pub?output=csv')
        } else if (url.includes('/edit')) {
            csvUrl = url.replace(/\/edit.*$/, '/export?format=csv')
        }

        const res = await fetch(csvUrl, { cache: 'no-store' })
        if (!res.ok) throw new Error('CSVの取得に失敗しました')
        const text = await res.text()
        const { data } = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true })

        if (data.length === 0) return { success: false, error: 'スプレッドシートにデータがありません' }

        // 最新行（最終行）を使用
        const latestRow = data[data.length - 1]

        // 列名 → Item.name のマッピング（スプシの列名とDB上の品目名が一致）
        const ITEM_NAME_COLUMNS = ['ボックスシーツ', 'デュベカバー', '枕カバー', 'バスタオル', 'フェイスタオル']

        const items = await prisma.item.findMany()
        const snapshots = await prisma.stockSnapshot.findMany()

        const changes: { name: string; before: number; after: number }[] = []
        const dateStr = latestRow['変更日'] ?? ''
        const detail = latestRow['詳細'] ?? '棚卸し同期'

        for (const colName of ITEM_NAME_COLUMNS) {
            const raw = latestRow[colName]
            if (raw === undefined || raw === '') continue

            const newCount = parseInt(raw, 10)
            if (isNaN(newCount)) continue

            // DBのItemを名前で検索
            const item = items.find(i => i.name === colName)
            if (!item) continue

            const currentSnap = snapshots.find(s => s.itemId === item.id)
            const currentCount = currentSnap?.shelfCount ?? 0

            if (currentCount === newCount) continue // 変化なし

            const delta = newCount - currentCount

            // イベント記録 + スナップショット更新
            await prisma.$transaction([
                prisma.actualEvent.create({
                    data: {
                        itemId: item.id,
                        delta,
                        reason: 'CORRECTION',
                        memo: `棚卸しスプシ同期: ${dateStr} ${detail}`
                    }
                }),
                prisma.stockSnapshot.upsert({
                    where: { itemId: item.id },
                    update: { shelfCount: newCount },
                    create: { itemId: item.id, shelfCount: newCount }
                })
            ])

            changes.push({ name: colName, before: currentCount, after: newCount })
        }

        revalidatePath('/')
        return { success: true, count: changes.length, changes, date: dateStr, detail }
    } catch (error) {
        console.error('Stock sheet sync failed:', error)
        return { success: false, error: String(error) }
    }
}

export async function initializeData() {
    try {
        const items = [
            { name: 'ボックスシーツ', unit: '枚', formulaType: 'SIMPLE', id: 'box-sheet' },
            { name: 'デュベカバー', unit: '枚', formulaType: 'SIMPLE', id: 'duvet-cover' },
            { name: '枕カバー', unit: '枚', formulaType: 'SIMPLE', id: 'pillow-cover' },
            { name: 'バスタオル', unit: '枚', formulaType: 'TOWEL_B', id: 'bath-towel' },
            { name: 'フェイスタオル', unit: '枚', formulaType: 'TOWEL_F', id: 'face-towel' },
        ];

        let count = 0;
        for (const item of items) {
            const existing = await prisma.item.findUnique({ where: { id: item.id } })
            if (!existing) {
                await prisma.item.create({ data: item })
                count++
            }

            // Ensure stock snapshot exists
            const stock = await prisma.stockSnapshot.findUnique({ where: { itemId: item.id } })
            if (!stock) {
                await prisma.stockSnapshot.create({
                    data: { itemId: item.id, shelfCount: 0 }
                })
            }
        }
        revalidatePath('/')
        return { success: true, count }
    } catch (error) {
        console.error('Init failed:', error)
        return { success: false, error: String(error) }
    }
}

// ---- 履歴スプシ書き込みヘルパー ----

/**
 * Google Apps Script Web App（Webhook）を通じてスプシに1行追記する。
 * 各品目の最新在庫スナップショットを取得して送信する。
 * 失敗時は例外をthrowするので、呼び出し元でcatchすること。
 */
async function pushToHistorySheet(webhookUrl: string, detail: string) {
    // 品目IDとスプシ列名のマッピング
    const ITEM_MAP: Record<string, string> = {
        'box-sheet': 'ボックスシーツ',
        'duvet-cover': 'デュベカバー',
        'pillow-cover': '枕カバー',
        'bath-towel': 'バスタオル',
        'face-towel': 'フェイスタオル',
    }

    // 現在の在庫スナップショットを取得
    const snapshots = await prisma.stockSnapshot.findMany({
        include: { item: true }
    })

    // 品目名 → 在庫数のマップを作成
    const stockMap: Record<string, number> = {}
    for (const snap of snapshots) {
        const colName = ITEM_MAP[snap.itemId]
        if (colName) stockMap[colName] = snap.shelfCount
    }

    // 日本時間で日付・時間を生成
    const now = new Date()
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    const date = `${jst.getUTCFullYear()}/${String(jst.getUTCMonth() + 1).padStart(2, '0')}/${String(jst.getUTCDate()).padStart(2, '0')}`
    const time = `${String(jst.getUTCHours()).padStart(2, '0')}:${String(jst.getUTCMinutes()).padStart(2, '0')}`

    // GETパラメータとして送信（POSTのリダイレクト問題を回避）
    const params = new URLSearchParams({
        date,
        time,
        detail,
        ...Object.fromEntries(
            Object.entries(stockMap).map(([k, v]) => [k, String(v)])
        )
    })

    const url = `${webhookUrl}?${params.toString()}`

    const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
    })

    if (!res.ok) {
        throw new Error(`Webhook responded with status ${res.status}`)
    }
}

export async function saveHistoryWebhookUrl(url: string) {
    return saveSystemSetting('HISTORY_WEBHOOK_URL', url)
}

export async function getHistoryWebhookUrl() {
    return getSystemSetting('HISTORY_WEBHOOK_URL')
}
