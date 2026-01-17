'use client'

import StockCard from './StockCard'

type StockMap = Record<string, { current: number; name: string }>

export default function StockList({ stockMap, shortageDates }: { stockMap: StockMap; shortageDates: Record<string, string> }) {
    const items = Object.entries(stockMap).map(([id, data]) => ({
        id,
        ...data
    }))

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
                <StockCard
                    key={item.id}
                    id={item.id}
                    name={item.name}
                    current={item.current}
                    shortageDate={shortageDates[item.id]}
                />
            ))}
        </div>
    )
}
