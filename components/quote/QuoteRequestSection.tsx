'use client'

import { useState } from 'react'
import { CheckCircle, Loader2, Check, Copy, X } from 'lucide-react'
import type { AIResult } from '@/lib/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

// ─── Field components ─────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block font-body text-[14px] font-medium text-[#4A4A4A] mb-1.5">
      {children}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  )
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p role="alert" className="font-body text-[12px] text-red-500 mt-1.5">{msg}</p>
}

function inputCls(hasError?: boolean) {
  return [
    'w-full rounded-lg border px-4 text-[16px] text-[#4A4A4A] bg-white h-12',
    'outline-none transition-colors duration-150',
    'focus:border-[#1C3A2B] focus:ring-2 focus:ring-[#1C3A2B]/20',
    hasError ? 'border-red-400' : 'border-gray-300',
  ].join(' ')
}

function TimeButton({
  label, selected, onSelect,
}: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'flex-1 py-2.5 rounded-lg border font-body text-[14px] min-h-[44px] transition-all duration-150',
        selected
          ? 'bg-[#1C3A2B] text-white border-[#1C3A2B]'
          : 'bg-white text-[#4A4A4A] border-gray-300 hover:border-gray-400',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-[13px] font-body transition-colors"
      style={{ background: '#1C3A2B' }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface QuoteRequestSectionProps {
  customerName?:    string | null
  customerPhone?:   string | null
  customerEmail?:   string | null
  propertyAddress?: string | null
  photoUrls?:       string[]
  aiResult?:        AIResult | null
  treeCount?:       string | null
  urgency?:         string | null
  serviceType?:     string | null
}

export default function QuoteRequestSection({
  customerName,
  customerPhone,
  customerEmail,
  propertyAddress,
  photoUrls  = [],
  aiResult   = null,
  treeCount,
  urgency,
  serviceType,
}: QuoteRequestSectionProps) {
  const [mode, setMode] = useState<'prompt' | 'form' | 'success'>('prompt')

  // Pre-filled form state
  const [name,               setName]               = useState(customerName ?? '')
  const [phone,              setPhone]              = useState(formatPhone(customerPhone ?? ''))
  const [email,              setEmail]              = useState(customerEmail ?? '')
  const [address,            setAddress]            = useState(propertyAddress ?? '')
  const [preferredDate,      setPreferredDate]      = useState('')
  const [preferredTimeframe, setPreferredTimeframe] = useState('flexible')

  const [errors,        setErrors]        = useState<Record<string, string>>({})
  const [submitting,    setSubmitting]    = useState(false)
  const [referenceCode, setReferenceCode] = useState<string | null>(null)

  function clearError(k: string) {
    setErrors((prev) => { const n = { ...prev }; delete n[k]; return n })
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!name.trim())  e.name  = 'Name is required'
    if (!phone.trim()) e.phone = 'Phone number is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setErrors({})
    try {
      const res = await fetch('https://gordon-admin.vercel.app/api/public/request-quote', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName:    name.trim(),
          customerPhone:   phone,
          customerEmail:   email.trim() || undefined,
          propertyAddress: address.trim() || undefined,
          serviceType:     serviceType || undefined,
          preferredDate:   preferredDate || undefined,
          preferredTimeframe,
          photoUrls,
          aiResult,
          treeCount: treeCount || '',
          urgency:   urgency   || '',
        }),
      })
      const data = await res.json() as { success?: boolean; referenceCode?: string; error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? 'Something went wrong')
      setReferenceCode(data.referenceCode ?? '')
      setMode('success')
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Prompt ────────────────────────────────────────────────────────────────────

  if (mode === 'prompt') {
    return (
      <div className="rounded-2xl p-6" style={{ background: '#1C3A2B' }}>
        <p
          className="font-body text-[11px] uppercase mb-2"
          style={{ color: '#9FE1CB', letterSpacing: '0.08em' }}
        >
          Get Your Quote
        </p>
        <h3 className="font-heading text-[20px] text-white mb-1">Ready to get a quote?</h3>
        <p className="font-body text-[14px] mb-5" style={{ color: 'rgba(255,255,255,0.65)' }}>
          We&apos;ll send your assessment to our team so they can prepare an accurate quote.
        </p>
        <button
          onClick={() => setMode('form')}
          className="w-full bg-[#C8922A] text-white font-heading text-[15px] uppercase tracking-wide
                     py-3.5 rounded-xl hover:bg-amber-600 active:bg-amber-700 transition-colors duration-150"
        >
          Request a Quote
        </button>
      </div>
    )
  }

  // ── Success ───────────────────────────────────────────────────────────────────

  if (mode === 'success' && referenceCode) {
    return (
      <div
        className="bg-white rounded-2xl p-6 text-center"
        style={{ border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        <CheckCircle size={44} className="mx-auto mb-3 text-[#C8922A]" />
        <h3 className="font-heading text-[20px] text-[#1C3A2B] mb-2">Quote Request Received!</h3>
        <p className="font-body text-[14px] text-gray-500 mb-5 leading-relaxed">
          Our team will be in touch shortly with your quote.
        </p>
        <div className="rounded-xl p-4" style={{ background: '#EAF3DE', border: '1px solid #C0DD97' }}>
          <p
            className="font-body uppercase tracking-widest font-bold mb-1"
            style={{ color: '#3B6D11', fontSize: 11 }}
          >
            Quote Reference
          </p>
          <p
            className="font-heading font-mono"
            style={{ color: '#1C3A2B', fontSize: 26, letterSpacing: '0.05em', lineHeight: 1 }}
          >
            {referenceCode}
          </p>
          <CopyCodeButton code={referenceCode} />
        </div>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────────

  return (
    <div
      className="bg-white rounded-2xl p-6"
      style={{ border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-start justify-between mb-5">
        <div>
          <p
            className="font-body text-[11px] uppercase mb-0.5"
            style={{ color: '#C8922A', letterSpacing: '0.08em' }}
          >
            Get Your Quote
          </p>
          <h3 className="font-heading text-[20px] text-[#1C3A2B]">Request a Quote</h3>
        </div>
        <button
          onClick={() => setMode('prompt')}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1 -mr-1 mt-0.5"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">

        <div>
          <FieldLabel required>Full name</FieldLabel>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); clearError('name') }}
            className={inputCls(!!errors.name)}
            placeholder="Jane Smith"
            autoComplete="name"
          />
          <FieldError msg={errors.name} />
        </div>

        <div>
          <FieldLabel required>Phone number</FieldLabel>
          <input
            type="tel"
            value={phone}
            onChange={(e) => { setPhone(formatPhone(e.target.value)); clearError('phone') }}
            className={inputCls(!!errors.phone)}
            placeholder="(555) 555-5555"
            autoComplete="tel"
          />
          <FieldError msg={errors.phone} />
        </div>

        <div>
          <FieldLabel>Email address</FieldLabel>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls()}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <div>
          <FieldLabel>Property address</FieldLabel>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={inputCls()}
            placeholder="Street address, city, state"
            autoComplete="street-address"
          />
        </div>

        <div>
          <FieldLabel>Preferred date</FieldLabel>
          <input
            type="date"
            value={preferredDate}
            min={todayStr()}
            onChange={(e) => setPreferredDate(e.target.value)}
            className={inputCls()}
          />
        </div>

        <div>
          <FieldLabel>Preferred time</FieldLabel>
          <div className="flex gap-2">
            <TimeButton label="Morning"   selected={preferredTimeframe === 'morning'}   onSelect={() => setPreferredTimeframe('morning')} />
            <TimeButton label="Afternoon" selected={preferredTimeframe === 'afternoon'} onSelect={() => setPreferredTimeframe('afternoon')} />
            <TimeButton label="Flexible"  selected={preferredTimeframe === 'flexible'}  onSelect={() => setPreferredTimeframe('flexible')} />
          </div>
        </div>

        {errors.submit && (
          <p role="alert" className="font-body text-sm text-red-500 text-center">{errors.submit}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={[
            'w-full bg-[#1C3A2B] text-white font-heading text-[16px] uppercase tracking-wide',
            'py-4 rounded-xl flex items-center justify-center gap-2',
            'hover:bg-[#2D5A40] active:bg-[#16301f] transition-colors duration-150',
            'disabled:opacity-60 disabled:cursor-not-allowed',
          ].join(' ')}
        >
          {submitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Submitting…
            </>
          ) : (
            'Request a Quote'
          )}
        </button>

      </form>
    </div>
  )
}
