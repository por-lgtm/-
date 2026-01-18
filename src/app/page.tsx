import { getForecastData } from '@/app/actions'
import StockList from '@/components/StockList'
import ShortageAlerts from '@/components/ShortageAlerts'
import Link from 'next/link'
import { StockProvider } from '@/components/StockProvider'
import GlobalSaveButton from '@/components/GlobalSaveButton'
import AutoSync from '@/components/AutoSync'
import ForecastTable from '@/components/ForecastTable'
import InitDataButton from '@/components/InitDataButton'

export default async function Home() {
  const data = await getForecastData(45) // 45 days forecast

  // Check if data is empty
  if (Object.keys(data.stockMap).length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Linen Keeper</h1>
        </header>
        <InitDataButton />
      </main>
    )
  }

  // Calculate first shortage date for each item
  const shortageDates: Record<string, string> = {}

  // Sort dates to ensure chronological order
  const sortedDates = Object.keys(data.forecast).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

  const thresholds: Record<string, number> = {
    'ボックスシーツ': 24,
    'デュベカバー': 24,
    '枕カバー': 24,
    'バスタオル': 60,
    'フェイスタオル': 50
  }

  for (const date of sortedDates) {
    const stocks = data.forecast[date]
    for (const [itemId, stockData] of Object.entries(stocks)) {
      if (shortageDates[itemId]) continue // Already found the first shortage date

      const itemName = data.stockMap[itemId]?.name
      const threshold = thresholds[itemName] ?? 0 // Default to 0 if unknown
      const count = stockData.count

      if (count <= threshold) {
        // Format date as M/D
        shortageDates[itemId] = new Date(date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
      }
    }
  }

  return (
    <StockProvider>
      <AutoSync />
      <main className="min-h-screen bg-slate-50 pb-20">
        {/* Header */}
        <header className="bg-white border-b sticky top-0 z-10 flex flex-wrap items-center justify-between shadow-sm px-4 py-3 gap-2">
          <h1 className="text-lg md:text-xl font-bold text-slate-800">Linen Keeper</h1>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Global Confirm Button */}
            <GlobalSaveButton />

            <div className="w-px h-6 bg-slate-200 mx-1 md:mx-2"></div>

            <div className="flex gap-1">
              <Link href="/import" className="text-xs md:text-sm bg-slate-100 px-2 py-1.5 md:px-3 md:py-2 rounded font-bold text-slate-900 hover:bg-slate-200 transition-colors">予約</Link>
              <Link href="/logs" className="text-xs md:text-sm bg-slate-100 px-2 py-1.5 md:px-3 md:py-2 rounded font-bold text-slate-900 hover:bg-slate-200 transition-colors">履歴</Link>
            </div>
          </div>
        </header>

        <div className="p-4 space-y-6">


          {/* Stock Cards */}
          <section>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-bold text-slate-700">現在の棚在庫</h2>
            </div>
            <StockList stockMap={data.stockMap} shortageDates={shortageDates} />
          </section>

          {/* Forecast Summary (Interactive) */}
          <section>
            <div className="flex items-center gap-4 mb-2">
              <h2 className="text-lg font-bold text-slate-700">45日間推移</h2>
              <div className="flex items-center gap-2 text-xs bg-white px-2 py-1 rounded border shadow-sm">
                <span className="font-bold text-slate-500">文字色ルール:</span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-amber-500 rounded-sm"></span>
                  <span className="text-amber-600 font-bold">2泊分値以下</span>
                </span>
                <span className="flex items-center gap-1 ml-2">
                  <span className="w-3 h-3 bg-red-600 rounded-sm"></span>
                  <span className="text-red-700 font-bold">1泊分以下</span>
                </span>
              </div>
            </div>
            <ForecastTable stockMap={data.stockMap} forecast={data.forecast} thresholds={thresholds} />
          </section>
        </div>
      </main>
    </StockProvider>
  )
}
