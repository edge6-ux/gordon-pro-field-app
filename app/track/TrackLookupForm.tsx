'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, Loader2 } from 'lucide-react'

export default function TrackLookupForm() {
  const router = useRouter()
  const [referenceCode, setReferenceCode] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/jobs/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenceCode, phone }),
      })

      if (res.ok) {
        const data = await res.json() as { referenceCode: string }
        router.push(`/track/${data.referenceCode}`)
      } else if (res.status === 404) {
        setError(
          'No job found with that reference number and phone. Please check and try again, or call us at (770) 271-6072.'
        )
      } else {
        setError('Something went wrong. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: '#F5F2ED', minHeight: '100vh' }}>
      {/* Hero */}
      <section style={{ background: '#1C3A2B', padding: '56px 0' }}>
        <div style={{ maxWidth: 448, margin: '0 auto', padding: '0 16px', textAlign: 'center' }}>
          <p
            className="font-body"
            style={{ color: '#9FE1CB', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}
          >
            Job Tracking
          </p>
          <h1 className="font-heading" style={{ color: 'white', fontSize: 32, marginBottom: 8 }}>
            Track Your Assessment
          </h1>
          <p className="font-body" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
            Enter your reference number to check your job status.
          </p>
        </div>
      </section>

      {/* Lookup card */}
      <div style={{ padding: '0 16px' }}>
        <div
          style={{
            background: 'white',
            borderRadius: 16,
            boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
            maxWidth: 448,
            margin: '-40px auto 0',
            padding: 32,
            position: 'relative',
            zIndex: 10,
          }}
        >
          <form onSubmit={handleSubmit} noValidate>
            {/* Reference Code */}
            <div style={{ marginBottom: 20 }}>
              <label
                className="font-body"
                style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1A1A1A', marginBottom: 6 }}
              >
                Reference Number
              </label>
              <input
                type="text"
                required
                value={referenceCode}
                onChange={e => setReferenceCode(e.target.value.toUpperCase())}
                placeholder="e.g. 8B062D29"
                className="font-mono w-full rounded-lg px-3 py-3 text-[15px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-dark"
                style={{ border: '1.5px solid #D1D5DB' }}
              />
              <p className="font-body" style={{ fontSize: 12, color: '#888780', marginTop: 4 }}>
                Found on your results page or confirmation email
              </p>
            </div>

            {/* Phone */}
            <div style={{ marginBottom: 20 }}>
              <label
                className="font-body"
                style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1A1A1A', marginBottom: 6 }}
              >
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(770) 555-0000"
                className="font-body w-full rounded-lg px-3 py-3 text-[15px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-dark"
                style={{ border: '1.5px solid #D1D5DB' }}
              />
              <p className="font-body" style={{ fontSize: 12, color: '#888780', marginTop: 4 }}>
                The number used when you submitted your assessment
              </p>
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  background: '#FCEBEB',
                  border: '1px solid #F09595',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <AlertCircle size={16} color="#C41C1C" style={{ flexShrink: 0, marginTop: 1 }} />
                <p className="font-body" style={{ color: '#791F1F', fontSize: 13 }}>
                  {error}
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="font-heading w-full flex items-center justify-center gap-2 rounded-xl py-4 text-white uppercase tracking-wider transition-opacity disabled:opacity-60"
              style={{ background: '#1C3A2B', fontSize: 16 }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Looking up...
                </>
              ) : (
                'Look Up My Job'
              )}
            </button>
          </form>
        </div>

        {/* Below card */}
        <p className="font-body" style={{ textAlign: 'center', marginTop: 32, fontSize: 13, color: '#888780' }}>
          Don&apos;t have a reference number?{' '}
          <Link href="/submit" style={{ color: '#C8922A', textDecoration: 'underline' }}>
            Submit a new assessment
          </Link>
        </p>
      </div>
    </div>
  )
}
