import { getHistoryData } from '@/app/actions'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import HistoryTable from '@/components/HistoryTable'

export const dynamic = 'force-dynamic'

export default async function LogsPage() {
    const { stockMap, history } = await getHistoryData(90) // 90 days history

    return (
        <div className="min-h-screen bg-slate-50 p-4 pb-20">
            <header className="flex items-center gap-4 mb-4">
                <Link href="/" className="p-2 bg-white rounded shadow-sm hover:bg-slate-100 transition-colors">
                    <ArrowLeft size={20} className="text-slate-600" />
                </Link>
                <h1 className="text-xl font-bold text-slate-800">履歴・予定ログ (90日)</h1>
            </header>

            <div className="space-y-4">
                <p className="text-sm text-slate-500 px-1">
                    過去の日付ごとの在庫残高です。<br />
                    青色のマスをクリックすると、その日の増減詳細を確認できます。
                </p>
                <HistoryTable stockMap={stockMap} history={history} />
            </div>
        </div>
    )
}
