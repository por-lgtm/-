import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { syncGoogleBookings } from '@/app/actions'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        // Authorization Validate
        const authHeader = request.headers.get('authorization')
        const cronSecret = process.env.CRON_SECRET
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Distributed Debounce Lock
        const lockKey = 'WEBHOOK_SYNC_RUNNING'
        const isRunning = await prisma.systemSetting.findUnique({ where: { key: lockKey } })
        
        // 既存のプロセスが実行中の場合はスキップする（スプレッドシートの連続編集による過負荷を防止）
        if (isRunning?.value === '1') {
            const lastUpdated = isRunning.updatedAt.getTime()
            const now = Date.now()
            // ただし、もしロックが1分以上残ったままならクラッシュとみなして再実行を許可する
            if (now - lastUpdated < 60000) {
                return NextResponse.json({ message: 'Sync already in progress. Skipping.' }, { status: 200 })
            }
        }

        // ロックを取得
        await prisma.systemSetting.upsert({
            where: { key: lockKey },
            update: { value: '1', updatedAt: new Date() },
            create: { key: lockKey, value: '1' }
        })

        try {
            // スプレッドシートの連続打鍵を吸収するため、意図的に3秒待機する
            await new Promise(resolve => setTimeout(resolve, 3000))

            // URLの取得
            const sheetUrlSetting = await prisma.systemSetting.findUnique({
                where: { key: 'GOOGLE_SHEET_URL' }
            })
            const sheetUrl = sheetUrlSetting?.value

            if (!sheetUrl) {
                return NextResponse.json({ error: 'System setting GOOGLE_SHEET_URL not found' }, { status: 400 })
            }

            // 同期処理の実行
            const result = await syncGoogleBookings(sheetUrl)

            if (!result?.success) {
                return NextResponse.json({ error: result?.error || 'Sync failed' }, { status: 500 })
            }

            return NextResponse.json({ message: 'Sync completed successfully', count: result.count }, { status: 200 })

        } finally {
            // 処理が完了、あるいは失敗しても必ずロックを解除する
            await prisma.systemSetting.upsert({
                where: { key: lockKey },
                update: { value: '0', updatedAt: new Date() },
                create: { key: lockKey, value: '0' }
            })
        }

    } catch (error) {
        console.error('Webhook Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
