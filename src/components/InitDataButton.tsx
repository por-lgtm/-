'use client'

import { useState } from 'react'
import { initializeData } from '@/app/actions'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function InitDataButton() {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleInit = async () => {
        setIsLoading(true)
        try {
            await initializeData()
            router.refresh()
        } catch (e) {
            alert('Error: ' + e)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border border-dashed border-slate-300">
            <h2 className="text-xl font-bold text-slate-700 mb-4">ようこそ！</h2>
            <p className="text-slate-500 mb-8">まだデータがありません。ボタンを押して初期データを登録してください。</p>
            <button
                onClick={handleInit}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg flex items-center gap-2 transition-all"
            >
                {isLoading ? <Loader2 className="animate-spin" /> : null}
                初期データを登録する
            </button>
        </div>
    )
}
