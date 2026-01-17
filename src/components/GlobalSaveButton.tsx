'use client'

import { useStock } from './StockProvider'
import { Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

export default function GlobalSaveButton() {
    const { hasChanges, saveAll, isSaving, updates } = useStock()

    // Calculate total updates for badge (optional)
    const count = Object.keys(updates).length

    return (
        <button
            onClick={saveAll}
            disabled={!hasChanges || isSaving}
            className={clsx(
                "px-6 py-2 rounded-full font-bold text-white transition-all flex items-center gap-2",
                hasChanges ? "bg-red-600 hover:bg-red-700 shadow-md translate-y-0" : "bg-slate-300 cursor-not-allowed opacity-50"
            )}
        >
            {isSaving && <Loader2 className="animate-spin h-4 w-4" />}
            <span>決定</span>
            {hasChanges && <span className="bg-white text-red-600 text-xs px-1.5 rounded-full">{count}</span>}
        </button>
    )
}
