'use client'

import { useState, useTransition } from 'react'
import { updateStock, StockUpdateReason } from '@/app/actions'
import { DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

interface Props {
    itemId: string
    itemName: string
    currentCount: number
    onClose: () => void
}

type Mode = 'ADJUST' | 'CORRECTION'

export default function StockModalContent({ itemId, itemName, currentCount, onClose }: Props) {
    const [mode, setMode] = useState<Mode>('ADJUST')
    const [amount, setAmount] = useState<string>('') // string for input handling
    const [reason, setReason] = useState<string>('')
    const [memo, setMemo] = useState('')
    const [isPending, startTransition] = useTransition()

    const handleSubmit = () => {
        const val = parseInt(amount, 10)
        if (isNaN(val)) return

        let finalReason: StockUpdateReason = 'OTHER'
        let finalDelta = val

        if (mode === 'ADJUST') {
            finalDelta = val
            finalReason = 'OTHER'
        } else {
            // Correction
            finalReason = 'CORRECTION'
            // Delta calculated on server or passed as absolute
        }

        startTransition(async () => {
            const res = await updateStock(itemId, finalDelta, finalReason, memo, mode === 'CORRECTION' ? val : undefined)
            if (res.success) {
                onClose()
            } else {
                alert('Error updating stock')
            }
        })
    }

    return (
        <div className="space-y-4">
            {/* Tabs */}
            <div className="flex rounded-lg bg-slate-100 p-1">
                {(['ADJUST', 'CORRECTION'] as const).map(m => (
                    <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`flex-1 text-sm font-bold py-1.5 rounded-md transition-all ${mode === m ? 'bg-white shadow text-slate-950' : 'text-slate-600 hover:text-slate-800'
                            }`}
                    >
                        {m === 'ADJUST' ? '在庫調整' : '棚卸し(訂正)'}
                    </button>
                ))}
            </div>

            <div className="space-y-3">
                {mode === 'CORRECTION' && (
                    <div className="p-3 bg-yellow-50 text-yellow-800 text-sm rounded">
                        現在の棚在庫: <strong>{currentCount}</strong>枚<br />
                        正しい枚数を入力してください。
                    </div>
                )}

                <div>
                    <label className="block text-sm font-bold text-slate-900 mb-1">
                        {mode === 'CORRECTION' ? '正しい在庫数' : '数量'}
                    </label>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setAmount((parseInt(amount || '0') - 1).toString())}
                            className="w-10 h-10 rounded border border-slate-900 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-900 font-bold"
                        >-</button>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className={`flex-1 border border-slate-900 rounded h-10 px-3 text-center text-lg font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${parseInt(amount || '0', 10) < 0 ? 'text-red-600' : 'text-slate-900'}`}
                        />
                        <button
                            onClick={() => setAmount((parseInt(amount || '0') + 1).toString())}
                            className="w-10 h-10 rounded border border-slate-900 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-900 font-bold"
                        >+</button>
                    </div>
                </div>

                {/* Reason Removed */}

                <div>
                    <label className="block text-sm font-bold text-slate-900 mb-1">メモ (任意)</label>
                    <input
                        value={memo}
                        onChange={e => setMemo(e.target.value)}
                        className="w-full border border-slate-900 rounded h-10 px-3 text-slate-900"
                    />
                </div>
            </div>

            <DialogFooter className="flex-row gap-2 justify-end">
                <DialogClose asChild>
                    <button className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded">キャンセル</button>
                </DialogClose>
                <button
                    disabled={isPending}
                    onClick={handleSubmit}
                    className="px-4 py-2 text-sm bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
                >
                    {isPending && <Loader2 className="animate-spin h-4 w-4" />}
                    実行
                </button>
            </DialogFooter>
        </div>
    )
}
