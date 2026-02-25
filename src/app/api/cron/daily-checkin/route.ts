import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import Papa from 'papaparse'

export const dynamic = 'force-dynamic'

// Vercel Cron: 毎日 01:00 UTC = 10:00 JST に実行
// 予約管理ANDリネンシートの本日チェックイン行をリネン履歴に自動記録する

export async function GET(request: Request) {
    // Vercel Cron の認証チェック
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // 予約管理スプシURLを取得
        const sheetUrlSetting = await prisma.systemSetting.findUnique({
            where: { key: 'GOOGLE_SHEET_URL' }
        })
        const sheetUrl = sheetUrlSetting?.value
        if (!sheetUrl) {
            return NextResponse.json({ error: 'GOOGLE_SHEET_URL not configured' }, { status: 400 })
        }

        // GAS Webhook URL を取得
        const webhookUrlSetting = await prisma.systemSetting.findUnique({
            where: { key: 'HISTORY_WEBHOOK_URL' }
        })
        const webhookUrl = webhookUrlSetting?.value
            || 'https://script.google.com/macros/s/AKfycbx2XECLFaIwKb0vtYpcudSp4taw-0pWogFAfQLHUj_CeznKdF1ieAYycOYLTm6QzoJ4/exec'

        // スプシをCSVで取得
        let csvUrl = sheetUrl
        if (sheetUrl.includes('/pubhtml')) {
            csvUrl = sheetUrl.replace('/pubhtml', '/pub?output=csv')
        } else if (sheetUrl.includes('/edit')) {
            csvUrl = sheetUrl.replace(/\/edit.*$/, '/export?format=csv')
        }

        const res = await fetch(csvUrl, { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to fetch booking sheet')
        const text = await res.text()
        const { data } = Papa.parse<Record<string, string>>(text, {
            header: true,
            skipEmptyLines: true,
        })

        // 本日の日付（JST）を YYYY/MM/DD 形式で生成
        const now = new Date()
        const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
        const todayStr = `${jst.getUTCFullYear()}/${String(jst.getUTCMonth() + 1).padStart(2, '0')}/${String(jst.getUTCDate()).padStart(2, '0')}`

        // 本日チェックインの行を抽出
        const todayRows = data.filter(row => {
            const dateVal = row['日付'] ?? ''
            // YYYY/MM/DD または YYYY-MM-DD 形式に対応
            return dateVal.replace(/-/g, '/').trim() === todayStr
        })

        if (todayRows.length === 0) {
            return NextResponse.json({ success: true, message: 'No check-ins today', date: todayStr })
        }

        // 各チェックイン行をリネン履歴に記録
        const results = []
        for (const row of todayRows) {
            const name = row['宿泊者名'] ?? ''
            const guests = row['人数'] ?? ''
            const detail = `${todayStr} ${name} ${guests}名`

            // GAS Webhook に送信（在庫スナップショットのみ記録、変動なし）
            const params = new URLSearchParams({ date: todayStr, time: '10:00', detail })

            // 在庫スナップショットを追加
            const snapshots = await prisma.stockSnapshot.findMany()
            const ITEM_MAP: Record<string, string> = {
                'box-sheet': 'ボックスシーツ',
                'duvet-cover': 'デュベカバー',
                'pillow-cover': '枕カバー',
                'bath-towel': 'バスタオル',
                'face-towel': 'フェイスタオル',
            }
            for (const snap of snapshots) {
                const colName = ITEM_MAP[snap.itemId]
                if (colName) params.set(colName, String(snap.shelfCount))
            }

            const url = `${webhookUrl}?${params.toString()}`
            const gasRes = await fetch(url, { method: 'GET', redirect: 'follow' })
            results.push({ detail, status: gasRes.status, ok: gasRes.ok })
        }

        return NextResponse.json({ success: true, date: todayStr, recorded: results })
    } catch (err) {
        console.error('daily-checkin cron error:', err)
        return NextResponse.json({ error: String(err) }, { status: 500 })
    }
}
