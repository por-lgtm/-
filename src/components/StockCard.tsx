'use client'

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { clsx } from 'clsx'
import StockModalContent from './StockModalContent'
import { useStock } from './StockProvider'

interface StockCardProps {
    id: string
    name: string
    current: number
    shortageDate?: string
}

export default function StockCard({ id, name, current, shortageDate }: StockCardProps) {
    const [open, setOpen] = useState(false)
    const { updates, setUpdate } = useStock()

    // Get pending delta from context
    const delta = updates[id] || 0

    const handleDeltaChange = (val: number) => {
        setUpdate(id, delta + val)
    }

    const setDirectDelta = (val: number) => {
        setUpdate(id, val)
    }

    // Calculate preview count
    const previewCount = current + delta
    const deltaDisplay = delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '0'
    const deltaColor = delta > 0 ? 'text-blue-600' : delta < 0 ? 'text-red-600' : 'text-slate-300'

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
            <div className="p-4 pb-2">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-700 text-lg">{name}</h3>
                    <span className={clsx(
                        "px-2 py-0.5 rounded text-xs font-bold",
                        shortageDate ? "bg-red-100 text-red-700" : previewCount < 10 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"
                    )}>
                        {shortageDate ? `${shortageDate} 不足` : previewCount < 10 ? '少' : 'OK'}
                    </span>
                </div>

                {/* Number Display */}
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <div className="text-center py-2 cursor-pointer hover:bg-slate-50 rounded transition-colors group">
                            {/* Show current + pending */}
                            <div className="flex items-baseline justify-center gap-1">
                                <span className="text-4xl font-extrabold text-slate-800 tracking-tight">
                                    {current}
                                </span>
                                {delta !== 0 && (
                                    <span className={clsx("text-xl font-bold", delta > 0 ? "text-blue-500" : "text-red-500")}>
                                        {delta > 0 ? '→' : '→'} {previewCount}
                                    </span>
                                )}
                            </div>
                            <span className="text-sm text-slate-400">枚</span>
                            <p className="text-[10px] text-slate-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                タップして詳細 / 補正
                            </p>
                        </div>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-slate-900 font-bold text-xl">{name} の詳細操作</DialogTitle>
                        </DialogHeader>
                        <StockModalContent
                            itemId={id}
                            itemName={name}
                            currentCount={current}
                            onClose={() => setOpen(false)}
                            initialMode="ADD"
                        />
                    </DialogContent>
                </Dialog>
            </div>

            {/* Pending Action Buttons */}
            <div className="flex items-center border-t border-slate-100 h-14 divide-x divide-slate-100">
                {/* Decrease */}
                <button
                    onClick={() => handleDeltaChange(-1)}
                    className="w-16 flex flex-col items-center justify-center bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors active:bg-red-100"
                >
                    <Minus size={24} />
                </button>

                {/* Delta Display Input */}
                {/* Delta Display Input */}
                <label className="flex-1 bg-white h-full relative flex items-center justify-center cursor-text">
                    {delta > 0 && (
                        <span className="text-blue-600 font-bold text-2xl translate-y-[-1px]">+</span>
                    )}
                    {delta < 0 && (
                        <span className="text-red-600 font-bold text-2xl translate-y-[-1px]">-</span>
                    )}
                    <input
                        type="number"
                        value={delta === 0 ? '' : Math.abs(delta)}
                        onChange={(e) => {
                            const val = e.target.value
                            const num = parseInt(val, 10)

                            if (val === '' || isNaN(num)) {
                                setDirectDelta(0)
                            } else {
                                // Preserve sign if it was negative, unless it was 0
                                const currentSign = delta < 0 ? -1 : 1
                                setDirectDelta(num * currentSign)
                            }
                        }}
                        className={clsx(
                            "h-full text-center text-2xl font-bold border-none outline-none focus:bg-slate-50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-transparent",
                            delta !== 0 ? "w-16" : "w-full",
                            deltaColor
                        )}
                        placeholder="0"
                    />
                </label>

                {/* Increase */}
                <button
                    onClick={() => handleDeltaChange(1)}
                    className="w-16 flex flex-col items-center justify-center bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors active:bg-blue-100"
                >
                    <Plus size={24} />
                </button>
            </div>
        </div>
    )
}
