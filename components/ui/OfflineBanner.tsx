'use client'

import { useEffect, useRef, useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true)
  const [visible, setVisible] = useState(false)
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    if (!navigator.onLine) setVisible(true)

    const handleOnline = () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current)
      setIsOnline(true)
      setVisible(true)
      dismissTimer.current = setTimeout(() => setVisible(false), 2000)
    }

    const handleOffline = () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current)
      setIsOnline(false)
      setVisible(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (dismissTimer.current) clearTimeout(dismissTimer.current)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 py-2 px-4 motion-safe:animate-[slideDown_200ms_ease-out]"
      style={{ background: isOnline ? '#1C3A2B' : '#1A1A1A' }}
    >
      {isOnline ? (
        <Wifi size={16} className="text-green-400 shrink-0" />
      ) : (
        <WifiOff size={16} className="text-white shrink-0" />
      )}
      <span className="font-body text-white text-[14px]">
        {isOnline
          ? 'Back online — resuming uploads'
          : 'No internet connection — uploads paused'}
      </span>
    </div>
  )
}
