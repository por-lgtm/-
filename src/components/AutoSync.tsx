'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { getSystemSetting, syncGoogleBookings } from '@/app/actions'

export default function AutoSync() {
    const router = useRouter()

    useEffect(() => {
        const sync = async () => {
            try {
                console.error('[AutoSync] Checking setting...')
                const url = await getSystemSetting('GOOGLE_SHEET_URL')
                console.error('[AutoSync] URL:', url)
                if (url) {
                    console.error('[AutoSync] Syncing...')
                    const res = await syncGoogleBookings(url)
                    console.error('[AutoSync] Result:', res)
                    if (res.success) {
                        console.error('[AutoSync] Refreshing...')
                        router.refresh()
                    }
                }
            } catch (error) {
                console.error('[AutoSync] Error:', error)
            }
        }

        // Sync on mount
        sync()

        // Sync every 5 minutes
        const interval = setInterval(sync, 5 * 60 * 1000)

        return () => clearInterval(interval)
    }, [router])

    // Render a hidden debug element to verify mounting
    return <div style={{ display: 'none' }} data-testid="autosync-mounted"></div>
}
