'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { clsx } from 'clsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Event = {
    id: string
    delta: number
    note?: string
    date: Date
    itemId: string
    bookingId?: string
    guests?: number
}

type ForecastTableProps = {
    stockMap: Record<string, { current: number, name: string }>
    forecast: Record<string, Record<string, { count: number, events: Event[] }>>
    thresholds: Record<string, number>
}

export default function ForecastTable({ stockMap, forecast, thresholds }: ForecastTableProps) {
    const dates = Object.keys(forecast).sort((a, b) => new Date(a).getTime() - new Date(b).getTime()) // Ascending
    const itemIds = Object.keys(stockMap)

    const [selectedDate, setSelectedDate] = useState<{ date: string, events: Event[] } | null>(null)

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden border">
            {/* Scrollable Container with Sticky Header */}
            <div className="max-h-[75vh] overflow-auto relative">
                <table className="w-full text-xs md:text-sm text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-40 shadow-sm">
                        <tr>
                            <th className="p-2 md:p-3 border-b border-black min-w-[80px] md:min-w-[100px] whitespace-nowrap bg-slate-100 z-50 sticky left-0 border-r border-black">日付</th>
                            {itemIds.map(id => (
                                <th key={id} className="p-2 md:p-3 border-b border-black min-w-[60px] md:min-w-[80px] text-center whitespace-nowrap bg-slate-100 border-r border-black last:border-r-0">
                                    {stockMap[id].name}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black">
                        {dates.map(date => {
                            // Aggregate all events for this date
                            const dayEvents: Event[] = []
                            itemIds.forEach(itemId => {
                                const cell = forecast[date][itemId]
                                if (cell?.events) {
                                    dayEvents.push(...cell.events)
                                }
                            })
                            const hasEvents = dayEvents.length > 0

                            return (
                                <tr key={date} className="hover:bg-slate-50 transition-colors">
                                    {/* Sticky Date Column - Clickable */}
                                    <td
                                        className={clsx(
                                            "p-2 md:p-3 font-mono font-medium bg-white sticky left-0 z-20 border-r border-black shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] transition-colors",
                                            hasEvents ? "cursor-pointer hover:bg-blue-50 text-blue-700 underline decoration-blue-300 underline-offset-4" : "text-slate-600"
                                        )}
                                        onClick={() => {
                                            if (hasEvents) {
                                                setSelectedDate({ date, events: dayEvents })
                                            }
                                        }}
                                    >
                                        {format(new Date(date), 'MM/dd(eee)', { locale: ja })}
                                        <span className="text-[10px] md:text-xs text-slate-400 block">{format(new Date(date), 'yyyy')}</span>
                                    </td>
                                    {itemIds.map(itemId => {
                                        const cell = forecast[date][itemId]
                                        const count = cell?.count ?? 0

                                        const itemName = stockMap[itemId]?.name
                                        const threshold = thresholds?.[itemName] ?? 0

                                        const isCritical = count <= (threshold / 2) // Red
                                        const isWarning = count <= threshold // Yellow/Orange
                                        const isNegative = count < 0

                                        let textColor = "text-slate-600"
                                        if (isCritical) textColor = "text-red-600 font-bold"
                                        else if (isWarning) textColor = "text-amber-500 font-bold"
                                        else if (isNegative) textColor = "text-red-600 font-bold"

                                        return (
                                            <td
                                                key={itemId}
                                                className={clsx(
                                                    "p-2 md:p-3 text-center border-r border-black last:border-r-0 font-mono",
                                                    textColor
                                                )}
                                            >
                                                {count}
                                            </td>
                                        )
                                    })}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <Dialog open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedDate && format(new Date(selectedDate.date), 'MM/dd(eee)', { locale: ja })} の詳細
                        </DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-auto">
                        <div className="space-y-3 p-1">
                            {selectedDate?.events.map((e, i) => (
                                <div key={i} className="flex justify-between items-start border-l-4 border-slate-300 pl-3 py-1">
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-slate-600 mb-1">
                                            {stockMap[e.itemId]?.name}
                                        </div>
                                        <div className="text-sm font-bold text-slate-800">
                                            {e.note || '予定消費'}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-0.5">
                                            {e.bookingId && `Booking #${e.bookingId}`}
                                            {e.guests && <span className="ml-2 bg-slate-100 text-slate-600 px-1 py-0.5 rounded border text-[10px] font-bold">{e.guests}名</span>}
                                        </div>
                                    </div>
                                    <div className={clsx("font-mono font-bold text-lg", e.delta > 0 ? "text-green-600" : "text-red-600")}>
                                        {e.delta > 0 ? '+' : ''}{e.delta}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
