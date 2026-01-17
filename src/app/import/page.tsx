'use client'

import { useState, useEffect } from 'react'
import { importBookings, syncGoogleBookings, saveSystemSetting, getSystemSetting } from '@/app/actions'
import { Upload, FileSpreadsheet, Save, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function ImportPage() {
    const [status, setStatus] = useState<string>('')
    const [sheetUrl, setSheetUrl] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        // Load setting on mount
        getSystemSetting('GOOGLE_SHEET_URL').then(url => {
            if (url) setSheetUrl(url)
        })
    }, [])

    const handleFileUpload = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setStatus('アップロード中...')

        const formData = new FormData(e.currentTarget)
        const result = await importBookings(formData)

        if (result.success) {
            setStatus(`完了: ${result.count}件の予約を取り込みました`)
        } else {
            setStatus(`エラー: ${result.error}`)
        }
    }

    const handleSaveUrl = async () => {
        setIsLoading(true)
        await saveSystemSetting('GOOGLE_SHEET_URL', sheetUrl)
        setIsLoading(false)
        setStatus('URLを保存しました')
    }

    const handleSync = async () => {
        setIsLoading(true)
        setStatus('スプレッドシートから同期中...')
        const result = await syncGoogleBookings(sheetUrl)
        setIsLoading(false)
        if (result.success) {
            // Auto-save the URL on successful sync
            await saveSystemSetting('GOOGLE_SHEET_URL', sheetUrl)
            setStatus(`同期完了: ${result.count}件の予約を取り込みました (自動更新設定も保存しました)`)
        } else {
            setStatus(`エラー: ${result.error}`)
        }
    }

    return (
        <main className="min-h-screen bg-slate-50 p-4">
            <header className="mb-6 flex items-center justify-between">
                <Link href="/" className="text-slate-500 hover:text-slate-800 font-bold">← ダッシュボードへ戻る</Link>
                <h1 className="text-xl font-bold text-slate-800">予約データの取込</h1>
            </header>

            <div className="max-w-xl mx-auto space-y-8">

                {/* Google Sheets Integration */}
                <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2 mb-4">
                        <FileSpreadsheet className="text-green-600" />
                        <h2 className="text-lg font-bold">Googleスプレッドシート連携</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="text-sm text-slate-600 space-y-1">
                            <p>「ファイル」→「共有」→「ウェブに公開」から「csv」形式のリンクを取得して貼り付けてください。</p>
                            <p className="text-xs text-slate-400">※列の並び順: A列=日付, C列=名前, D列=人数 と想定しています。</p>
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={sheetUrl}
                                onChange={(e) => setSheetUrl(e.target.value)}
                                placeholder="https://docs.google.com/.../pub?output=csv"
                                className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                            />
                            <button
                                onClick={handleSaveUrl}
                                disabled={isLoading}
                                className="bg-slate-100 text-slate-600 px-3 rounded hover:bg-slate-200"
                            >
                                <Save size={18} />
                            </button>
                        </div>

                        <button
                            onClick={handleSync}
                            disabled={!sheetUrl || isLoading}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <RefreshCw className="animate-spin" /> : <RefreshCw />}
                            スプレッドシートから同期
                        </button>
                    </div>
                </section>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-300" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-slate-50 px-2 text-slate-500">または</span>
                    </div>
                </div>

                {/* CSV File Upload */}
                <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2 mb-4">
                        <Upload className="text-blue-600" />
                        <h2 className="text-lg font-bold">CSVファイルアップロード</h2>
                    </div>

                    <form onSubmit={handleFileUpload} className="space-y-4">
                        <input
                            type="file"
                            name="file"
                            accept=".csv"
                            className="block w-full text-sm text-slate-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100
                            "
                        />
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors">
                            取り込み開始
                        </button>
                    </form>
                </section>

                {/* Status Message */}
                {status && (
                    <div className={status.startsWith('エラー') ? "text-red-600 font-bold text-center" : "text-green-600 font-bold text-center"}>
                        {status}
                    </div>
                )}
            </div>
        </main>
    )
}
