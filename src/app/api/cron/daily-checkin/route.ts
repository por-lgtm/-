import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import Papa from 'papaparse'
import { addDays, format, parseISO } from 'date-fns'

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

        // --- Helpers ---
        function ceilHalf(n: number) { return Math.ceil(n / 2) }
        function calculateConsumption(guests: number, formulaType: string, nthDay: number = 1): number {
            const N = guests
            if (N <= 0) return 0
            switch (formulaType) {
                case 'SIMPLE':
                    if (nthDay % 2 === 0) return 0;
                    return N
                case 'TOWEL_B':
                    return N + ceilHalf(N) + 8
                case 'TOWEL_F':
                    return N + ceilHalf(N) + 3
                default:
                    return N
            }
        }
        function parseFlexibleDate(dateStr: string): Date {
            if (!dateStr) return new Date(NaN)
            const normalized = dateStr.replaceAll('/', '-')
            const d1 = parseISO(normalized)
            if (!isNaN(d1.getTime())) return d1
            const parts = normalized.split('-')
            if (parts.length === 3) {
                const y = parts[0]
                const m = parts[1].padStart(2, '0')
                const day = parts[2].padStart(2, '0')
                const d2 = parseISO(`${y}-${m}-${day}`)
                if (!isNaN(d2.getTime())) return d2
            }
            return new Date(NaN)
        }

        // 本日滞在中の行を抽出
        const todayRows = data.filter((row: any) => {
            const dateVal = row['日付'] ?? ''
            if (!dateVal) return false;

            const checkInDate = parseFlexibleDate(dateVal);
            if (isNaN(checkInDate.getTime())) {
                // フォールバック: 単純な文字列一致
                if (dateVal.replace(/-/g, '/').trim() !== todayStr) return false;
            }

            // キャンセル判定
            const statusStr = String(row['ステータス'] || row['状況'] || row['status'] || row['Status'] || '').trim()
            if (statusStr && statusStr !== '予約あり') {
                return false;
            }

            const nights = parseInt(row['宿泊日数'] ?? '1', 10) || 1;
            
            for (let n = 1; n <= nights; n++) {
                const targetDate = addDays(checkInDate, n - 1);
                const targetStr = format(targetDate, 'yyyy/MM/dd');
                if (targetStr === todayStr) {
                    row._nthDay = n;
                    return true;
                }
            }
            return false;
        })

        if (todayRows.length === 0) {
            return NextResponse.json({ success: true, message: 'No check-ins today', date: todayStr })
        }

        // --- Fetch Items to compute formulas ---
        const items = await prisma.item.findMany()

        // 各チェックイン行をリネン履歴に記録
        const results = []
        for (const row of todayRows) {
            const name = row['宿泊者名'] ?? ''
            const guestsStr = row['人数'] ?? ''
            const guests = parseInt(guestsStr, 10)
            const nthDay = Number(row._nthDay) || 1;
            // メモに滞在日目を入れてユニークにする（これにより再実行時の二重引き算も防ぐ）
            const dayDesc = nthDay > 1 ? ` (滞在${nthDay}日目)` : ''
            const detail = `${todayStr} ${name} ${guestsStr}名${dayDesc}`

            // 二重実行防止（同じ日付・名前のBOOKING記録がすでにあるか確認）
            const existingEvent = await prisma.actualEvent.findFirst({
                where: { reason: 'BOOKING', memo: detail }
            })
            if (existingEvent) {
                console.log(`Already processed today: ${detail}`)
                continue
            }

            // GAS Webhook に送信（在庫スナップショットと変動記録）
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

            // 消費マイナス分（変動）を計算して追加 & DB更新の準備
            const dbUpdates: any[] = []
            let hasConsumption = false

            if (!isNaN(guests) && guests > 0) {
                for (const item of items) {
                    const colName = ITEM_MAP[item.id]
                    if (colName) {
                        const consumption = calculateConsumption(guests, item.formulaType, nthDay)
                        // Decrease is negative
                        params.set(`${colName}変動`, String(-consumption))

                        if (consumption > 0) {
                            // Webhookに送るスナップショットの数字も、「引き算後」の新しい数字に上書きする（表示ズレ防止）
                            const prevSnapStr = params.get(colName)
                            if (prevSnapStr) {
                                params.set(colName, String(parseInt(prevSnapStr, 10) - consumption))
                            }

                            hasConsumption = true
                            dbUpdates.push(prisma.actualEvent.create({
                                data: { itemId: item.id, delta: -consumption, reason: 'BOOKING', memo: detail }
                            }))
                            dbUpdates.push(prisma.stockSnapshot.upsert({
                                where: { itemId: item.id },
                                update: { shelfCount: { decrement: consumption } },
                                create: { itemId: item.id, shelfCount: -consumption }
                            }))
                        }
                    }
                }
            }

            // もし消費が0枚（シーツ交換なし日など）でもWebhookは飛ばす（Snapshot記録として）か？
            // もし全アイテム消費0なら何もDB変更しないが、Webhookは送信する
            const url = `${webhookUrl}?${params.toString()}`
            const gasRes = await fetch(url, { method: 'GET', redirect: 'follow' })
            results.push({ detail, status: gasRes.status, ok: gasRes.ok })

            // Webhook送信が成功した場合のみDBの在庫を減らす
            if (gasRes.ok && dbUpdates.length > 0) {
                await prisma.$transaction(dbUpdates)
            }
        }

        return NextResponse.json({ success: true, date: todayStr, recorded: results })
    } catch (err) {
        console.error('daily-checkin cron error:', err)
        return NextResponse.json({ error: String(err) }, { status: 500 })
    }
}
