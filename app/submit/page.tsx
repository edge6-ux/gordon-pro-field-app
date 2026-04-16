'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone, type FileRejection } from 'react-dropzone'
import Image from 'next/image'
import {
  Check,
  X,
  AlertTriangle,
  Camera,
  User,
  Phone,
  Mail,
  MapPin,
  Leaf,
  Pencil,
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

// ─── Types ────────────────────────────────────────────────────────────────────

type TreeHeightValue = '' | 'under_20ft' | '20_40ft' | '40_60ft' | 'over_60ft'
type LeanValue = 'none' | 'slight' | 'moderate' | 'severe'
type ProximityValue = 'none' | 'close' | 'very_close' | 'contact'

type PhotoItem = {
  id: string
  file: File
  preview: string
  url: string | null
  progress: number
  error: string | null
}

type ToastItem = {
  id: string
  message: string
  type: 'error' | 'success'
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'gp_submit_form'
const MAX_PHOTOS = 5
const MAX_SIZE_BYTES = 10 * 1024 * 1024

const HEIGHT_OPTIONS: { value: TreeHeightValue; emoji: string; label: string; sub: string }[] = [
  { value: 'under_20ft', emoji: '🌱', label: 'Under 20ft', sub: 'small tree' },
  { value: '20_40ft',    emoji: '🌳', label: '20 – 40ft',  sub: 'medium tree' },
  { value: '40_60ft',    emoji: '🌲', label: '40 – 60ft',  sub: 'large tree' },
  { value: 'over_60ft',  emoji: '🏔️', label: 'Over 60ft',  sub: 'very large' },
]

const LEAN_OPTIONS: { value: LeanValue; label: string }[] = [
  { value: 'none',     label: 'No Lean' },
  { value: 'slight',   label: 'Slight Lean' },
  { value: 'moderate', label: 'Moderate Lean' },
  { value: 'severe',   label: 'Severe Lean' },
]

const PROXIMITY_OPTIONS: { value: ProximityValue; emoji: string; label: string; sub: string }[] = [
  { value: 'none',       emoji: '🏠', label: 'Not Close',      sub: '20+ feet away' },
  { value: 'close',      emoji: '⚠️', label: 'Somewhat Close', sub: '10–20 feet' },
  { value: 'very_close', emoji: '🚨', label: 'Very Close',     sub: 'Under 10 feet' },
  { value: 'contact',    emoji: '🏚️', label: 'In Contact',     sub: 'Touching structure' },
]

const HEIGHT_LABELS: Record<TreeHeightValue, string> = {
  '':          'Not specified',
  under_20ft:  'Under 20ft',
  '20_40ft':   '20 – 40ft',
  '40_60ft':   '40 – 60ft',
  over_60ft:   'Over 60ft',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inputCls(error?: string): string {
  return [
    'w-full rounded-lg border px-4 py-3 text-[15px] text-gray-text bg-white',
    'outline-none transition-colors duration-150',
    'focus:border-green-dark focus:ring-2 focus:ring-green-dark/20',
    error ? 'border-red-400' : 'border-gray-300',
  ].join(' ')
}

function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(file), 15000)

    const objectUrl = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      clearTimeout(timer)
      URL.revokeObjectURL(objectUrl)
      const MAX = 1920
      let w = img.naturalWidth || MAX
      let h = img.naturalHeight || MAX
      if (w > MAX || h > MAX) {
        if (w >= h) { h = Math.round((h / w) * MAX); w = MAX }
        else { w = Math.round((w / h) * MAX); h = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(file); return }
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => resolve(
          blob
            ? new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg', lastModified: Date.now() })
            : file
        ),
        'image/jpeg',
        0.82
      )
    }
    img.onerror = () => { clearTimeout(timer); URL.revokeObjectURL(objectUrl); resolve(file) }
    img.src = objectUrl
  })
}

async function uploadFile(file: File, onProgress: (pct: number) => void): Promise<string> {
  const compressed = await compressImage(file)

  if (compressed.size > 4 * 1024 * 1024) {
    throw new Error(`File is ${(compressed.size / 1024 / 1024).toFixed(1)}MB — please use a smaller photo`)
  }

  return new Promise((resolve, reject) => {
    const fd = new FormData()
    fd.append('file', compressed)
    const xhr = new XMLHttpRequest()
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    })
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const body = JSON.parse(xhr.responseText) as { url?: string; error?: string }
        if (body.url) resolve(body.url)
        else reject(new Error(body.error ?? 'Upload failed'))
      } else if (xhr.status === 413) {
        reject(new Error('File too large — please try a smaller photo'))
      } else {
        let msg = `Upload failed (${xhr.status})`
        try { msg = (JSON.parse(xhr.responseText) as { error?: string }).error ?? msg } catch { /* empty */ }
        reject(new Error(msg))
      }
    })
    xhr.addEventListener('error', () => reject(new Error('Network error — check connection')))
    xhr.open('POST', '/api/upload')
    xhr.send(fd)
  })
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function ToastList({ toasts, dismiss }: { toasts: ToastItem[]; dismiss: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            'flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg text-sm font-medium pointer-events-auto',
            t.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-dark text-white',
          ].join(' ')}
        >
          <span className="flex-1">{t.message}</span>
          <button type="button" onClick={() => dismiss(t.id)} className="text-white/60 hover:text-white shrink-0">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1 as const, label: 'Your Details' },
    { n: 2 as const, label: 'The Tree' },
    { n: 3 as const, label: 'Photos' },
  ]
  const lineWidth = step === 1 ? '0%' : step === 2 ? '50%' : '100%'

  return (
    <div className="sticky top-14 z-40 bg-white border-b border-gray-200 py-4">
      <div className="max-w-xl mx-auto px-6">
        <div className="relative flex items-start justify-between">
          {/* connector track */}
          <div className="absolute top-4 left-4 right-4 h-0.5 -translate-y-1/2 bg-gray-200">
            <div
              className="h-full bg-green-dark transition-all duration-500 ease-out"
              style={{ width: lineWidth }}
            />
          </div>

          {steps.map(({ n, label }) => {
            const done   = n < step
            const active = n === step
            return (
              <div key={n} className="relative z-10 flex flex-col items-center">
                <div
                  className={[
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                    'transition-all duration-300',
                    done   ? 'bg-green-dark text-white'
                    : active ? 'bg-gold text-green-dark ring-4 ring-gold/30 animate-pulse'
                             : 'bg-gray-200 text-gray-400',
                  ].join(' ')}
                >
                  {done ? <Check size={14} strokeWidth={3} /> : n}
                </div>
                <span
                  className={[
                    'mt-1.5 text-xs font-medium whitespace-nowrap',
                    done || active ? 'text-green-dark' : 'text-gray-400',
                  ].join(' ')}
                >
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  label,
  helper,
  error,
  required = false,
  children,
}: {
  label: string
  helper?: string
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-text mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {helper && !error && <p className="text-xs text-gray-400 mt-1.5">{helper}</p>}
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  )
}

// ─── Step 1 ───────────────────────────────────────────────────────────────────

interface Step1Props {
  firstName: string; setFirstName: (v: string) => void
  lastName:  string; setLastName:  (v: string) => void
  phone:     string; setPhone:     (v: string) => void
  email:     string; setEmail:     (v: string) => void
  address:   string; setAddress:   (v: string) => void
  errors: Record<string, string>
  clearError: (k: string) => void
  onNext: () => void
}

function Step1({
  firstName, setFirstName,
  lastName,  setLastName,
  phone,     setPhone,
  email,     setEmail,
  address,   setAddress,
  errors, clearError, onNext,
}: Step1Props) {
  return (
    <>
      <div className="mb-8">
        <h1 className="font-heading text-[28px] text-green-dark mb-2">Let&apos;s Start With You</h1>
        <p className="text-gray-400 text-base">We&apos;ll use this to follow up with your quote.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name" required error={errors.firstName}>
            <input
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => { setFirstName(e.target.value); clearError('firstName') }}
              className={inputCls(errors.firstName)}
              placeholder="Jane"
            />
          </Field>
          <Field label="Last Name" required error={errors.lastName}>
            <input
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => { setLastName(e.target.value); clearError('lastName') }}
              className={inputCls(errors.lastName)}
              placeholder="Smith"
            />
          </Field>
        </div>

        <Field
          label="Phone Number"
          required
          helper="We'll call or text you with your estimate."
          error={errors.phone}
        >
          <input
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); clearError('phone') }}
            className={inputCls(errors.phone)}
            placeholder="(770) 555-0000"
          />
        </Field>

        <Field label="Email Address" required error={errors.email}>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); clearError('email') }}
            className={inputCls(errors.email)}
            placeholder="you@example.com"
          />
        </Field>

        <Field
          label="Property Address"
          required
          helper="Where is the tree located?"
          error={errors.address}
        >
          <input
            type="text"
            autoComplete="street-address"
            value={address}
            onChange={(e) => { setAddress(e.target.value); clearError('address') }}
            className={inputCls(errors.address)}
            placeholder="123 Main St, Gainesville, GA"
          />
        </Field>

        <div className="pt-2">
          <button
            type="button"
            onClick={onNext}
            className="w-full bg-gold text-green-dark font-medium rounded-lg py-3 px-4
                       hover:bg-amber-600 active:bg-amber-700 transition-colors duration-150"
          >
            Next: Tell Us About the Tree →
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────

interface Step2Props {
  treeHeight:   TreeHeightValue; setTreeHeight:   (v: TreeHeightValue) => void
  treeLocation: string;          setTreeLocation: (v: string) => void
  leanDir:      LeanValue;       setLeanDir:      (v: LeanValue) => void
  proximity:    ProximityValue;  setProximity:    (v: ProximityValue) => void
  notes:        string;          setNotes:        (v: string) => void
  errors: Record<string, string>
  clearError: (k: string) => void
  onBack: () => void
  onNext: () => void
}

function Step2({
  treeHeight, setTreeHeight,
  treeLocation, setTreeLocation,
  leanDir, setLeanDir,
  proximity, setProximity,
  notes, setNotes,
  errors, clearError,
  onBack, onNext,
}: Step2Props) {
  return (
    <>
      <div className="mb-8">
        <h1 className="font-heading text-[28px] text-green-dark mb-2">Tell Us About the Tree</h1>
        <p className="text-gray-400 text-base">
          The more detail you give us, the more accurate your assessment.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 space-y-7">

        {/* Tree Height */}
        <Field label="How tall is the tree approximately?" required error={errors.treeHeight}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1">
            {HEIGHT_OPTIONS.map((opt) => {
              const selected = treeHeight === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setTreeHeight(opt.value); clearError('treeHeight') }}
                  className={[
                    'relative border rounded-xl p-4 text-center transition-all duration-150',
                    selected
                      ? 'border-2 border-green-dark bg-green-dark/5'
                      : 'border border-gray-200 bg-white hover:border-gray-400',
                  ].join(' ')}
                >
                  {selected && (
                    <span className="absolute top-2 right-2 w-4 h-4 bg-green-dark rounded-full flex items-center justify-center">
                      <Check size={10} className="text-white" strokeWidth={3} />
                    </span>
                  )}
                  <span className="text-2xl block mb-1">{opt.emoji}</span>
                  <span className={`block text-sm font-medium ${selected ? 'text-green-dark' : 'text-gray-text'}`}>
                    {opt.label}
                  </span>
                  <span className="block text-xs text-gray-400 mt-0.5">{opt.sub}</span>
                </button>
              )
            })}
          </div>
        </Field>

        {/* Location */}
        <Field label="Describe where the tree is on your property">
          <textarea
            value={treeLocation}
            onChange={(e) => setTreeLocation(e.target.value)}
            rows={3}
            className={inputCls() + ' resize-none'}
            placeholder="e.g. Front yard near the driveway, backyard along the fence line, side yard next to the house..."
          />
        </Field>

        {/* Lean */}
        <Field label="Does the tree have a noticeable lean?">
          <div className="flex flex-wrap gap-2 mt-1">
            {LEAN_OPTIONS.map((opt) => {
              const sel = leanDir === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLeanDir(opt.value)}
                  className={[
                    'rounded-full px-4 py-2 text-sm font-medium border transition-all duration-150',
                    sel
                      ? 'bg-green-dark text-white border-green-dark'
                      : 'bg-white text-gray-text border-gray-300 hover:border-gray-400',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </Field>

        {/* Proximity */}
        <Field label="How close is the tree to your home or other structures?">
          <div className="grid grid-cols-2 gap-3 mt-1">
            {PROXIMITY_OPTIONS.map((opt) => {
              const sel = proximity === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setProximity(opt.value)}
                  className={[
                    'relative border rounded-xl p-4 text-center transition-all duration-150',
                    sel
                      ? 'border-2 border-gold bg-gold/5'
                      : 'border border-gray-200 bg-white hover:border-gray-400',
                  ].join(' ')}
                >
                  {sel && (
                    <span className="absolute top-2 right-2 w-4 h-4 bg-gold rounded-full flex items-center justify-center">
                      <Check size={10} className="text-green-dark" strokeWidth={3} />
                    </span>
                  )}
                  <span className="text-2xl block mb-1">{opt.emoji}</span>
                  <span className={`block text-sm font-medium ${sel ? 'text-amber-800' : 'text-gray-text'}`}>
                    {opt.label}
                  </span>
                  <span className="block text-xs text-gray-400 mt-0.5">{opt.sub}</span>
                </button>
              )
            })}
          </div>

          {proximity === 'contact' && (
            <div
              className="mt-3 flex items-start gap-3 rounded-xl border border-[#F09595] bg-[#FCEBEB] px-4 py-3"
              style={{ borderLeftColor: '#E24B4A', borderLeftWidth: '3px' }}
            >
              <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">
                Trees in contact with structures are a priority situation. We recommend calling
                us directly at{' '}
                <a href="tel:+17702716072" className="font-semibold underline">
                  (770) 271-6072
                </a>{' '}
                for fastest response.
              </p>
            </div>
          )}
        </Field>

        {/* Notes */}
        <Field label="Anything else we should know? (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className={inputCls() + ' resize-none'}
            placeholder="Storm damage, dead limbs, previous work done, urgency level, access restrictions..."
          />
        </Field>

        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onBack}
            className="text-gray-400 hover:text-gray-600 text-sm font-medium
                       transition-colors duration-150 px-2 py-2"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={onNext}
            className="bg-gold text-green-dark font-medium rounded-lg py-3 px-6
                       hover:bg-amber-600 active:bg-amber-700 transition-colors duration-150"
          >
            Next: Upload Photos →
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  firstName, lastName, phone, address,
  treeHeight, photoCount,
  goToStep,
}: {
  firstName: string; lastName: string; phone: string; address: string
  treeHeight: TreeHeightValue; photoCount: number
  goToStep: (s: 1 | 2) => void
}) {
  const rows: { icon: React.ReactNode; label: string; step: 1 | 2 | null }[] = [
    { icon: <User    size={13} className="text-gray-400 shrink-0" />, label: `${firstName} ${lastName}`.trim(), step: 1 },
    { icon: <Phone   size={13} className="text-gray-400 shrink-0" />, label: phone,                             step: 1 },
    { icon: <MapPin  size={13} className="text-gray-400 shrink-0" />, label: address,                           step: 1 },
    { icon: <Leaf    size={13} className="text-gray-400 shrink-0" />, label: HEIGHT_LABELS[treeHeight],         step: 2 },
    { icon: <Camera  size={13} className="text-gray-400 shrink-0" />, label: `${photoCount} photo${photoCount !== 1 ? 's' : ''} uploaded`, step: null },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
        Submission Summary
      </p>
      <div className="space-y-2.5">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            {row.icon}
            <span className="text-sm text-gray-text flex-1 truncate">{row.label}</span>
            {row.step && (
              <button
                type="button"
                onClick={() => goToStep(row.step as 1 | 2)}
                className="flex items-center gap-1 text-xs text-green-mid hover:text-green-dark
                           transition-colors duration-150 shrink-0"
              >
                <Pencil size={10} />
                Edit
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SubmitPage() {
  const router = useRouter()

  // Navigation
  const [step, setStep]       = useState<1 | 2 | 3>(1)
  const [stepKey, setStepKey] = useState(0)
  const stepDirRef            = useRef<'fwd' | 'bwd'>('fwd')

  // Step 1
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [phone,     setPhone]     = useState('')
  const [email,     setEmail]     = useState('')
  const [address,   setAddress]   = useState('')

  // Step 2
  const [treeHeight,   setTreeHeight]   = useState<TreeHeightValue>('')
  const [treeLocation, setTreeLocation] = useState('')
  const [leanDir,      setLeanDir]      = useState<LeanValue>('none')
  const [proximity,    setProximity]    = useState<ProximityValue>('none')
  const [notes,        setNotes]        = useState('')

  // Step 3
  const [photos,        setPhotos]        = useState<PhotoItem[]>([])
  const [termsAccepted, setTermsAccepted] = useState(false)

  // Meta
  const [errors,     setErrors]     = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [toasts,     setToasts]     = useState<ToastItem[]>([])

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const photosRef      = useRef<PhotoItem[]>([])
  photosRef.current    = photos

  // ── sessionStorage restore ──────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const d = JSON.parse(raw) as Record<string, string>
      if (d.firstName)    setFirstName(d.firstName)
      if (d.lastName)     setLastName(d.lastName)
      if (d.phone)        setPhone(d.phone)
      if (d.email)        setEmail(d.email)
      if (d.address)      setAddress(d.address)
      if (d.treeHeight)   setTreeHeight(d.treeHeight as TreeHeightValue)
      if (d.treeLocation) setTreeLocation(d.treeLocation)
      if (d.leanDir)      setLeanDir(d.leanDir as LeanValue)
      if (d.proximity)    setProximity(d.proximity as ProximityValue)
      if (d.notes)        setNotes(d.notes)
    } catch { /* ignore */ }
  }, [])

  // ── sessionStorage persist ──────────────────────────────────────────────────
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        firstName, lastName, phone, email, address,
        treeHeight, treeLocation, leanDir, proximity, notes,
      }))
    } catch { /* ignore */ }
  }, [firstName, lastName, phone, email, address, treeHeight, treeLocation, leanDir, proximity, notes])

  // ── Toast ───────────────────────────────────────────────────────────────────
  const addToast = useCallback((message: string, type: ToastItem['type'] = 'error') => {
    const id = uuidv4()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  // ── Navigation ──────────────────────────────────────────────────────────────
  function clearError(key: string) {
    setErrors((prev) => { const n = { ...prev }; delete n[key]; return n })
  }

  function goToStep(newStep: 1 | 2 | 3) {
    stepDirRef.current = newStep > step ? 'fwd' : 'bwd'
    setStep(newStep)
    setStepKey((k) => k + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Validation ──────────────────────────────────────────────────────────────
  function validateStep1(): boolean {
    const e: Record<string, string> = {}
    if (!firstName.trim()) e.firstName = 'Required'
    if (!lastName.trim())  e.lastName  = 'Required'
    if (!phone.trim())     e.phone     = 'Required'
    if (!email.trim()) {
      e.email = 'Required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.email = 'Enter a valid email address'
    }
    if (!address.trim()) e.address = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function validateStep2(): boolean {
    if (!treeHeight) {
      setErrors({ treeHeight: 'Please select a tree height' })
      return false
    }
    setErrors({})
    return true
  }

  // ── Photo upload ────────────────────────────────────────────────────────────
  const processFiles = useCallback(async (files: File[]) => {
    const current = photosRef.current
    const slots   = MAX_PHOTOS - current.length

    const valid = files.filter((f) => {
      if (f.size > MAX_SIZE_BYTES) {
        addToast(`"${f.name}" is over 10MB and was skipped`)
        return false
      }
      return true
    })

    if (valid.length > slots) {
      addToast(`Only ${slots} slot${slots !== 1 ? 's' : ''} remaining — extra photos skipped`)
    }

    const adding: PhotoItem[] = valid.slice(0, Math.max(slots, 0)).map((file) => ({
      id:       uuidv4(),
      file,
      preview:  URL.createObjectURL(file),
      url:      null,
      progress: 0,
      error:    null,
    }))

    if (adding.length === 0) return

    setPhotos((prev) => [...prev, ...adding])

    for (const item of adding) {
      uploadFile(item.file, (pct) => {
        setPhotos((prev) => prev.map((p) => p.id === item.id ? { ...p, progress: pct } : p))
      })
        .then((url) => {
          setPhotos((prev) => prev.map((p) => p.id === item.id ? { ...p, url, progress: 100 } : p))
        })
        .catch(() => {
          setPhotos((prev) => prev.map((p) => p.id === item.id ? { ...p, error: 'Upload failed' } : p))
          addToast(`Failed to upload "${item.file.name}"`)
        })
    }
  }, [addToast])

  const handleDropRejected = useCallback((rejections: FileRejection[]) => {
    rejections.forEach((r) => {
      const code = r.errors[0]?.code
      if (code === 'file-too-large') {
        addToast(`"${r.file.name}" is over 10MB`)
      } else {
        addToast(`"${r.file.name}" — unsupported format`)
      }
    })
  }, [addToast])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop:         processFiles,
    onDropRejected: handleDropRejected,
    accept:         { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'] },
    maxSize:        MAX_SIZE_BYTES,
    disabled:       photos.length >= MAX_PHOTOS,
  })

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const item = prev.find((p) => p.id === id)
      if (item) URL.revokeObjectURL(item.preview)
      return prev.filter((p) => p.id !== id)
    })
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    const completed = photos.filter((p) => p.url !== null)
    const pending   = photos.filter((p) => p.url === null && p.error === null)

    if (photos.length === 0) {
      setErrors({ photos: 'Please upload at least one photo' })
      return
    }
    if (pending.length > 0) {
      setErrors({ photos: 'Please wait for all photos to finish uploading' })
      return
    }
    if (completed.length === 0) {
      setErrors({ photos: 'All uploads failed — please try again' })
      return
    }
    if (!termsAccepted) {
      setErrors({ terms: 'Please accept the terms to continue' })
      return
    }

    setSubmitting(true)
    setErrors({})

    try {
      // 1. Save submission
      const submitRes = await fetch('/api/submit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          firstName, lastName, phone, email, address,
          treeHeight, treeLocation,
          leanDirection: leanDir,
          proximity,     notes,
          photoUrls:     completed.map((p) => p.url as string),
        }),
      })
      if (!submitRes.ok) throw new Error('Failed to save your submission')
      const { id } = await submitRes.json() as { id: string }

      // 2. Run AI analysis
      const analyzeRes = await fetch('/api/analyze', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ submissionId: id }),
      })
      if (!analyzeRes.ok) throw new Error('AI analysis failed')

      // 3. Clear saved state and redirect
      sessionStorage.removeItem(STORAGE_KEY)
      router.push(`/results/${id}`)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  const completedCount = photos.filter((p) => p.url !== null).length

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <ToastList toasts={toasts} dismiss={dismissToast} />
      <StepIndicator step={step} />

      <div className="bg-off-white min-h-[calc(100vh-7rem)]">
        <div className="max-w-xl mx-auto px-4 py-8">
          <div
            key={stepKey}
            className={stepDirRef.current === 'fwd' ? 'animate-step-fwd' : 'animate-step-bwd'}
          >

            {/* ── STEP 1 ── */}
            {step === 1 && (
              <Step1
                firstName={firstName} setFirstName={setFirstName}
                lastName={lastName}   setLastName={setLastName}
                phone={phone}         setPhone={setPhone}
                email={email}         setEmail={setEmail}
                address={address}     setAddress={setAddress}
                errors={errors}       clearError={clearError}
                onNext={() => { if (validateStep1()) goToStep(2) }}
              />
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
              <Step2
                treeHeight={treeHeight}     setTreeHeight={setTreeHeight}
                treeLocation={treeLocation} setTreeLocation={setTreeLocation}
                leanDir={leanDir}           setLeanDir={setLeanDir}
                proximity={proximity}       setProximity={setProximity}
                notes={notes}               setNotes={setNotes}
                errors={errors}             clearError={clearError}
                onBack={() => goToStep(1)}
                onNext={() => { if (validateStep2()) goToStep(3) }}
              />
            )}

            {/* ── STEP 3 ── */}
            {step === 3 && (
              <>
                <div className="mb-8">
                  <h1 className="font-heading text-[28px] text-green-dark mb-2">
                    Upload Photos of the Tree
                  </h1>
                  <p className="text-gray-400 text-base">
                    Clear photos help us give you a more accurate estimate and better assess the job.
                  </p>
                </div>

                {/* One tree notice */}
                <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
                  <span className="text-amber-500 text-base leading-none mt-0.5">⚠</span>
                  <p className="text-[13px] text-amber-800 leading-snug">
                    <span className="font-semibold">One tree per submission.</span> All photos should be of the same tree so our AI can give you an accurate assessment.
                  </p>
                </div>

                {/* Tips card */}
                <div className="bg-[#EAF3DE] border border-[#C0DD97] rounded-xl p-4 mb-6">
                  <p className="text-[14px] font-bold text-[#27500A] mb-2">
                    For best results, include:
                  </p>
                  <ul className="space-y-1.5">
                    {[
                      'Full view of the tree from the ground',
                      'Close-up of the trunk base',
                      'Any areas of concern (dead limbs, damage, lean)',
                      'Surrounding structures if relevant',
                    ].map((tip) => (
                      <li key={tip} className="flex items-start gap-2 text-sm text-[#27500A]">
                        <Check size={13} className="text-[#4A8C1C] mt-0.5 shrink-0" strokeWidth={2.5} />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Upload card */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 mb-6">

                  {/* Dropzone */}
                  <div
                    {...getRootProps()}
                    className={[
                      'border-2 rounded-2xl py-10 px-6 text-center',
                      'transition-all duration-200',
                      photos.length >= MAX_PHOTOS
                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                        : isDragActive
                        ? 'border-solid border-gold bg-gold-light cursor-copy'
                        : 'border-dashed border-gold hover:bg-gold-light hover:border-solid cursor-pointer',
                    ].join(' ')}
                  >
                    <input {...getInputProps()} />
                    <Camera
                      size={40}
                      className={`mx-auto mb-3 ${isDragActive ? 'text-amber-600' : 'text-gold'}`}
                    />
                    <p className="text-base font-bold text-gray-text mb-1">
                      {photos.length >= MAX_PHOTOS
                        ? 'Maximum photos reached'
                        : 'Tap to take a photo or upload'}
                    </p>
                    <p className="text-sm text-gray-400">Or drag and drop your photos here</p>
                    <p className="text-xs text-gray-300 mt-2">
                      JPG, PNG, HEIC · Max 10MB each · Up to {MAX_PHOTOS} photos
                    </p>
                  </div>

                  {/* Hidden camera input for mobile */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) processFiles(Array.from(e.target.files))
                      e.target.value = ''
                    }}
                  />
                  <div className="text-center mt-3">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={photos.length >= MAX_PHOTOS}
                      className="text-sm text-green-mid hover:text-green-dark font-medium
                                 underline underline-offset-2 transition-colors duration-150
                                 disabled:opacity-40 disabled:no-underline"
                    >
                      Open camera directly
                    </button>
                  </div>

                  {/* Thumbnails */}
                  {photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 mt-5">
                      {photos.map((photo) => (
                        <div key={photo.id} className="relative aspect-square">
                          <Image
                            src={photo.preview}
                            alt="Tree photo preview"
                            fill
                            className="object-cover rounded-xl"
                            sizes="120px"
                          />

                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => removePhoto(photo.id)}
                            className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50
                                       hover:bg-red-500 rounded-full flex items-center
                                       justify-center transition-colors duration-150 z-10"
                          >
                            <X size={12} className="text-white" strokeWidth={2.5} />
                          </button>

                          {/* Status overlay */}
                          {photo.error ? (
                            <div className="absolute inset-x-0 bottom-0 bg-red-500/80 rounded-b-xl px-2 py-1">
                              <p className="text-white text-[10px] text-center">Failed</p>
                            </div>
                          ) : photo.url ? (
                            <div className="absolute bottom-1.5 right-1.5 w-5 h-5 bg-green-dark
                                            rounded-full flex items-center justify-center z-10">
                              <Check size={10} className="text-white" strokeWidth={3} />
                            </div>
                          ) : (
                            <div className="absolute inset-x-0 bottom-0 bg-black/40 rounded-b-xl px-2 py-1.5">
                              <div className="w-full bg-white/30 rounded-full h-1">
                                <div
                                  className="h-full bg-white rounded-full transition-all duration-100"
                                  style={{ width: `${photo.progress}%` }}
                                />
                              </div>
                              <p className="text-white text-[10px] text-center mt-0.5">
                                {photo.progress}%
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-center text-sm text-gray-400 mt-4">
                    {completedCount} of {MAX_PHOTOS} photos added
                  </p>

                  {errors.photos && (
                    <p className="text-sm text-red-500 text-center mt-2">{errors.photos}</p>
                  )}
                </div>

                {/* Summary */}
                <SummaryCard
                  firstName={firstName}   lastName={lastName}
                  phone={phone}           address={address}
                  treeHeight={treeHeight} photoCount={completedCount}
                  goToStep={(s) => goToStep(s)}
                />

                {/* Terms */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => {
                        setTermsAccepted(e.target.checked)
                        if (e.target.checked) clearError('terms')
                      }}
                      className="mt-0.5 w-4 h-4 accent-green-dark shrink-0"
                    />
                    <span className="text-sm text-gray-400 leading-relaxed">
                      I understand this submission is for a free quote estimate. Gordon Pro Tree
                      Service will contact me to discuss the job.
                    </span>
                  </label>
                  {errors.terms && (
                    <p className="text-xs text-red-500 mt-2 ml-7">{errors.terms}</p>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex justify-between items-center pb-8">
                  <button
                    type="button"
                    onClick={() => goToStep(2)}
                    disabled={submitting}
                    className="text-gray-400 hover:text-gray-600 text-sm font-medium
                               transition-colors duration-150 px-2 py-3"
                  >
                    ← Back
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className={[
                      'flex items-center gap-2 bg-gold text-green-dark font-medium',
                      'rounded-lg py-4 px-8 text-base transition-colors duration-150',
                      'hover:bg-amber-600 active:bg-amber-700',
                      'disabled:opacity-60 disabled:cursor-not-allowed',
                    ].join(' ')}
                  >
                    {submitting ? (
                      <>
                        <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path  className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Analyzing your tree…
                      </>
                    ) : (
                      'Submit for Free Quote'
                    )}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  )
}
