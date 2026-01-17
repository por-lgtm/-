"use client"

import { useState } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { clsx } from 'clsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Event = {
    id: string
    delta: number
    reason: string
    memo?: string
    createdAt: Date
    itemId: string
}

type HistoryTableProps = {
    stockMap: Record<string, { current: number, name: string }>
    history: Record<string, Record<string, { count: number, events: Event[] }>>
}

export default function HistoryTable({ stockMap, history }: HistoryTableProps) {
    const dates = Object.keys(history).sort((a, b) => b.localeCompare(a)) // Descending
    const itemIds = Object.keys(stockMap)

    const [selectedCell, setSelectedCell] = useState<{ date: string, itemId: string, events: Event[] } | null>(null)

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden border">
            {/* Scrollable Container with Sticky Header */}
            <div className="max-h-[70vh] overflow-auto relative">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-40 shadow-sm">
                        <tr>
                            <th className="p-3 border-b min-w-[100px] whitespace-nowrap bg-slate-100 z-50 sticky left-0">日付</th>
                            {itemIds.map(id => (
                                <th key={id} className="p-3 border-b min-w-[80px] text-center whitespace-nowrap bg-slate-100">
                                    {stockMap[id].name}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {dates.map(date => (
                            <tr key={date} className="hover:bg-slate-50 transition-colors">
                                {/* Sticky Date Column */}
                                <td className="p-3 font-mono font-medium text-slate-600 bg-white sticky left-0 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                    {format(new Date(date), 'MM/dd(eee)', { locale: ja })}
                                    <span className="text-xs text-slate-400 block">{format(new Date(date), 'yyyy')}</span>
                                </td>
                                {itemIds.map(itemId => {
                                    const cell = history[date][itemId]
                                    const count = cell?.count ?? '-'
                                    const events = cell?.events || []
                                    const hasEvents = events.length > 0

                                    return (
                                        <td
                                            key={itemId}
                                            className={clsx(
                                                "p-3 text-center border-r last:border-r-0 font-mono transition-colors",
                                                hasEvents ? "cursor-pointer hover:bg-blue-50 text-blue-700 font-bold underline decoration-blue-300 underline-offset-4" : "text-slate-700"
                                            )}
                                            onClick={() => {
                                                if (hasEvents) {
                                                    setSelectedCell({ date, itemId, events })
                                                }
                                            }}
                                        >
                                            {count}
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                        {dates.length === 0 && (
                            <tr>
                                <td colSpan={itemIds.length + 1} className="p-8 text-center text-slate-500">
                                    データがありません
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Dialog open={!!selectedCell} onOpenChange={(open) => !open && setSelectedCell(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedCell && `${format(new Date(selectedCell.date), 'MM/dd')} - ${stockMap[selectedCell.itemId]?.name}`}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-auto">
                        <div className="space-y-3 p-1">
                            {selectedCell?.events.map((e, i) => (
                                <div key={i} className="flex justify-between items-start border-l-4 border-slate-300 pl-3 py-1">
                                    <div>
                                        <div className="text-sm font-bold text-slate-800">
                                            {e.reason === 'OTHER' ? 'その他' :
                                                e.reason === 'PURCHASE' ? '納品' :
                                                    e.reason === 'LAUNDRY' ? 'リネン' :
                                                        e.reason === 'LOST' ? '紛失' :
                                                            e.reason === 'DISCARD' ? '破棄' :
                                                                e.reason === 'CORRECTION' ? '棚卸修正' : e.reason}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-0.5">
                                            {format(new Date(e.createdAt), 'HH:mm')}
                                            {e.memo && ` - ${e.memo}`}
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
