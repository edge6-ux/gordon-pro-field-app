'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Spinner from '@/components/ui/Spinner'

const SESSION_KEY = 'gp_crew_authenticated'
const SESSION_TTL_MS = 8 * 60 * 60 * 1000 // 8 hours

export default function OperatorPage() {
  const router = useRouter()

  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) {
      router.replace('/')
      return
    }
    const ts = parseInt(raw, 10)
    if (Date.now() - ts > SESSION_TTL_MS) {
      sessionStorage.removeItem(SESSION_KEY)
      router.replace('/')
    }
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-7rem)]">
      <div className="text-center space-y-4">
        <Spinner size="lg" />
        <p className="font-heading text-2xl text-green-dark">Operator Dashboard</p>
        <p className="text-sm text-gray-400">Coming soon — crew tools will live here.</p>
      </div>
    </div>
  )
}
