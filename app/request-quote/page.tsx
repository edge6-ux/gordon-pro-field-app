'use client'

import { useCallback, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import Image from 'next/image'
import Link from 'next/link'
import { v4 as uuidv4 } from 'uuid'
import imageCompression from 'browser-image-compression'
import {
  Check, X, Camera, CheckCircle, Loader2, ArrowLeft, Copy,
  TreePine, Scissors, Circle, Zap, Layers, HelpCircle, PenLine,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type PhotoItem = {
  id: string
  file: File
  preview: string
  url: string | null
  progress: number
  phase: 'compressing' | 'uploading' | 'done' | 'error'
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_PHOTOS = 5
const MAX_SIZE_BYTES = 10 * 1024 * 1024

// ─── Services ─────────────────────────────────────────────────────────────────

const SERVICES = [
  { id: 'Tree Removal',             Icon: TreePine,   label: 'Tree Removal',             desc: 'Remove a tree from your property' },
  { id: 'Tree Trimming & Pruning',  Icon: Scissors,   label: 'Tree Trimming & Pruning',  desc: "Shape, thin, or reduce a tree's canopy" },
  { id: 'Stump Grinding',           Icon: Circle,     label: 'Stump Grinding',           desc: 'Remove a stump left from a previous removal' },
  { id: 'Storm Damage / Emergency', Icon: Zap,        label: 'Storm Damage / Emergency', desc: 'Urgent help after storm damage or a fallen tree' },
  { id: 'Land Clearing',            Icon: Layers,     label: 'Land Clearing',            desc: 'Clear trees and brush from a larger area' },
  { id: 'Not Sure — I Need Advice', Icon: HelpCircle, label: 'Not Sure — I Need Advice', desc: "Not sure what I need — I'd like a recommendation" },
  { id: 'Other',                    Icon: PenLine,    label: 'Other',                    desc: "Something not listed — I'll describe it below" },
] as const

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

async function uploadFile(
  file: File,
  { onPhase, onProgress }: { onPhase: (p: 'compressing' | 'uploading') => void; onProgress: (n: number) => void }
): Promise<string> {
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
      } else {
        reject(new Error(`Upload failed (${xhr.status})`))
      }
    })
    xhr.addEventListener('error', () => reject(new Error('Network error')))
    xhr.open('POST', '/api/upload')
    xhr.send(fd)
  })
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

function FieldHelper({ children }: { children: React.ReactNode }) {
  return <p className="font-body text-[12px] text-gray-400 mt-1.5">{children}</p>
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

function Pill({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
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

// ─── Service Card ─────────────────────────────────────────────────────────────

function ServiceCard({
  service,
  selected,
  onSelect,
}: {
  service: (typeof SERVICES)[number]
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
        style={{ width: 48, height: 48, background: selected ? '#1C3A2B' : '#EAF3DE' }}
      >
        <Icon size={22} color={selected ? '#fff' : '#1C3A2B'} />
      </div>
      <div className="min-w-0">
        <p className={`font-body font-bold text-[15px] ${selected ? 'text-[#1C3A2B]' : 'text-[#4A4A4A]'}`}>
          {label}
        </p>
        <p className="font-body text-[13px] text-gray-400 leading-snug mt-0.5">{desc}</p>
      </div>
      <div
        className={[
          'ml-auto shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150',
          selected ? 'bg-[#1C3A2B] border-[#1C3A2B]' : 'border-gray-300',
        ].join(' ')}
      >
        {selected && <Check size={10} className="text-white" strokeWidth={3} />}
      </div>
    </button>
  )
}

// ─── Photo Thumb ──────────────────────────────────────────────────────────────

function PhotoThumb({ photo, onRemove }: { photo: PhotoItem; onRemove: () => void }) {
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

// ─── Success Screen ───────────────────────────────────────────────────────────

function SuccessScreen({ referenceCode }: { referenceCode: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referenceCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12 space-y-5">
      <div className="bg-white rounded-2xl border border-gray-200 px-6 py-10 text-center">
        <CheckCircle size={52} className="mx-auto mb-4 text-[#C8922A]" />
        <h1 className="font-heading text-[26px] text-[#1C3A2B] mb-3">Request Received!</h1>
        <p className="font-body text-[15px] text-gray-500 leading-relaxed mb-6 max-w-sm mx-auto">
          We&apos;ll be in touch shortly — usually within a few hours during business hours.
        </p>

        <div className="rounded-xl p-4 mb-6" style={{ background: '#EAF3DE', border: '1px solid #C0DD97' }}>
          <p
            className="font-body uppercase tracking-widest font-bold mb-1"
            style={{ color: '#3B6D11', fontSize: 11 }}
          >
            Your Reference Number
          </p>
          <p
            className="font-heading font-mono"
            style={{ color: '#1C3A2B', fontSize: 30, letterSpacing: '0.05em', lineHeight: 1 }}
          >
            {referenceCode}
          </p>
          <button
            onClick={handleCopy}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-[13px] font-body transition-colors"
            style={{ background: '#1C3A2B' }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <Link
          href="/"
          className="w-full flex items-center justify-center gap-2 bg-[#1C3A2B] text-white
                     font-heading text-[15px] uppercase tracking-wide py-4 rounded-xl
                     hover:bg-[#2D5A40] transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 px-6 py-6 text-center">
        <p className="font-body text-[13px] text-gray-400 mb-2">Questions? Call us:</p>
        <a
          href="tel:+17702716072"
          className="font-heading text-[28px] text-[#1C3A2B] hover:text-[#2D5A40] transition-colors"
        >
          (770) 271-6072
        </a>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RequestQuotePage() {
  const [customerName,        setCustomerName]        = useState('')
  const [customerPhone,       setCustomerPhone]       = useState('')
  const [customerEmail,       setCustomerEmail]       = useState('')
  const [propertyAddress,     setPropertyAddress]     = useState('')
  const [serviceTypes,        setServiceTypes]        = useState<string[]>([])
  const [otherDescription,    setOtherDescription]    = useState('')
  const [preferredDate,       setPreferredDate]       = useState('')
  const [preferredTimeframe,  setPreferredTimeframe]  = useState('flexible')

  const [photos,    setPhotos]    = useState<PhotoItem[]>([])
  const photosRef                 = useRef<PhotoItem[]>([])
  photosRef.current               = photos

  const [errors,     setErrors]     = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [referenceCode, setReferenceCode] = useState<string | null>(null)

  function clearError(k: string) {
    setErrors((prev) => { const n = { ...prev }; delete n[k]; return n })
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!customerName.trim()) e.customerName = 'Name is required'
    if (!customerPhone.trim()) e.customerPhone = 'Phone number is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const processFiles = useCallback(async (files: File[]) => {
    const current = photosRef.current
    const slots   = MAX_PHOTOS - current.length
    const adding: PhotoItem[] = files
      .filter((f) => f.size <= MAX_SIZE_BYTES)
      .slice(0, Math.max(slots, 0))
      .map((file) => ({
        id:       uuidv4(),
        file,
        preview:  URL.createObjectURL(file),
        url:      null,
        progress: 0,
        phase:    'compressing' as const,
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
            prev.map((p) => p.id === item.id ? { ...p, phase: 'error' } : p)
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const pending = photos.filter((p) => p.phase === 'compressing' || p.phase === 'uploading')
    if (pending.length > 0) {
      setErrors({ photos: 'Please wait for all photos to finish uploading' })
      return
    }

    setSubmitting(true)
    setErrors({})

    try {
      const photoUrls = photos
        .filter((p) => p.phase === 'done' && p.url)
        .map((p) => p.url as string)

      const res = await fetch('https://gordon-admin.vercel.app/api/public/request-quote', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName:       customerName.trim(),
          customerPhone,
          customerEmail:      customerEmail.trim() || undefined,
          propertyAddress:    propertyAddress.trim() || undefined,
          serviceType:        serviceTypes.filter(s => s !== 'Other').join(', ') || undefined,
          serviceDescription: serviceTypes.includes('Other') ? otherDescription.trim() || undefined : undefined,
          preferredDate:      preferredDate || undefined,
          preferredTimeframe,
          photoUrls,
          aiResult:  null,
          treeCount: '',
          urgency:   '',
        }),
      })

      const data = await res.json() as { success?: boolean; referenceCode?: string; error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? 'Something went wrong')
      setReferenceCode(data.referenceCode ?? '')
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (referenceCode) return <SuccessScreen referenceCode={referenceCode} />

  return (
    <div className="max-w-lg mx-auto px-4 py-8 pb-16">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-body text-[13px] text-gray-400 hover:text-gray-600 mb-5 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Home
        </Link>
        <h1 className="font-heading text-[26px] text-[#1C3A2B]">Request a Quote</h1>
        <p className="font-body text-[14px] text-gray-400 mt-1">
          Fill in your info and we&apos;ll get back to you — usually same day.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">

        {/* Full Name */}
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
            onChange={(e) => { setCustomerPhone(formatPhone(e.target.value)); clearError('customerPhone') }}
            className={inputCls(!!errors.customerPhone)}
            placeholder="(555) 555-5555"
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

        {/* Property Address */}
        <div>
          <FieldLabel>Property address</FieldLabel>
          <input
            type="text"
            value={propertyAddress}
            onChange={(e) => setPropertyAddress(e.target.value)}
            className={inputCls()}
            placeholder="Street address, city, state"
            autoComplete="street-address"
          />
          <FieldHelper>Optional — helps us prepare before we visit</FieldHelper>
        </div>

        {/* Services */}
        <div>
          <FieldLabel>What do you need done?</FieldLabel>
          <p className="font-body text-[12px] text-gray-400 mb-3">Select all that apply</p>
          <div className="flex flex-col gap-3">
            {SERVICES.map((s) => (
              <ServiceCard
                key={s.id}
                service={s}
                selected={serviceTypes.includes(s.id)}
                onSelect={() =>
                  setServiceTypes((prev) =>
                    prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id]
                  )
                }
              />
            ))}
          </div>
          {serviceTypes.includes('Other') && (
            <textarea
              value={otherDescription}
              onChange={(e) => setOtherDescription(e.target.value)}
              rows={3}
              className={[
                'mt-3 w-full rounded-lg border border-gray-300 px-4 py-3 text-[16px] text-[#4A4A4A] bg-white resize-none',
                'outline-none transition-colors duration-150',
                'focus:border-[#1C3A2B] focus:ring-2 focus:ring-[#1C3A2B]/20',
              ].join(' ')}
              placeholder="Please describe what you need…"
              autoFocus
            />
          )}
        </div>

        {/* Preferred Date */}
        <div>
          <FieldLabel>Preferred date</FieldLabel>
          <input
            type="date"
            value={preferredDate}
            min={todayStr()}
            onChange={(e) => setPreferredDate(e.target.value)}
            className={inputCls()}
          />
          <FieldHelper>Optional — we&apos;ll confirm availability when we call</FieldHelper>
        </div>

        {/* Preferred Time */}
        <div>
          <FieldLabel>Preferred time</FieldLabel>
          <div className="flex gap-2 mt-1">
            {(['Morning', 'Afternoon', 'Flexible'] as const).map((opt) => (
              <Pill
                key={opt}
                label={opt}
                selected={preferredTimeframe === opt.toLowerCase()}
                onSelect={() => setPreferredTimeframe(opt.toLowerCase())}
              />
            ))}
          </div>
        </div>

        {/* Photos */}
        <div>
          <FieldLabel>Photos</FieldLabel>
          <FieldHelper>Optional — photos help us give you a more accurate quote</FieldHelper>

          <div
            {...getRootProps()}
            className={[
              'mt-2 border-2 rounded-2xl py-8 px-6 text-center transition-all duration-200',
              photos.length >= MAX_PHOTOS
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                : isDragActive
                ? 'border-solid border-[#C8922A] bg-[#FAEEDA] cursor-copy'
                : 'border-dashed border-[#C8922A] hover:bg-[#FAEEDA] hover:border-solid cursor-pointer',
            ].join(' ')}
          >
            <input {...getInputProps()} />
            <Camera
              size={36}
              className={`mx-auto mb-2 ${isDragActive ? 'text-amber-600' : 'text-[#C8922A]'}`}
            />
            <p className="font-body text-[14px] font-bold text-[#4A4A4A] mb-0.5">
              {photos.length >= MAX_PHOTOS ? 'Maximum photos reached' : 'Tap to upload photos'}
            </p>
            <p className="font-body text-[12px] text-gray-400">
              JPG, PNG, HEIC · Max 10MB each · Up to {MAX_PHOTOS} photos
            </p>
          </div>

          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mt-3">
              {photos.map((photo) => (
                <PhotoThumb key={photo.id} photo={photo} onRemove={() => removePhoto(photo.id)} />
              ))}
            </div>
          )}

          <FieldError msg={errors.photos} />
        </div>

        {/* Terms */}
        <p className="font-body text-[12px] text-gray-400 leading-relaxed">
          By submitting, you agree that Gordon Pro Tree Service may contact you about your service
          request. Your information is not shared with third parties.
        </p>

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
