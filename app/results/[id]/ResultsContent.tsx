'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import type { TreeSubmission, AIResult, Flag } from '@/lib/types'
import {
  AlertTriangle, CheckCircle, Info, X, ChevronLeft, ChevronRight,
  Share2, Printer, Phone, Loader2, Trees, MapPin, Ruler, ArrowRight,
  Camera,
} from 'lucide-react'

// ─── Scroll Reveal ────────────────────────────────────────────────────────────

function ScrollReveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${className}`}
    >
      {children}
    </div>
  )
}

// ─── Loading Poller ───────────────────────────────────────────────────────────

const POLL_MESSAGES = [
  'Analyzing your photos with AI…',
  'Identifying tree species…',
  'Checking for safety flags…',
  'Preparing crew tips…',
  'Almost ready…',
]

function LoadingPoller({ id, onResult }: { id: string; onResult: (s: TreeSubmission) => void }) {
  const [msgIdx, setMsgIdx] = useState(0)
  const [timedOut, setTimedOut] = useState(false)
  const attempts = useRef(0)
  const maxAttempts = 10

  useEffect(() => {
    const cycleMsg = setInterval(() => {
      setMsgIdx(i => (i + 1) % POLL_MESSAGES.length)
    }, 3000)

    const poll = setInterval(async () => {
      attempts.current += 1
      if (attempts.current > maxAttempts) {
        clearInterval(poll)
        clearInterval(cycleMsg)
        setTimedOut(true)
        return
      }
      try {
        const res = await fetch(`/api/submissions/${id}`)
        if (!res.ok) return
        const data: TreeSubmission = await res.json()
        if (data.ai_result) {
          clearInterval(poll)
          clearInterval(cycleMsg)
          onResult(data)
        }
      } catch { /* ignore */ }
    }, 3000)

    return () => { clearInterval(poll); clearInterval(cycleMsg) }
  }, [id, onResult])

  if (timedOut) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <p className="font-heading text-xl text-green-dark mb-2">Analysis is taking longer than expected</p>
        <p className="text-gray-500 text-sm mb-4">
          Our AI is still working. Try refreshing the page in a minute.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 bg-green-dark text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-green-mid transition-colors"
        >
          Refresh Page
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
      <div className="flex justify-center mb-6">
        <Loader2 className="w-10 h-10 text-gold animate-spin" />
      </div>
      <p className="font-heading text-xl text-green-dark mb-2">Generating your assessment…</p>
      <p className="text-gray-400 text-sm transition-all duration-300">{POLL_MESSAGES[msgIdx]}</p>
    </div>
  )
}

// ─── Flag Alerts ──────────────────────────────────────────────────────────────

const flagConfig = {
  stop: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-800', icon: <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" /> },
  caution: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-900', icon: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" /> },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" /> },
}

function FlagAlerts({ flags }: { flags: Flag[] }) {
  if (!flags.length) return null
  const order = ['stop', 'caution', 'info'] as const
  const sorted = [...flags].sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity))

  return (
    <ScrollReveal>
      <div className="space-y-3">
        {sorted.map((flag, i) => {
          const cfg = flagConfig[flag.severity]
          return (
            <div key={i} className={`flex gap-3 p-4 rounded-xl border ${cfg.bg} ${cfg.border}`}>
              {cfg.icon}
              <p className={`text-sm font-medium leading-snug ${cfg.text}`}>{flag.message}</p>
            </div>
          )
        })}
      </div>
    </ScrollReveal>
  )
}

// ─── Species Card ─────────────────────────────────────────────────────────────

const confidenceBadge = {
  high: 'bg-green-100 text-green-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-gray-100 text-gray-600',
}

function SpeciesCard({ result }: { result: AIResult }) {
  return (
    <ScrollReveal>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="bg-green-dark px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-widest mb-1">Identified Species</p>
              <h2 className="font-heading text-2xl text-white leading-tight">{result.species_name}</h2>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full mt-1 ${confidenceBadge[result.species_confidence]}`}>
              {result.species_confidence} confidence
            </span>
          </div>
        </div>
        <div className="px-6 py-5">
          <p className="text-gray-600 text-sm leading-relaxed">{result.species_description}</p>
        </div>
      </div>
    </ScrollReveal>
  )
}

// ─── Characteristics Card ─────────────────────────────────────────────────────

function CharacteristicsCard({ items }: { items: string[] }) {
  if (!items.length) return null
  return (
    <ScrollReveal>
      <div className="bg-white rounded-2xl border border-gray-200 px-6 py-5">
        <h3 className="font-heading text-lg text-green-dark mb-4 flex items-center gap-2">
          <Trees className="w-5 h-5 text-gold" />
          Key Characteristics
        </h3>
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-mid shrink-0 mt-0.5" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </ScrollReveal>
  )
}

// ─── Site Conditions Card ─────────────────────────────────────────────────────

function SiteConditionsCard({ items }: { items: string[] }) {
  if (!items.length) return null
  return (
    <ScrollReveal>
      <div className="bg-white rounded-2xl border border-gray-200 px-6 py-5">
        <h3 className="font-heading text-lg text-green-dark mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-gold" />
          Site Considerations
        </h3>
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
              <ArrowRight className="w-4 h-4 text-gold shrink-0 mt-0.5" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </ScrollReveal>
  )
}

// ─── Crew Tips Card ───────────────────────────────────────────────────────────

function CrewTipsCard({ tips }: { tips: string[] }) {
  if (!tips.length) return null
  return (
    <ScrollReveal>
      <div className="bg-gold-light rounded-2xl border border-gold/30 px-6 py-5">
        <h3 className="font-heading text-lg text-green-dark mb-4 flex items-center gap-2">
          <Ruler className="w-5 h-5 text-gold" />
          Crew Tips
        </h3>
        <ul className="space-y-3">
          {tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
              <span className="flex-none w-5 h-5 rounded-full bg-gold text-white text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </ScrollReveal>
  )
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ urls, initial, onClose }: { urls: string[]; initial: number; onClose: () => void }) {
  const [idx, setIdx] = useState(initial)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setIdx(i => (i + 1) % urls.length)
      if (e.key === 'ArrowLeft') setIdx(i => (i - 1 + urls.length) % urls.length)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [urls.length, onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white"
        aria-label="Close"
      >
        <X className="w-7 h-7" />
      </button>

      {urls.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => (i - 1 + urls.length) % urls.length) }}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
            aria-label="Previous"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => (i + 1) % urls.length) }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
            aria-label="Next"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      <div className="relative w-full max-w-3xl max-h-[85vh] mx-8" onClick={e => e.stopPropagation()}>
        <Image
          src={urls[idx]}
          alt={`Photo ${idx + 1}`}
          width={900}
          height={700}
          className="object-contain w-full h-full max-h-[80vh] rounded-lg"
        />
      </div>

      {urls.length > 1 && (
        <div className="absolute bottom-6 flex gap-2">
          {urls.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); setIdx(i) }}
              className={`w-2 h-2 rounded-full transition-colors ${i === idx ? 'bg-white' : 'bg-white/40'}`}
              aria-label={`Photo ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Photos Section ───────────────────────────────────────────────────────────

function PhotosSection({ urls }: { urls: string[] }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  if (!urls.length) return null

  return (
    <ScrollReveal>
      <div className="bg-white rounded-2xl border border-gray-200 px-6 py-5">
        <h3 className="font-heading text-lg text-green-dark mb-4">Submitted Photos</h3>
        <div className="grid grid-cols-3 gap-2">
          {urls.map((url, i) => (
            <button
              key={url}
              onClick={() => setLightboxIdx(i)}
              className="relative aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-gold focus:ring-2 focus:ring-gold focus:outline-none transition-all"
            >
              <Image src={url} alt={`Tree photo ${i + 1}`} fill className="object-cover" sizes="160px" />
            </button>
          ))}
        </div>
      </div>
      {lightboxIdx !== null && (
        <Lightbox urls={urls} initial={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </ScrollReveal>
  )
}

// ─── What Happens Next ────────────────────────────────────────────────────────

function WhatHappensNext() {
  const steps = [
    { label: 'Review', desc: 'Our team reviews your assessment and photos.' },
    { label: 'Pricing', desc: 'We review the assessment and reach out with pricing — usually same day.' },
    { label: 'Schedule', desc: 'Pick a date that works. We show up on time, every time.' },
  ]

  return (
    <ScrollReveal>
      <div className="bg-white rounded-2xl border border-gray-200 px-6 py-5 print:hidden">
        <h3 className="font-heading text-lg text-green-dark mb-5">What Happens Next</h3>
        <div className="space-y-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="flex-none w-8 h-8 rounded-full bg-green-dark text-white font-heading text-sm flex items-center justify-center">
                {i + 1}
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{step.label}</p>
                <p className="text-gray-500 text-sm">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollReveal>
  )
}

// ─── Customer CTA ─────────────────────────────────────────────────────────────

function CustomerCTA() {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: 'My Tree Assessment', url })
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <ScrollReveal>
      <div className="bg-green-dark rounded-2xl px-6 py-7 text-center print:hidden">
        <p className="font-heading text-xl text-white mb-1">Questions about your assessment?</p>
        <p className="text-white/70 text-sm mb-5">We&apos;re here to help. Call us anytime.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="tel:+1-555-000-0000"
            className="inline-flex items-center justify-center gap-2 bg-gold text-white px-6 py-3 rounded-lg font-semibold text-sm hover:bg-gold/90 transition-colors"
          >
            <Phone className="w-4 h-4" />
            Call Gordon Pro
          </a>
          <button
            onClick={handleShare}
            className="inline-flex items-center justify-center gap-2 bg-white/10 text-white px-6 py-3 rounded-lg font-semibold text-sm hover:bg-white/20 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            {copied ? 'Link Copied!' : 'Share Results'}
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 bg-white/10 text-white px-6 py-3 rounded-lg font-semibold text-sm hover:bg-white/20 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print / Save
          </button>
        </div>
      </div>
    </ScrollReveal>
  )
}

// ─── Operator Save Job ────────────────────────────────────────────────────────

const STATUS_OPTIONS = ['pending', 'reviewed', 'quoted', 'scheduled', 'completed'] as const

function OperatorSaveJob({ submission }: { submission: TreeSubmission }) {
  const [status, setStatus] = useState(submission.status)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch(`/api/submissions/${submission.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollReveal>
      <div className="bg-white rounded-2xl border border-gray-200 px-6 py-5 print:hidden">
        <h3 className="font-heading text-lg text-green-dark mb-4">Job Status</h3>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={status}
            onChange={e => setStatus(e.target.value as TreeSubmission['status'])}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-dark"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-green-dark text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-mid transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Status'}
          </button>
          <a
            href={`tel:${submission.customer_phone}`}
            className="inline-flex items-center gap-2 text-green-dark text-sm font-medium hover:underline"
          >
            <Phone className="w-4 h-4" />
            {submission.customer_phone}
          </a>
        </div>
      </div>
    </ScrollReveal>
  )
}

// ─── Success Header ───────────────────────────────────────────────────────────

function heightLabel(h: string) {
  const map: Record<string, string> = {
    under_20ft: 'Under 20ft',
    '20_40ft': '20–40ft',
    '40_60ft': '40–60ft',
    over_60ft: 'Over 60ft',
  }
  return map[h] ?? h
}

function SuccessHeader({ submission }: { submission: TreeSubmission }) {
  const isCustomer = submission.source === 'customer'
  return (
    <div className="text-center mb-8 print:mb-4">
      {isCustomer && (
        <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
          <CheckCircle className="w-4 h-4" />
          Submission received
        </div>
      )}
      <h1 className="font-heading text-3xl text-green-dark leading-tight">
        {isCustomer ? 'Your Tree Assessment' : `Assessment — ${submission.customer_name}`}
      </h1>
      <p className="text-gray-500 text-sm mt-2">
        {submission.property_address}
        {submission.tree_height && ` · ${heightLabel(submission.tree_height)}`}
      </p>
    </div>
  )
}

// ─── No Tree Detected ─────────────────────────────────────────────────────────

function NoTreeDetected({ submission }: { submission: TreeSubmission }) {
  const isOperator = submission.source === 'operator'
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-8 text-center">
      <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
        <Camera className="w-7 h-7 text-amber-600" />
      </div>
      <h2 className="font-heading text-xl text-amber-900 mb-2">No Tree Detected</h2>
      <p className="text-amber-800 text-sm leading-relaxed mb-5">
        {isOperator
          ? 'The AI couldn\'t identify a tree in these photos. Try retaking with the tree clearly centered and well-lit.'
          : 'The AI couldn\'t identify a tree in your photos. Please resubmit with clear photos showing the full tree.'}
      </p>
      {isOperator ? (
        <a
          href="/operator/analyze"
          className="inline-flex items-center gap-2 bg-green-dark text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-green-mid transition-colors"
        >
          <Camera className="w-4 h-4" />
          Retake Photos
        </a>
      ) : (
        <a
          href="/submit"
          className="inline-flex items-center gap-2 bg-green-dark text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-green-mid transition-colors"
        >
          Resubmit with New Photos
        </a>
      )}
    </div>
  )
}

// ─── Root Component ───────────────────────────────────────────────────────────

export default function ResultsContent({ submission: initial }: { submission: TreeSubmission }) {
  const [submission, setSubmission] = useState(initial)
  const hasResult = !!submission.ai_result

  const handleResult = useCallback((updated: TreeSubmission) => {
    setSubmission(updated)
  }, [])

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 space-y-5">
      <SuccessHeader submission={submission} />

      {!hasResult ? (
        <LoadingPoller id={submission.id} onResult={handleResult} />
      ) : submission.ai_result?.no_tree_detected ? (
        <>
          <NoTreeDetected submission={submission} />
          <PhotosSection urls={submission.photo_urls} />
        </>
      ) : (
        <>
          {submission.ai_result && <FlagAlerts flags={submission.ai_result.flags} />}
          {submission.ai_result && <SpeciesCard result={submission.ai_result} />}
          {submission.ai_result && <CharacteristicsCard items={submission.ai_result.key_characteristics} />}
          {submission.ai_result && <SiteConditionsCard items={submission.ai_result.site_considerations} />}
          {submission.ai_result && <CrewTipsCard tips={submission.ai_result.crew_tips} />}
          <PhotosSection urls={submission.photo_urls} />
          {submission.source === 'customer' && <WhatHappensNext />}
          {submission.source === 'operator' && <OperatorSaveJob submission={submission} />}
          {submission.source === 'customer' && <CustomerCTA />}
          {submission.ai_result && (
            <p className="text-center text-xs text-gray-300 print:text-gray-400">
              AI analysis generated {new Date(submission.ai_result.generated_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          )}
        </>
      )}
    </main>
  )
}
