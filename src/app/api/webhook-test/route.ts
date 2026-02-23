import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const gasUrl = 'https://script.google.com/macros/s/AKfycbx2XECLFaIwKb0vtYpcudSp4taw-0pWogFAfQLHUj_CeznKdF1ieAYycOYLTm6QzoJ4/exec'

        const params = new URLSearchParams({
            date: '2026/02/23',
            time: '23:30',
            detail: 'Vercel API test',
            'ボックスシーツ': '88',
            'デュベカバー': '37',
            '枕カバー': '40',
            'バスタオル': '92',
            'フェイスタオル': '72',
        })

        const url = `${gasUrl}?${params.toString()}`

        const res = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
        })

        const text = await res.text()

        return NextResponse.json({
            success: true,
            status: res.status,
            ok: res.ok,
            response: text,
            urlCalled: url.substring(0, 100) + '...',
        })
    } catch (err) {
        return NextResponse.json({
            success: false,
            error: String(err),
        }, { status: 500 })
    }
}
