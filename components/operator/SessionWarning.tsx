'use client'

import { useCallback, useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

const SESSION_KEY = 'gp_crew_authenticated'
const SESSION_TTL_MS = 8 * 60 * 60 * 1000
const WARN_THRESHOLD_MS = 15 * 60 * 1000

export default function SessionWarning() {
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null)

  const check = useCallback(() => {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) { setMinutesRemaining(null); return }
    const ts = parseInt(raw, 10)
    if (isNaN(ts)) { setMinutesRemaining(null); return }
    const remaining = SESSION_TTL_MS - (Date.now() - ts)
    if (remaining > 0 && remaining < WARN_THRESHOLD_MS) {
      setMinutesRemaining(Math.ceil(remaining / 60000))
    } else {
      setMinutesRemaining(null)
    }
  }, [])

  useEffect(() => {
    check()
    const interval = setInterval(check, 60000)
    return () => clearInterval(interval)
  }, [check])

  function extend() {
    sessionStorage.setItem(SESSION_KEY, Date.now().toString())
    setMinutesRemaining(null)
  }

  if (minutesRemaining === null) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9998] flex items-center justify-between gap-3 py-3 px-4"
      style={{ background: '#FAEEDA', borderTop: '2px solid #C8922A' }}
    >
      <div className="flex items-center gap-2 min-h-[44px]">
        <Clock size={16} className="text-gold shrink-0" />
        <span className="font-body text-[14px]" style={{ color: '#633806' }}>
          Session expires in {minutesRemaining} min
        </span>
      </div>
      <button
        onClick={extend}
        className="bg-gold text-green-dark font-body font-medium text-sm rounded-lg py-2 px-4 min-h-[44px] active:scale-[0.98] transition-all duration-150"
      >
        Extend Session
      </button>
    </div>
  )
}
