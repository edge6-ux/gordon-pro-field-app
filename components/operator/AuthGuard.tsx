'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const SESSION_KEY = 'gp_crew_authenticated'
const SESSION_TTL_MS = 8 * 60 * 60 * 1000

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)

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
      return
    }
    setAuthorized(true)
  }, [router])

  if (!authorized) return null
  return <>{children}</>
}
