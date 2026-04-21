'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import Image from 'next/image'
import { v4 as uuidv4 } from 'uuid'
import imageCompression from 'browser-image-compression'
import {
  Check, X, Camera, TreePine, Scissors, Circle, Zap, Layers, HelpCircle,
  Calendar, Clock, AlertTriangle, Sparkles, Cpu, Loader2,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type PhotoItem = {
  id: string
  file: File
  preview: string
  url: string | null
  progress: number
  phase: 'compressing' | 'uploading' | 'done' | 'error'
  error: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_PHOTOS = 5
const MAX_SIZE_BYTES = 10 * 1024 * 1024

const ANALYZE_MESSAGES = [
  'Analyzing your photos with AI…',
  'Identifying tree species…',
  'Checking for hazard flags…',
  'Preparing your assessment…',
  'Almost ready…',
]

const STEP_LABELS = [
  'What do you need?',
  'About the job',
  'Your contact info',
  'Add photos',
]

const SERVICES = [
  {
    id: 'Tree Removal',
    Icon: TreePine,
    label: 'Tree Removal',
    desc: 'Remove a tree from your property',
  },
  {
    id: 'Tree Trimming & Pruning',
    Icon: Scissors,
    label: 'Tree Trimming & Pruning',
    desc: "Shape, thin, or reduce a tree's canopy",
  },
  {
    id: 'Stump Grinding',
    Icon: Circle,
    label: 'Stump Grinding',
    desc: 'Remove a stump left from a previous removal',
  },
  {
    id: 'Storm Damage / Emergency',
    Icon: Zap,
    label: 'Storm Damage / Emergency',
    desc: 'Urgent help after storm damage or a fallen tree',
  },
  {
    id: 'Land Clearing',
    Icon: Layers,
    label: 'Land Clearing',
    desc: 'Clear trees and brush from a larger area',
  },
  {
    id: 'Not Sure — I Need Advice',
    Icon: HelpCircle,
    label: 'Not Sure — I Need Advice',
    desc: "Not sure what service I need, I'd like a recommendation",
  },
]

const URGENCY_OPTIONS = [
  {
    id: 'Routine',
    Icon: Calendar,
    label: 'Routine',
    desc: 'No rush — planning ahead',
    color: '#1C3A2B',
    borderClass: 'border-[#1C3A2B]',
  },
  {
    id: 'Soon',
    Icon: Clock,
    label: 'Soon',
    desc: 'Within a few weeks',
    color: '#C8922A',
    borderClass: 'border-[#C8922A]',
  },
  {
    id: 'Emergency',
    Icon: AlertTriangle,
    label: 'Emergency',
    desc: 'Urgent — needs attention now',
    color: '#DC2626',
    borderClass: 'border-red-600',
  },
]

// ─── Upload Helper ────────────────────────────────────────────────────────────

async function uploadFile(
  file: File,
  {
    onPhase,
    onProgress,
  }: {
    onPhase: (p: 'compressing' | 'uploading') => void
    onProgress: (n: number) => void
  }
): Promise<string> {
  if (!navigator.onLine) throw new Error('No internet connection — uploads paused')

  onPhase('compressing')
  const compressed = await imageCompression(file, {
    maxSizeMB: 1.5,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    onProgress,
  })

  onPhase('uploading')

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
        try {
          msg = (JSON.parse(xhr.responseText) as { error?: string }).error ?? msg
        } catch { /* empty */ }
        reject(new Error(msg))
      }
    })
    xhr.addEventListener('error', () => reject(new Error('Network error — check connection')))
    xhr.open('POST', '/api/upload')
    xhr.send(fd)
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressIndicator({ step }: { step: 1 | 2 | 3 | 4 }) {
  const pct = ((step - 1) / 3) * 100

  return (
    <div className="sticky top-14 z-40 bg-[#F5F2ED] border-b border-gray-100 py-5 px-4">
      <div className="max-w-lg mx-auto">
        <div className="relative flex items-start justify-between">
          {/* Track */}
          <div
            className="absolute h-[1.5px] bg-gray-200"
            style={{ top: 18, left: 18, right: 18 }}
          >
            <div
              className="h-full bg-[#1C3A2B] transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>

          {([1, 2, 3, 4] as const).map((n) => {
            const done   = n < step
            const active = n === step
            return (
              <div key={n} className="relative z-10 flex flex-col items-center" style={{ width: 36 }}>
                <div
                  className={[
                    'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300',
                    done
                      ? 'bg-[#1C3A2B]'
                      : active
                      ? 'bg-[#C8922A]'
                      : 'bg-white border-2 border-gray-300',
                  ].join(' ')}
                >
                  {done ? (
                    <Check size={14} className="text-white" strokeWidth={3} />
                  ) : (
                    <span className={`text-sm font-bold ${active ? 'text-white' : 'text-gray-400'}`}>
                      {n}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-center font-body text-[12px] text-gray-400 mt-3">
          {STEP_LABELS[step - 1]}
        </p>
      </div>
    </div>
  )
}

function ServiceCard({
  service,
  selected,
  onSelect,
}: {
  service: (typeof SERVICES)[0]
  selected: boolean
  onSelect: () => void
}) {
  const { Icon, label, desc } = service
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-150',
        selected
          ? 'border-2 border-[#1C3A2B] bg-[#F0F7F3]'
          : 'border border-[#E5E7EB] bg-white hover:border-gray-400',
      ].join(' ')}
    >
      <div
        className="flex items-center justify-center rounded-full shrink-0 transition-colors duration-150"
        style={{
          width: 48,
          height: 48,
          background: selected ? '#1C3A2B' : '#EAF3DE',
        }}
      >
        <Icon size={22} color={selected ? '#fff' : '#1C3A2B'} />
      </div>
      <div className="min-w-0">
        <p className={`font-body font-bold text-[15px] ${selected ? 'text-[#1C3A2B]' : 'text-[#4A4A4A]'}`}>
          {label}
        </p>
        <p className="font-body text-[13px] text-gray-400 leading-snug mt-0.5">{desc}</p>
      </div>
    </button>
  )
}

function Pill({
  label,
  selected,
  onSelect,
}: {
  label: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'px-4 py-2.5 rounded-full border font-body text-[14px] min-h-[44px] transition-all duration-150',
        selected
          ? 'bg-[#1C3A2B] text-white border-[#1C3A2B]'
          : 'bg-white text-[#4A4A4A] border-gray-300 hover:border-gray-400',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

function UrgencyCard({
  opt,
  selected,
  onSelect,
}: {
  opt: (typeof URGENCY_OPTIONS)[0]
  selected: boolean
  onSelect: () => void
}) {
  const { Icon, label, desc, color, borderClass } = opt
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'flex-1 flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-center min-h-[44px]',
        'transition-all duration-150',
        selected
          ? `border-2 ${borderClass} bg-white`
          : 'border border-[#E5E7EB] bg-white hover:border-gray-400',
      ].join(' ')}
    >
      <Icon size={20} color={color} />
      <p className={`font-body font-bold text-[13px] ${selected ? 'text-[#1C3A2B]' : 'text-[#4A4A4A]'}`}>
        {label}
      </p>
      <p className="font-body text-[11px] text-gray-400 leading-snug">{desc}</p>
    </button>
  )
}

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <label className="block font-body text-[14px] font-medium text-[#4A4A4A] mb-1.5">
      {children}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  )
}

function FieldHelper({ children }: { children: React.ReactNode }) {
  return <p className="font-body text-[12px] text-gray-400 mt-1.5">{children}</p>
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="font-body text-[12px] text-red-500 mt-1.5">{msg}</p>
}

function inputCls(hasError?: boolean) {
  return [
    'w-full rounded-lg border px-4 text-[16px] text-[#4A4A4A] bg-white h-12',
    'outline-none transition-colors duration-150',
    'focus:border-[#1C3A2B] focus:ring-2 focus:ring-[#1C3A2B]/20',
    hasError ? 'border-red-400' : 'border-gray-300',
  ].join(' ')
}

function AILoadingOverlay() {
  const [msgIdx, setMsgIdx] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const msgTimer = setInterval(
      () => setMsgIdx((i) => (i + 1) % ANALYZE_MESSAGES.length),
      2500
    )
    const progTimer = setInterval(
      () => setProgress((p) => Math.min(p + Math.random() * 8, 92)),
      400
    )
    return () => {
      clearInterval(msgTimer)
      clearInterval(progTimer)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1C3A2B] px-8">
      <div className="relative w-36 h-36 mb-8">
        <Image
          src="/images/fieldapp.png"
          alt="Gordon Pro"
          fill
          className="object-contain"
          sizes="144px"
        />
      </div>
      <Loader2 className="text-[#C8922A] animate-spin mb-6" size={32} />
      <p className="font-body text-white text-base text-center mb-8 min-h-[1.5rem] transition-all duration-300">
        {ANALYZE_MESSAGES[msgIdx]}
      </p>
      <div className="w-full max-w-[240px] h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#C8922A] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

function SimpleSpinner() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-8">
      <div className="relative w-36 h-36 mb-6">
        <Image
          src="/images/fieldapp.png"
          alt="Gordon Pro"
          fill
          className="object-contain"
          sizes="144px"
        />
      </div>
      <Loader2 className="text-[#1C3A2B] animate-spin mb-4" size={28} />
      <p className="font-body text-[#4A4A4A] text-[15px] text-center">
        Submitting your request…
      </p>
    </div>
  )
}

function PhotoThumb({
  photo,
  onRemove,
}: {
  photo: PhotoItem
  onRemove: () => void
}) {
  return (
    <div className="relative aspect-square">
      <Image
        src={photo.preview}
        alt="Upload preview"
        fill
        className="object-cover rounded-xl"
        sizes="120px"
      />
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 hover:bg-red-500 rounded-full
                   flex items-center justify-center transition-colors duration-150 z-10"
      >
        <X size={12} className="text-white" strokeWidth={2.5} />
      </button>

      {photo.phase === 'error' ? (
        <div className="absolute inset-x-0 bottom-0 bg-red-500/80 rounded-b-xl px-2 py-1">
          <p className="text-white text-[10px] text-center">Failed</p>
        </div>
      ) : photo.phase === 'done' ? (
        <div className="absolute bottom-1.5 right-1.5 w-5 h-5 bg-[#1C3A2B] rounded-full flex items-center justify-center z-10">
          <Check size={10} className="text-white" strokeWidth={3} />
        </div>
      ) : (
        <div className="absolute inset-x-0 bottom-0 bg-black/50 rounded-b-xl px-2 py-1.5">
          <div className="w-full bg-white/30 rounded-full h-1">
            <div
              className="h-full bg-[#C8922A] rounded-full transition-all duration-100"
              style={{ width: `${photo.progress}%` }}
            />
          </div>
          <p className="text-white text-[10px] text-center mt-0.5">
            {photo.phase === 'compressing' ? 'Compressing…' : `${photo.progress}%`}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SubmitPage() {
  const router = useRouter()

  const [step, setStep]       = useState<1 | 2 | 3 | 4>(1)
  const [stepKey, setStepKey] = useState(0)
  const stepDirRef            = useRef<'fwd' | 'bwd'>('fwd')

  // Step 1
  const [serviceTypes, setServiceTypes] = useState<string[]>([])

  // Step 2
  const [treeCount,       setTreeCount]       = useState('')
  const [treeCountNA,     setTreeCountNA]     = useState(false)
  const [urgency,         setUrgency]         = useState('')
  const [propertyAddress, setPropertyAddress] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')

  // Step 3
  const [customerName,   setCustomerName]   = useState('')
  const [customerPhone,  setCustomerPhone]  = useState('')
  const [customerEmail,  setCustomerEmail]  = useState('')
  const [bestTimeToCall, setBestTimeToCall] = useState('')

  // Step 4
  const [photos,    setPhotos]    = useState<PhotoItem[]>([])
  const photosRef                 = useRef<PhotoItem[]>([])
  photosRef.current               = photos
  const cameraInputRef            = useRef<HTMLInputElement>(null)

  // UI state
  const [errors,     setErrors]     = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [withAI,     setWithAI]     = useState(false)

  // ── Navigation ──────────────────────────────────────────────────────────────

  function goToStep(s: 1 | 2 | 3 | 4) {
    stepDirRef.current = s > step ? 'fwd' : 'bwd'
    setStep(s)
    setStepKey((k) => k + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function clearError(k: string) {
    setErrors((prev) => {
      const n = { ...prev }
      delete n[k]
      return n
    })
  }

  // ── Validation ──────────────────────────────────────────────────────────────

  function validateStep2(): boolean {
    const e: Record<string, string> = {}
    if (!urgency) e.urgency = 'Please select urgency'
    if (!propertyAddress.trim()) e.propertyAddress = 'Property address is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function validateStep3(): boolean {
    const e: Record<string, string> = {}
    if (!customerName.trim()) e.customerName = 'Name is required'
    if (!customerPhone.trim()) e.customerPhone = 'Phone number is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Photo upload ────────────────────────────────────────────────────────────

  const processFiles = useCallback(async (files: File[]) => {
    const current = photosRef.current
    const slots   = MAX_PHOTOS - current.length
    const valid   = files.filter((f) => f.size <= MAX_SIZE_BYTES)
    const adding: PhotoItem[] = valid.slice(0, Math.max(slots, 0)).map((file) => ({
      id:       uuidv4(),
      file,
      preview:  URL.createObjectURL(file),
      url:      null,
      progress: 0,
      phase:    'compressing' as const,
      error:    null,
    }))
    if (adding.length === 0) return
    setPhotos((prev) => [...prev, ...adding])
    for (const item of adding) {
      uploadFile(item.file, {
        onPhase:    (phase)    => setPhotos((prev) => prev.map((p) => p.id === item.id ? { ...p, phase }    : p)),
        onProgress: (progress) => setPhotos((prev) => prev.map((p) => p.id === item.id ? { ...p, progress } : p)),
      })
        .then((url) =>
          setPhotos((prev) =>
            prev.map((p) => p.id === item.id ? { ...p, url, progress: 100, phase: 'done' } : p)
          )
        )
        .catch(() =>
          setPhotos((prev) =>
            prev.map((p) => p.id === item.id ? { ...p, phase: 'error', error: 'Upload failed' } : p)
          )
        )
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop:   processFiles,
    accept:   { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'] },
    maxSize:  MAX_SIZE_BYTES,
    disabled: photos.length >= MAX_PHOTOS,
  })

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const item = prev.find((p) => p.id === id)
      if (item) URL.revokeObjectURL(item.preview)
      return prev.filter((p) => p.id !== id)
    })
  }

  const completedPhotos = photos.filter((p) => p.phase === 'done')
  const pendingPhotos   = photos.filter((p) => p.phase === 'compressing' || p.phase === 'uploading')
  const hasPhotos       = completedPhotos.length > 0

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (pendingPhotos.length > 0) {
      setErrors({ photos: 'Please wait for all photos to finish uploading' })
      return
    }

    setSubmitting(true)
    setWithAI(hasPhotos)
    setErrors({})

    try {
      const res = await fetch('/api/submit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerEmail,
          propertyAddress,
          serviceType: serviceTypes.join(', '),
          treeCount: treeCountNA ? 'N/A' : treeCount,
          urgency,
          bestTimeToCall,
          additionalNotes,
          photoUrls: completedPhotos.map((p) => p.url as string),
          source:    'customer',
        }),
      })
      if (!res.ok) throw new Error('Failed to save your submission')
      const { id } = (await res.json()) as { id: string }

      if (hasPhotos) {
        const analyzeRes = await fetch('/api/analyze', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ submissionId: id }),
        })
        if (!analyzeRes.ok) throw new Error('AI analysis failed')
      }

      router.push(`/results/customer/${id}`)
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      })
      setSubmitting(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (submitting) {
    return withAI ? <AILoadingOverlay /> : <SimpleSpinner />
  }

  return (
    <>
      <ProgressIndicator step={step} />

      <div className="max-w-lg mx-auto px-4 py-8 pb-16">
        <div
          key={stepKey}
          className={stepDirRef.current === 'fwd' ? 'animate-step-fwd' : 'animate-step-bwd'}
        >

          {/* ─── STEP 1 — What do you need? ─── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-heading text-[26px] text-[#1C3A2B]">
                  What can we help you with?
                </h1>
                <p className="font-body text-[14px] text-gray-400 mt-1">
                  Select all services that apply.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {SERVICES.map((s) => (
                  <ServiceCard
                    key={s.id}
                    service={s}
                    selected={serviceTypes.includes(s.id)}
                    onSelect={() =>
                      setServiceTypes((prev) =>
                        prev.includes(s.id)
                          ? prev.filter((x) => x !== s.id)
                          : [...prev, s.id]
                      )
                    }
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => { if (serviceTypes.length > 0) goToStep(2) }}
                disabled={serviceTypes.length === 0}
                className={[
                  'w-full bg-[#1C3A2B] text-white font-heading text-[16px] uppercase tracking-wide',
                  'py-4 rounded-xl transition-all duration-150',
                  serviceTypes.length > 0
                    ? 'opacity-100 hover:bg-[#2D5A40] active:bg-[#16301f]'
                    : 'opacity-40 cursor-not-allowed',
                ].join(' ')}
              >
                Next — Tell Us About the Job
              </button>
            </div>
          )}

          {/* ─── STEP 2 — Tell us about the job ─── */}
          {step === 2 && (
            <div className="space-y-7">
              <div>
                <h1 className="font-heading text-[26px] text-[#1C3A2B]">Tell us about the job</h1>
                <p className="font-body text-[14px] text-gray-400 mt-1">
                  A few quick details help us prepare before we call.
                </p>
              </div>

              {/* Tree count */}
              <div>
                <FieldLabel>How many trees?</FieldLabel>
                <FieldHelper>Count only the trees that need service</FieldHelper>
                <div className="flex gap-2 flex-wrap mt-2">
                  {['1', '2–3', '4–5', '6+'].map((opt) => (
                    <Pill
                      key={opt}
                      label={opt}
                      selected={!treeCountNA && treeCount === opt}
                      onSelect={() => { setTreeCount(opt); setTreeCountNA(false) }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => { setTreeCountNA(true); setTreeCount('') }}
                  className={[
                    'font-body text-[13px] mt-2 underline underline-offset-2 transition-colors duration-150',
                    treeCountNA ? 'text-[#1C3A2B] font-medium' : 'text-gray-400 hover:text-gray-600',
                  ].join(' ')}
                >
                  Doesn&apos;t apply to my request
                </button>
              </div>

              {/* Urgency */}
              <div>
                <FieldLabel required>How urgent is this?</FieldLabel>
                <div className="flex gap-2 mt-2">
                  {URGENCY_OPTIONS.map((opt) => (
                    <UrgencyCard
                      key={opt.id}
                      opt={opt}
                      selected={urgency === opt.id}
                      onSelect={() => { setUrgency(opt.id); clearError('urgency') }}
                    />
                  ))}
                </div>
                <FieldError msg={errors.urgency} />
              </div>

              {/* Property address */}
              <div>
                <FieldLabel required>Property address</FieldLabel>
                <input
                  type="text"
                  value={propertyAddress}
                  onChange={(e) => { setPropertyAddress(e.target.value); clearError('propertyAddress') }}
                  className={inputCls(!!errors.propertyAddress)}
                  placeholder="Street address, city, state"
                  autoComplete="street-address"
                />
                <FieldError msg={errors.propertyAddress} />
              </div>

              {/* Additional notes */}
              <div>
                <FieldLabel>Anything else we should know?</FieldLabel>
                <textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  rows={3}
                  className={[
                    'w-full rounded-lg border border-gray-300 px-4 py-3 text-[16px] text-[#4A4A4A] bg-white resize-none',
                    'outline-none transition-colors duration-150',
                    'focus:border-[#1C3A2B] focus:ring-2 focus:ring-[#1C3A2B]/20',
                  ].join(' ')}
                  placeholder="Gate codes, access instructions, specific concerns, or any other details..."
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => goToStep(1)}
                  className="font-body text-[14px] text-gray-400 hover:text-gray-600 px-2 py-3 transition-colors duration-150"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => { if (validateStep2()) goToStep(3) }}
                  className="bg-[#1C3A2B] text-white font-heading text-[16px] uppercase tracking-wide
                             py-4 px-8 rounded-xl hover:bg-[#2D5A40] active:bg-[#16301f] transition-colors duration-150"
                >
                  Next — Your Contact Info
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 3 — Your contact info ─── */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-heading text-[26px] text-[#1C3A2B]">How can we reach you?</h1>
                <p className="font-body text-[14px] text-gray-400 mt-1">
                  We&apos;ll call to confirm details and get you a quote — usually within a few hours.
                </p>
              </div>

              {/* Full name */}
              <div>
                <FieldLabel required>Full name</FieldLabel>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => { setCustomerName(e.target.value); clearError('customerName') }}
                  className={inputCls(!!errors.customerName)}
                  placeholder="Jane Smith"
                  autoComplete="name"
                />
                <FieldError msg={errors.customerName} />
              </div>

              {/* Phone */}
              <div>
                <FieldLabel required>Phone number</FieldLabel>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => { setCustomerPhone(e.target.value); clearError('customerPhone') }}
                  className={inputCls(!!errors.customerPhone)}
                  placeholder="(770) 555-0000"
                  autoComplete="tel"
                />
                <FieldHelper>We&apos;ll call this number to discuss your quote</FieldHelper>
                <FieldError msg={errors.customerPhone} />
              </div>

              {/* Email */}
              <div>
                <FieldLabel>Email address</FieldLabel>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className={inputCls()}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                <FieldHelper>Optional — for confirmation and updates</FieldHelper>
              </div>

              {/* Best time to call */}
              <div>
                <FieldLabel>Best time to reach you</FieldLabel>
                <div className="flex gap-2 flex-wrap mt-1">
                  {['Morning', 'Afternoon', 'Evening', 'Anytime'].map((opt) => (
                    <Pill
                      key={opt}
                      label={opt}
                      selected={bestTimeToCall === opt}
                      onSelect={() => setBestTimeToCall(bestTimeToCall === opt ? '' : opt)}
                    />
                  ))}
                </div>
              </div>

              {/* Terms */}
              <p className="font-body text-[12px] text-gray-400 leading-relaxed">
                By submitting, you agree that Gordon Pro Tree Service may contact you about your
                service request. Your information is not shared with third parties.
              </p>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => goToStep(2)}
                  className="font-body text-[14px] text-gray-400 hover:text-gray-600 px-2 py-3 transition-colors duration-150"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => { if (validateStep3()) goToStep(4) }}
                  className="bg-[#1C3A2B] text-white font-heading text-[16px] uppercase tracking-wide
                             py-4 px-8 rounded-xl hover:bg-[#2D5A40] active:bg-[#16301f] transition-colors duration-150"
                >
                  Next — Add Photos
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 4 — Add photos (optional) ─── */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="font-heading text-[26px] text-[#1C3A2B]">
                  Add photos for a faster quote
                </h1>
                <p className="font-body text-[14px] text-gray-400 mt-1 max-w-sm mx-auto">
                  Optional but helpful — photos let us give you a more accurate quote before we even call.
                </p>
              </div>

              {/* AI benefit callout */}
              <div
                className="flex items-start gap-3 p-4 rounded-xl"
                style={{ background: '#EAF3DE', border: '1px solid #C0DD97' }}
              >
                <Sparkles size={20} color="#1C3A2B" className="shrink-0 mt-0.5" />
                <p className="font-body text-[13px] text-[#27500A] leading-relaxed">
                  With photos, our AI analyzes your tree and gives you an instant species ID,
                  hazard flags, and site assessment.
                </p>
              </div>

              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={[
                  'border-2 rounded-2xl py-10 px-6 text-center transition-all duration-200',
                  photos.length >= MAX_PHOTOS
                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                    : isDragActive
                    ? 'border-solid border-[#C8922A] bg-[#FAEEDA] cursor-copy'
                    : 'border-dashed border-[#C8922A] hover:bg-[#FAEEDA] hover:border-solid cursor-pointer',
                ].join(' ')}
              >
                <input {...getInputProps()} />
                <Camera
                  size={40}
                  className={`mx-auto mb-3 ${isDragActive ? 'text-amber-600' : 'text-[#C8922A]'}`}
                />
                <p className="font-body text-base font-bold text-[#4A4A4A] mb-1">
                  {photos.length >= MAX_PHOTOS
                    ? 'Maximum photos reached'
                    : 'Tap to upload photos'}
                </p>
                <p className="font-body text-sm text-gray-400">Or drag and drop here</p>
                <p className="font-body text-xs text-gray-300 mt-2">
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

              {/* Thumbnails */}
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {photos.map((photo) => (
                    <PhotoThumb
                      key={photo.id}
                      photo={photo}
                      onRemove={() => removePhoto(photo.id)}
                    />
                  ))}
                </div>
              )}

              {errors.photos && (
                <p className="font-body text-sm text-red-500 text-center">{errors.photos}</p>
              )}

              <p className="font-body text-[13px] text-gray-400 text-center">
                No photos? No problem.
              </p>

              {errors.submit && (
                <p className="font-body text-sm text-red-500 text-center">{errors.submit}</p>
              )}

              {/* Submit button */}
              <button
                type="button"
                onClick={handleSubmit}
                className={[
                  'w-full text-white font-heading text-[16px] uppercase tracking-wide py-4 rounded-xl',
                  'flex items-center justify-center gap-2 transition-colors duration-150',
                  hasPhotos
                    ? 'bg-[#C8922A] hover:bg-amber-600 active:bg-amber-700'
                    : 'bg-[#1C3A2B] hover:bg-[#2D5A40] active:bg-[#16301f]',
                ].join(' ')}
              >
                {hasPhotos ? (
                  <>
                    <Cpu size={18} />
                    Submit &amp; Get AI Assessment
                  </>
                ) : (
                  "Submit Request — We'll Be in Touch Soon"
                )}
              </button>

              <button
                type="button"
                onClick={() => goToStep(3)}
                className="w-full font-body text-[14px] text-gray-400 hover:text-gray-600 py-2 transition-colors duration-150"
              >
                ← Back
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
