'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Loader2, Lock } from 'lucide-react'

const SESSION_KEY = 'gp_crew_authenticated'
const SESSION_TTL_MS = 8 * 60 * 60 * 1000
const PIN_LENGTH = 6

type AuthState = 'checking' | 'gate' | 'authorized'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>('checking')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (raw) {
      const ts = parseInt(raw, 10)
      if (Date.now() - ts <= SESSION_TTL_MS) {
        setAuthState('authorized')
        return
      }
      sessionStorage.removeItem(SESSION_KEY)
    }
    setAuthState('gate')
  }, [])

  useEffect(() => {
    if (authState === 'gate') {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [authState])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (pin.length < 4 || loading) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })

      if (res.ok) {
        sessionStorage.setItem(SESSION_KEY, Date.now().toString())
        setAuthState('authorized')
      } else {
        setError('Incorrect PIN. Try again.')
        setPin('')
        setShake(true)
        setTimeout(() => setShake(false), 500)
        inputRef.current?.focus()
      }
    } catch {
      setError('Connection error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (authState === 'checking') return null

  if (authState === 'authorized') return <>{children}</>

  // PIN gate
  return (
    <div className="min-h-[calc(100svh-3.5rem)] bg-green-dark flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xs">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative w-16 h-16 mb-5">
            <Image
              src="/images/gptslogo.png"
              alt="Gordon Pro"
              fill
              className="object-contain brightness-0 invert"
              sizes="64px"
            />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Lock size={14} className="text-white/50" />
            <p className="font-body text-white/50 text-xs uppercase tracking-widest">Crew Access</p>
          </div>
          <h1 className="font-heading text-3xl text-white text-center">Enter PIN</h1>
        </div>

        {/* PIN form */}
        <form onSubmit={handleSubmit} noValidate>
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="current-password"
            value={pin}
            onChange={e => {
              const v = e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH)
              setPin(v)
              setError('')
            }}
            placeholder="••••••"
            className={[
              'w-full text-center text-[28px] tracking-[0.4em] font-heading rounded-2xl px-4 py-4',
              'bg-white/10 border-2 text-white placeholder-white/30 outline-none',
              'focus:bg-white/15 transition-colors',
              shake ? 'border-red-400' : error ? 'border-red-400/60' : 'border-white/20 focus:border-gold',
            ].join(' ')}
            style={{
              animation: shake ? 'shake 0.4s ease-in-out' : undefined,
            }}
          />

          {error && (
            <p className="text-red-400 text-sm font-body text-center mt-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={pin.length < 4 || loading}
            className={[
              'mt-5 w-full flex items-center justify-center gap-2 rounded-2xl py-4',
              'font-heading text-xl uppercase tracking-wider transition-all',
              pin.length >= 4 && !loading
                ? 'bg-gold text-[#1A1A1A] active:scale-[0.98]'
                : 'bg-white/10 text-white/30 cursor-not-allowed',
            ].join(' ')}
          >
            {loading ? <Loader2 size={20} className="animate-spin text-white/60" /> : 'Unlock'}
          </button>
        </form>

        <p className="text-white/30 text-xs font-body text-center mt-8">
          Session lasts 8 hours &middot; Gordon Pro crew only
        </p>
      </div>
    </div>
  )
}
