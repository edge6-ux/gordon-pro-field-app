'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Lock, Loader2 } from 'lucide-react'

const SESSION_KEY = 'gp_crew_authenticated'
const SESSION_TTL_MS = 8 * 60 * 60 * 1000
const PIN_LENGTH = 4

type AuthState = 'checking' | 'gate' | 'authorized'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>('checking')
  const [digits, setDigits] = useState<string[]>(Array(PIN_LENGTH).fill(''))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(PIN_LENGTH).fill(null))
  const loadingRef = useRef(false)

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
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    }
  }, [authState])

  const submitPin = async (pin: string) => {
    if (pin.length < PIN_LENGTH || loadingRef.current) return
    loadingRef.current = true
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
        setDigits(Array(PIN_LENGTH).fill(''))
        setShake(true)
        setError('Incorrect PIN.')
        inputRefs.current[0]?.focus()
        setTimeout(() => {
          setShake(false)
          setError('')
        }, 1500)
      }
    } catch {
      setError('Connection error. Try again.')
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }

  const handleChange = (idx: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (loadingRef.current) return
    const v = e.target.value.replace(/\D/g, '').slice(-1)
    if (!v) return

    const newDigits = [...digits]
    newDigits[idx] = v
    setDigits(newDigits)
    setError('')

    if (idx < PIN_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus()
    } else {
      void submitPin(newDigits.join(''))
    }
  }

  const handleKeyDown = (idx: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[idx]) {
        const newDigits = [...digits]
        newDigits[idx] = ''
        setDigits(newDigits)
      } else if (idx > 0) {
        const newDigits = [...digits]
        newDigits[idx - 1] = ''
        setDigits(newDigits)
        inputRefs.current[idx - 1]?.focus()
      }
    }
  }

  if (authState === 'checking') return null
  if (authState === 'authorized') return <>{children}</>

  return (
    <div className="min-h-[calc(100svh-3.5rem)] bg-green-dark flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xs">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative w-16 h-16 mb-5">
            <Image
              src="/images/fieldapp.png"
              alt="Gordon Pro"
              fill
              className="object-contain"
              sizes="64px"
            />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Lock size={14} className="text-white/50" />
            <p className="font-body text-white/50 text-xs uppercase tracking-widest">Crew Access</p>
          </div>
          <h1 className="font-heading text-3xl text-white text-center">Enter PIN</h1>
        </div>

        {/* 6 digit boxes */}
        <div
          className="flex justify-center gap-3 mb-4"
          style={{ animation: shake ? 'shake 0.4s ease-in-out' : undefined }}
        >
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el }}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digits[i]}
              onChange={handleChange(i)}
              onKeyDown={handleKeyDown(i)}
              disabled={loading}
              style={{
                width: 52,
                height: 64,
                textAlign: 'center',
                fontSize: 24,
                borderRadius: 12,
                border: shake
                  ? '2px solid #f87171'
                  : digits[i]
                  ? '2px solid #C8922A'
                  : '1.5px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.08)',
                color: 'white',
                outline: 'none',
                transition: 'border-color 150ms',
                fontFamily: 'var(--font-oswald)',
              }}
            />
          ))}
        </div>

        {/* Loading / error feedback */}
        <div className="h-6 flex items-center justify-center mb-6">
          {loading ? (
            <Loader2 size={18} className="animate-spin text-white/50" />
          ) : error ? (
            <p className="text-red-400 text-sm font-body text-center">{error}</p>
          ) : null}
        </div>

        <p className="text-white/30 text-xs font-body text-center mt-2">
          Session lasts 8 hours &middot; Gordon Pro crew only
        </p>

        <div className="mt-6 text-center">
          <Link
            href="/admin"
            className="text-white/30 text-xs font-body hover:text-white/60 transition-colors"
          >
            Admin Sign In →
          </Link>
        </div>
      </div>
    </div>
  )
}
