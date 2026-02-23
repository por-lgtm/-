'use client'

import { useState, useEffect } from 'react'
import { importBookings, syncGoogleBookings, saveSystemSetting, getSystemSetting, analyzeGoogleSheet, syncStockSheet, saveHistoryWebhookUrl, getHistoryWebhookUrl, type AnalysisResult, initializeData } from '@/app/actions'
import { Upload, FileSpreadsheet, Save, RefreshCw, CheckCircle2, AlertCircle, FileSearch, AlertTriangle, ClipboardList, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

type StockSyncResult = {
    success: boolean
    count?: number
    changes?: { name: string; before: number; after: number }[]
    date?: string
    detail?: string
    error?: string
}

export default function ImportPage() {
    const [status, setStatus] = useState<string>('')
    const [sheetUrl, setSheetUrl] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null)
    const [showInitConfirm, setShowInitConfirm] = useState(false)
    const [stockSheetUrl, setStockSheetUrl] = useState('')
    const [stockSyncResult, setStockSyncResult] = useState<StockSyncResult | null>(null)
    const [historyWebhookUrl, setHistoryWebhookUrl] = useState('')
    const [webhookSaved, setWebhookSaved] = useState(false)

    useEffect(() => {
        // Load settings on mount
        getSystemSetting('GOOGLE_SHEET_URL').then(url => {
            if (url) setSheetUrl(url)
        })
        getSystemSetting('STOCK_SHEET_URL').then(url => {
            if (url) setStockSheetUrl(url)
        })
        getHistoryWebhookUrl().then(url => {
            if (url) setHistoryWebhookUrl(url)
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
        setAnalysisData(null) // Clear previous analysis
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

    const handleAnalyze = async () => {
        setIsLoading(true)
        setAnalysisData(null)
        setStatus('データを確認中...')

        try {
            const result = await analyzeGoogleSheet(sheetUrl)
            setAnalysisData(result)

            if (result.success) {
                setStatus(`確認完了: ${result.validCount}件の有効なデータが見つかりました`)
            } else {
                setStatus(`エラー: ${result.error}`)
            }
        } catch (error) {
            setStatus(`エラー: ${error}`)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <main className="min-h-screen bg-slate-50 p-4">
            <header className="mb-6 flex items-center justify-between">
                <Link href="/" className="text-slate-500 hover:text-slate-800 font-bold">← ダッシュボードへ戻る</Link>
                <h1 className="text-xl font-bold text-slate-800">予約データの取込</h1>
            </header>

            <div className="max-w-xl mx-auto space-y-8">

                {/* 履歴スプシ Webhook 設定 */}
                <section className="bg-white p-6 rounded-xl shadow-sm border border-violet-200">
                    <div className="flex items-center gap-2 mb-3">
                        <Save className="text-violet-600" />
                        <h2 className="text-lg font-bold">履歴スプシ連携設定</h2>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">
                        在庫を変更するたびに、GoogleスプレッドシートへWebhook経由で自動記録します。
                    </p>
                    <details className="mb-3 text-xs text-slate-500 bg-slate-50 rounded p-3">
                        <summary className="cursor-pointer font-medium text-slate-600">⚙️ Apps Scriptのセットアップ手順（初回のみ）</summary>
                        <ol className="mt-2 space-y-1 list-decimal list-inside">
                            <li>スプシを開く → 「拡張機能」→「Apps Script」</li>
                            <li>下記コードを貼り付けて保存</li>
                            <li>「デプロイ」→「新しいデプロイ」→「ウェブアプリ」</li>
                            <li>アクセス: <strong>全員</strong> に設定してデプロイ</li>
                            <li>発行された URL を下の欄に貼り付けて保存</li>
                        </ol>
                        <pre className="mt-2 bg-slate-100 p-2 rounded text-xs overflow-x-auto">{`function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(data.sheetName || 'シート1');
  sheet.appendRow([
    data.date, data.time, data.detail,
    data['ボックスシーツ'] ?? '',
    data['デュベカバー'] ?? '',
    data['枕カバー'] ?? '',
    data['バスタオル'] ?? '',
    data['フェイスタオル'] ?? '',
  ]);
  return ContentService
    .createTextOutput(JSON.stringify({success:true}))
    .setMimeType(ContentService.MimeType.JSON);
}`}</pre>
                    </details>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={historyWebhookUrl}
                            onChange={(e) => { setHistoryWebhookUrl(e.target.value); setWebhookSaved(false) }}
                            placeholder="https://script.google.com/macros/s/.../exec"
                            className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
                        />
                        <button
                            onClick={async () => {
                                await saveHistoryWebhookUrl(historyWebhookUrl)
                                setWebhookSaved(true)
                            }}
                            className="bg-violet-600 hover:bg-violet-700 text-white px-4 rounded font-bold text-sm transition-colors"
                        >
                            保存
                        </button>
                    </div>
                    {webhookSaved && (
                        <p className="mt-2 text-sm text-violet-700 flex items-center gap-1">
                            <CheckCircle2 size={14} /> URLを保存しました。次回の在庫変更から記録されます。
                        </p>
                    )}
                </section>

                {/* Stock Sheet Sync (棚卸しスプシ) */}
                <section className="bg-white p-6 rounded-xl shadow-sm border border-emerald-200">
                    <div className="flex items-center gap-2 mb-4">
                        <ClipboardList className="text-emerald-600" />
                        <h2 className="text-lg font-bold">棚卸しスプレッドシート連携</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="text-sm text-slate-600 space-y-1">
                            <p>棚卸し記録スプシの<strong>最新行</strong>を読み込んで在庫数を更新します。</p>
                            <p className="text-xs text-slate-400">※ 列: 変更日 / 時間 / 詳細 / ボックスシーツ / デュベカバー / 枕カバー / バスタオル / フェイスタオル</p>
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={stockSheetUrl}
                                onChange={(e) => setStockSheetUrl(e.target.value)}
                                placeholder="https://docs.google.com/.../pub?output=csv"
                                className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                            />
                            <button
                                onClick={async () => {
                                    await saveSystemSetting('STOCK_SHEET_URL', stockSheetUrl)
                                    setStatus('棚卸しスプシURLを保存しました')
                                }}
                                disabled={isLoading}
                                className="bg-slate-100 text-slate-600 px-3 rounded hover:bg-slate-200"
                            >
                                <Save size={18} />
                            </button>
                        </div>
                        <button
                            onClick={async () => {
                                setIsLoading(true)
                                setStockSyncResult(null)
                                setStatus('棚卸しスプシから同期中...')
                                const result = await syncStockSheet(stockSheetUrl)
                                setIsLoading(false)
                                setStockSyncResult(result)
                                if (result.success) {
                                    await saveSystemSetting('STOCK_SHEET_URL', stockSheetUrl)
                                    setStatus(`棚卸し同期完了: ${result.count}件の品目を更新しました`)
                                } else {
                                    setStatus(`エラー: ${result.error}`)
                                }
                            }}
                            disabled={!stockSheetUrl || isLoading}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <RefreshCw className="animate-spin" /> : <ClipboardList />}
                            棚卸しデータを同期
                        </button>

                        {/* 同期結果 */}
                        {stockSyncResult && stockSyncResult.success && (
                            <div className="border rounded-lg overflow-hidden">
                                <div className="bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 flex items-center gap-2">
                                    <CheckCircle2 size={16} />
                                    {stockSyncResult.date} {stockSyncResult.detail} — {stockSyncResult.count}件更新
                                </div>
                                {stockSyncResult.changes && stockSyncResult.changes.length > 0 ? (
                                    <table className="w-full text-sm bg-white">
                                        <thead className="bg-slate-50 text-xs text-slate-500">
                                            <tr>
                                                <th className="px-4 py-2 text-left border-b">品目</th>
                                                <th className="px-4 py-2 text-right border-b">変更前</th>
                                                <th className="px-2 py-2 border-b"></th>
                                                <th className="px-4 py-2 text-right border-b">変更後</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {stockSyncResult.changes.map(ch => (
                                                <tr key={ch.name}>
                                                    <td className="px-4 py-2 font-medium text-slate-800">{ch.name}</td>
                                                    <td className="px-4 py-2 text-right text-slate-500">{ch.before}</td>
                                                    <td className="px-2 py-2 text-slate-400"><ArrowRight size={14} /></td>
                                                    <td className={`px-4 py-2 text-right font-bold ${ch.after > ch.before ? 'text-blue-600' : 'text-red-600'}`}>{ch.after}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="px-4 py-3 text-sm text-slate-500">変更なし（スプシと在庫数が一致しています）</p>
                                )}
                            </div>
                        )}
                        {stockSyncResult && !stockSyncResult.success && (
                            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded">
                                <AlertCircle size={16} />
                                {stockSyncResult.error}
                            </div>
                        )}
                    </div>
                </section>

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

                        <div className="flex gap-2">
                            <button
                                onClick={handleAnalyze}
                                disabled={!sheetUrl || isLoading}
                                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                            >
                                {isLoading ? <RefreshCw className="animate-spin" /> : <FileSearch />}
                                ダブルチェック (確認のみ)
                            </button>

                            <button
                                onClick={handleSync}
                                disabled={!sheetUrl || isLoading}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                            >
                                {isLoading ? <RefreshCw className="animate-spin" /> : <RefreshCw />}
                                スプレッドシートから同期
                            </button>
                        </div>
                    </div>

                    {/* Analysis Result */}
                    {analysisData && (
                        <div className="mt-6 border-t pt-4">
                            <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                                <FileSearch size={18} />
                                確認結果
                            </h3>

                            <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                                <div className="bg-slate-100 p-2 rounded">
                                    <div className="text-xs text-slate-500">全行数</div>
                                    <div className="font-bold">{analysisData.totalRows}</div>
                                </div>
                                <div className="bg-green-50 p-2 rounded text-green-700">
                                    <div className="text-xs opacity-75">有効</div>
                                    <div className="font-bold">{analysisData.validCount}</div>
                                </div>
                                <div className={`p-2 rounded ${analysisData.errorCount > 0 ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-400'}`}>
                                    <div className="text-xs opacity-75">エラー/無効</div>
                                    <div className="font-bold">{analysisData.errorCount}</div>
                                </div>
                            </div>

                            <div className="max-h-60 overflow-y-auto border rounded text-sm">
                                <table className="w-full text-left bg-white">
                                    <thead className="bg-slate-50 sticky top-0 text-xs text-slate-500 uppercase">
                                        <tr>
                                            <th className="px-3 py-2 border-b">行</th>
                                            <th className="px-3 py-2 border-b">日付</th>
                                            <th className="px-3 py-2 border-b">名前/人数</th>
                                            <th className="px-3 py-2 border-b">状態</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {analysisData.rows.map((row) => (
                                            <tr key={row.rowNumber} className={row.isValid ? 'hover:bg-green-50/50' : 'bg-red-50'}>
                                                <td className="px-3 py-2 text-slate-500 font-mono text-xs font-bold">{row.rowNumber}</td>
                                                <td className="px-3 py-2 text-slate-900 font-medium">
                                                    {row.date || <span className="text-slate-400 italic font-bold">(空)</span>}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="text-slate-900 font-bold">{row.name}</div>
                                                    <div className="text-xs text-slate-600 font-bold">{row.guests ? `${row.guests}名` : ''}</div>
                                                </td>
                                                <td className="px-3 py-2">
                                                    {row.isValid ? (
                                                        <span className="flex items-center gap-1 text-green-600 text-xs font-bold">
                                                            <CheckCircle2 size={14} /> OK
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-red-600 text-xs font-bold">
                                                            <AlertCircle size={14} /> {row.error}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
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
                <div className={status.startsWith('エラー') ? "text-red-600 font-bold text-center" : "text-green-600 font-bold text-center"}>
                    {status}
                </div>

                {/* Emergency Init Button */}
                <div className="pt-8 border-t border-slate-200 text-center">
                    <p className="text-sm text-slate-500 mb-2">※画面に何も表示されない場合のみ使用してください</p>
                    <button
                        onClick={() => setShowInitConfirm(true)}
                        disabled={isLoading}
                        className="text-xs text-slate-400 hover:text-red-500 underline"
                    >
                        [緊急用] 初期データの再登録
                    </button>
                </div>
            </div>

            <Dialog open={showInitConfirm} onOpenChange={setShowInitConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle size={24} />
                            緊急初期化の確認
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            本当に初期データを登録しますか？
                            <br />
                            <span className="font-bold text-red-600 block mt-2">
                                警告: これを行うとデータベースが初期リセットされる可能性があります。
                            </span>
                            （※現在の実装では既存データがある場合はスキップされますが、念のためご注意ください）
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <button
                            onClick={() => setShowInitConfirm(false)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded"
                        >
                            キャンセル
                        </button>
                        <button
                            onClick={async () => {
                                setShowInitConfirm(false)
                                setIsLoading(true)
                                setStatus('初期データ登録中...')
                                const result = await initializeData()
                                setIsLoading(false)
                                if (result.success) {
                                    setStatus(`完了: ${result.count}件のデータを登録しました`)
                                } else {
                                    setStatus(`エラー: ${result.error}`)
                                }
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                        >
                            実行する
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>

    )
}
