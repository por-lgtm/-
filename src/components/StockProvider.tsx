'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { updateStockBatch } from '@/app/actions' // We will create this next
import { useRouter } from 'next/navigation'

type StockUpdates = Record<string, number>

interface StockContextType {
    updates: StockUpdates
    setUpdate: (itemId: string, delta: number) => void
    hasChanges: boolean
    saveAll: () => Promise<void>
    isSaving: boolean
}

const StockContext = createContext<StockContextType | undefined>(undefined)

export function StockProvider({ children }: { children: ReactNode }) {
    const [updates, setUpdates] = useState<StockUpdates>({})
    const [isSaving, setIsSaving] = useState(false)
    const router = useRouter()

    const setUpdate = (itemId: string, delta: number) => {
        setUpdates(prev => {
            const next = { ...prev, [itemId]: delta }
            if (delta === 0) {
                delete next[itemId] // clean up if 0
                return next
            }
            return next
        })
    }

    const hasChanges = Object.keys(updates).length > 0

    const saveAll = async () => {
        if (!hasChanges) return
        setIsSaving(true)
        try {
            // Convert to array
            const payload = Object.entries(updates).map(([itemId, delta]) => ({
                itemId,
                delta
            }))

            await updateStockBatch(payload)
            setUpdates({}) // Clear local state
            router.refresh() // Refresh server data
        } catch (e) {
            console.error(e)
            alert('保存に失敗しました')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <StockContext.Provider value={{ updates, setUpdate, hasChanges, saveAll, isSaving }}>
            {children}
        </StockContext.Provider>
    )
}

export function useStock() {
    const context = useContext(StockContext)
    if (!context) throw new Error('useStock must be used within StockProvider')
    return context
}
