export default function ShortageAlerts({ shortages }: { shortages: { date: string, itemName: string, count: number }[] }) {
    if (shortages.length === 0) return null

    // Group by date or just show top 3?
    // Let's show top 5 earliest/worst
    const display = shortages.slice(0, 5)

    return (
        <div className="bg-red-50 border border-red-100 rounded-lg p-4 space-y-2">
            {/* Header Removed */}
            <div className="space-y-1">
                {display.map((s, idx) => (
                    <div key={idx} className="flex justify-between text-sm text-red-700 bg-white/50 p-2 rounded">
                        <span>{s.date} : {s.itemName}</span>
                        <span className="font-bold">{s.count} 枚</span>
                    </div>
                ))}
                {shortages.length > 5 && (
                    <p className="text-xs text-center text-red-500 mt-1">他 {shortages.length - 5} 件</p>
                )}
            </div>
        </div>
    )
}
