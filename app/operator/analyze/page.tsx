'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import {
  Camera, ChevronLeft, ImagePlus, X, CheckCircle, Cpu, Loader2,
  Home, Trees,
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import imageCompression from 'browser-image-compression'

// ─── Types ────────────────────────────────────────────────────────────────────

type PhotoItem = {
  id: string
  file: File
  preview: string
  url: string | null
  progress: number
  phase: 'compressing' | 'uploading' | 'done' | 'error'
  errorMessage: string | null
}

type TreeHeightValue = '' | 'under_20ft' | '20_40ft' | '40_60ft' | 'over_60ft'
type LeanValue = '' | 'none' | 'slight' | 'moderate' | 'severe'
type ProximityValue = 'none' | 'close'

const HEIGHT_OPTIONS: { value: TreeHeightValue; label: string; sub: string }[] = [
  { value: 'under_20ft', label: 'Under 20ft', sub: 'small' },
  { value: '20_40ft',    label: '20–40ft',    sub: 'medium' },
  { value: '40_60ft',    label: '40–60ft',    sub: 'large' },
  { value: 'over_60ft',  label: 'Over 60ft',  sub: 'very large' },
]

const LEAN_OPTIONS: { value: LeanValue; label: string }[] = [
  { value: 'none',     label: 'None' },
  { value: 'slight',   label: 'Slight' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe',   label: 'Severe' },
]

const ANALYZE_MESSAGES = [
  'Identifying species…',
  'Analyzing site conditions…',
  'Preparing crew tips…',
  'Almost ready…',
]

const MAX_PHOTOS = 5
const MAX_SIZE_BYTES = 10 * 1024 * 1024

// ─── Upload helper ────────────────────────────────────────────────────────────

interface UploadCallbacks {
  onPhase: (phase: 'compressing' | 'uploading') => void
  onProgress: (pct: number) => void
}

async function uploadFile(file: File, { onPhase, onProgress }: UploadCallbacks): Promise<string> {
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
        try { msg = (JSON.parse(xhr.responseText) as { error?: string }).error ?? msg } catch { /* empty */ }
        reject(new Error(msg))
      }
    })
    xhr.addEventListener('error', () => reject(new Error('Network error — check connection')))
    xhr.open('POST', '/api/upload')
    xhr.send(fd)
  })
}

// ─── Loading Overlay ──────────────────────────────────────────────────────────

function LoadingOverlay() {
  const [msgIdx, setMsgIdx] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const msgTimer = setInterval(() => setMsgIdx(i => (i + 1) % ANALYZE_MESSAGES.length), 2500)
    const progTimer = setInterval(() => setProgress(p => Math.min(p + Math.random() * 8, 92)), 400)
    return () => { clearInterval(msgTimer); clearInterval(progTimer) }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-green-dark px-8">
      <div className="relative w-20 h-20 mb-8">
        <Image src="/images/gordonpro.png" alt="Gordon Pro" fill className="object-contain" sizes="80px" />
      </div>
      <Loader2 className="text-gold animate-spin mb-6" size={32} />
      <p className="font-body text-white text-base text-center mb-8 min-h-[1.5rem] transition-all duration-300">
        {ANALYZE_MESSAGES[msgIdx]}
      </p>
      <div className="w-full max-w-[240px] h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gold rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OperatorAnalyzePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const libraryInputRef = useRef<HTMLInputElement>(null)
  const photosRef = useRef<PhotoItem[]>([])

  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [treeHeight, setTreeHeight] = useState<TreeHeightValue>('')
  const [leanDirection, setLeanDirection] = useState<LeanValue>('')
  const [nearStructures, setNearStructures] = useState<ProximityValue | null>(null)
  const [quickNotes, setQuickNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [detailsVisible, setDetailsVisible] = useState(false)

  photosRef.current = photos

  // Auto-trigger library picker if navigated with ?mode=library
  useEffect(() => {
    if (searchParams.get('mode') === 'library') {
      libraryInputRef.current?.click()
    }
  }, [searchParams])

  const processFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files)
    const current = photosRef.current
    const slots = MAX_PHOTOS - current.length
    if (slots <= 0) return

    const imageExts = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif'])
    const toAdd = arr.slice(0, slots).filter(f => {
      if (f.type.startsWith('image/')) return true
      const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
      return imageExts.has(ext)
    })

    const newItems: PhotoItem[] = toAdd.map(file => ({
      id: uuidv4(),
      file,
      preview: URL.createObjectURL(file),
      url: null,
      progress: 0,
      phase: 'compressing' as const,
      errorMessage: null,
    }))

    setPhotos(prev => {
      const updated = [...prev, ...newItems]
      if (updated.length > 0 && !detailsVisible) setDetailsVisible(true)
      return updated
    })

    newItems.forEach(item => {
      uploadFile(item.file, {
        onPhase: (phase) => setPhotos(prev => prev.map(p => p.id === item.id ? { ...p, phase } : p)),
        onProgress: (progress) => setPhotos(prev => prev.map(p => p.id === item.id ? { ...p, progress } : p)),
      })
        .then(url => {
          setPhotos(prev => prev.map(p => p.id === item.id ? { ...p, url, progress: 100, phase: 'done' } : p))
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Upload failed'
          setPhotos(prev => prev.map(p => p.id === item.id ? { ...p, errorMessage: msg, phase: 'error' } : p))
        })
    })
  }, [detailsVisible])

  useEffect(() => {
    if (photos.length > 0) setDetailsVisible(true)
  }, [photos.length])

  const removePhoto = (id: string) => {
    setPhotos(prev => {
      const item = prev.find(p => p.id === id)
      if (item) URL.revokeObjectURL(item.preview)
      return prev.filter(p => p.id !== id)
    })
  }

  const allUploaded = photos.length > 0 && photos.every(p => p.phase === 'done')
  const hasErrors = photos.some(p => p.phase === 'error')

  const handleSubmit = async () => {
    if (!allUploaded) return
    setSubmitError('')
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Operator',
          lastName: 'Submission',
          phone: '',
          email: '',
          address: '',
          treeHeight: treeHeight || 'under_20ft',
          treeLocation: quickNotes,
          leanDirection: leanDirection || 'none',
          proximity: nearStructures || 'none',
          additionalNotes: '',
          photoUrls: photos.map(p => p.url!),
          source: 'operator',
        }),
      })

      if (!res.ok) throw new Error('Submit failed')
      const { id } = await res.json() as { id: string }

      // Fire analysis in background — don't await
      fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: id }),
      }).catch(() => {})

      router.push(`/results/${id}`)
    } catch {
      setIsSubmitting(false)
      setSubmitError('Analysis failed. Check connection and try again.')
    }
  }

  return (
    <>
      {isSubmitting && <LoadingOverlay />}

      <div className="max-w-lg mx-auto px-4 py-6 pb-32">
        {/* Back button */}
        <button
          onClick={() => router.push('/operator')}
          className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 font-body text-sm mb-6 min-h-[44px] -ml-1"
        >
          <ChevronLeft size={18} />
          Back
        </button>

        {/* ── Phase 1: Photo Capture ── */}
        <h1 className="font-heading text-[26px] text-green-dark mb-2">Capture the Tree</h1>
        <p className="text-gray-400 font-body text-[14px] mb-4">
          Take 2–3 photos from different angles for best results.
        </p>

        {/* One tree at a time notice */}
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
          <span className="text-amber-500 text-base leading-none mt-0.5">⚠</span>
          <p className="font-body text-[13px] text-amber-800 leading-snug">
            <span className="font-semibold">One tree per submission.</span> All photos must be of the same tree — mixing trees will confuse the AI analysis.
          </p>
        </div>

        {/* Camera button */}
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="w-full rounded-2xl flex flex-col items-center justify-center gap-3 py-10 active:scale-[0.99] transition-transform"
          style={{ background: '#1C3A2B', border: '2px solid #2D5A40', minHeight: '200px' }}
        >
          <Camera className="text-gold" size={40} />
          <span className="font-heading text-white text-[18px]">Tap to Open Camera</span>
          <span className="font-body text-white/60 text-[13px]">Opens rear camera directly</span>
        </button>

        <p className="text-center text-gray-400 font-body text-[13px] my-4">— or —</p>

        {/* Library upload */}
        <button
          onClick={() => libraryInputRef.current?.click()}
          className="w-full rounded-2xl flex items-center justify-center gap-2 py-4 font-body text-[15px] text-gray-700 active:scale-[0.99] transition-transform bg-white"
          style={{ border: '1.5px dashed #C8922A', minHeight: '44px' }}
        >
          <ImagePlus className="text-gold" size={20} />
          Choose from Photo Library
        </button>

        {/* Photo preview grid */}
        {photos.length > 0 && (
          <div className="mt-6">
            <div className="grid grid-cols-2 gap-3">
              {photos.map(photo => (
                <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                  <Image
                    src={photo.preview}
                    alt="Tree photo"
                    fill
                    className="object-cover"
                    sizes="180px"
                  />

                  {/* Progress / Compressing */}
                  {(photo.phase === 'compressing' || photo.phase === 'uploading') && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1.5">
                      <div className="h-1 bg-white/30 rounded-full overflow-hidden mb-1">
                        <div
                          className="h-full bg-gold transition-all duration-200 rounded-full"
                          style={{ width: `${photo.progress}%` }}
                        />
                      </div>
                      <p className="text-white text-[10px] text-center font-body">
                        {photo.phase === 'compressing' ? 'Compressing…' : `Uploading ${photo.progress}%`}
                      </p>
                    </div>
                  )}

                  {/* Success indicator */}
                  {photo.phase === 'done' && (
                    <div className="absolute top-2 right-2">
                      <div className="bg-green-dark rounded-full p-0.5">
                        <CheckCircle className="text-white" size={16} />
                      </div>
                    </div>
                  )}

                  {/* Error indicator */}
                  {photo.phase === 'error' && (
                    <div className="absolute inset-0 bg-red-500/80 flex flex-col items-center justify-center gap-1 p-2">
                      <span className="text-white text-[11px] font-semibold font-body text-center leading-tight">
                        {photo.errorMessage}
                      </span>
                      <span className="text-white/80 text-[10px] font-body">Tap ✕ to remove</span>
                    </div>
                  )}

                  {/* Delete button */}
                  <button
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-2 left-2 bg-black/50 rounded-full p-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
                    aria-label="Remove photo"
                  >
                    <X className="text-white" size={14} />
                  </button>
                </div>
              ))}

              {/* Add more */}
              {photos.length < MAX_PHOTOS && (
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="aspect-square rounded-xl flex flex-col items-center justify-center gap-1 bg-white active:bg-gray-50"
                  style={{ border: '1.5px dashed #D1D5DB' }}
                >
                  <span className="text-2xl text-gray-400">+</span>
                  <span className="text-xs text-gray-400 font-body">Add More</span>
                </button>
              )}
            </div>

            <p className="text-gray-400 font-body text-[12px] mt-2">
              {photos.length} of {MAX_PHOTOS} photos · Tap photo to remove
            </p>
          </div>
        )}

        {/* ── Phase 2: Quick Details ── */}
        <div
          className={`mt-8 transition-all duration-500 ease-out ${
            detailsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          <h2 className="font-heading text-[20px] text-green-dark mb-1">Quick Details</h2>
          <p className="text-gray-400 font-body text-[13px] mb-5">Optional but improves accuracy.</p>

          {/* Tree Height */}
          <div className="mb-5">
            <p className="font-body text-sm font-medium text-gray-700 mb-2">Tree Height</p>
            <div className="grid grid-cols-2 gap-2">
              {HEIGHT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTreeHeight(prev => prev === opt.value ? '' : opt.value)}
                  className={[
                    'p-3 rounded-xl text-left transition-colors min-h-[56px]',
                    treeHeight === opt.value
                      ? 'bg-green-dark text-white'
                      : 'bg-white border border-gray-200 text-gray-700',
                  ].join(' ')}
                >
                  <p className={`font-body text-[13px] font-medium ${treeHeight === opt.value ? 'text-white' : 'text-gray-800'}`}>
                    {opt.label}
                  </p>
                  <p className={`font-body text-[11px] ${treeHeight === opt.value ? 'text-white/70' : 'text-gray-400'}`}>
                    {opt.sub}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Lean */}
          <div className="mb-5">
            <p className="font-body text-sm font-medium text-gray-700 mb-2">Lean</p>
            <div className="flex gap-2 flex-wrap">
              {LEAN_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setLeanDirection(prev => prev === opt.value ? '' : opt.value)}
                  className={[
                    'px-4 py-2 rounded-full font-body text-[13px] transition-colors min-h-[44px]',
                    leanDirection === opt.value
                      ? 'bg-green-dark text-white'
                      : 'bg-white border border-gray-200 text-gray-700',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Near Structures */}
          <div className="mb-5">
            <p className="font-body text-sm font-medium text-gray-700 mb-2">Near Structures?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setNearStructures(prev => prev === 'close' ? null : 'close')}
                className={[
                  'flex flex-col items-center justify-center gap-2 rounded-xl p-4 min-h-[80px] transition-colors',
                  nearStructures === 'close'
                    ? 'bg-green-dark text-white'
                    : 'bg-white border border-gray-200 text-gray-700',
                ].join(' ')}
              >
                <Home size={22} className={nearStructures === 'close' ? 'text-white' : 'text-gray-500'} />
                <span className={`font-body text-[13px] font-medium ${nearStructures === 'close' ? 'text-white' : 'text-gray-700'}`}>
                  Yes, nearby
                </span>
              </button>
              <button
                onClick={() => setNearStructures(prev => prev === 'none' ? null : 'none')}
                className={[
                  'flex flex-col items-center justify-center gap-2 rounded-xl p-4 min-h-[80px] transition-colors',
                  nearStructures === 'none'
                    ? 'bg-green-dark text-white'
                    : 'bg-white border border-gray-200 text-gray-700',
                ].join(' ')}
              >
                <Trees size={22} className={nearStructures === 'none' ? 'text-white' : 'text-gray-500'} />
                <span className={`font-body text-[13px] font-medium ${nearStructures === 'none' ? 'text-white' : 'text-gray-700'}`}>
                  No, clear area
                </span>
              </button>
            </div>
          </div>

          {/* Quick Notes */}
          <div className="mb-5">
            <p className="font-body text-sm font-medium text-gray-700 mb-2">Quick Notes</p>
            <input
              type="text"
              value={quickNotes}
              onChange={e => setQuickNotes(e.target.value)}
              placeholder="Any quick notes..."
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-body text-[16px] text-gray-800 outline-none focus:border-green-dark focus:ring-2 focus:ring-green-dark/20"
            />
          </div>
        </div>

        {/* Error toast */}
        {submitError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <span className="font-body text-sm text-red-700">{submitError}</span>
            <button onClick={() => setSubmitError('')} className="shrink-0 text-red-400 hover:text-red-700">
              <X size={16} />
            </button>
          </div>
        )}

        {hasErrors && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-700 font-body text-sm font-semibold">Upload error</p>
            <p className="text-red-600 font-body text-xs mt-0.5">
              {photos.find(p => p.phase === 'error')?.errorMessage ?? 'Upload failed — remove the photo and try again.'}
            </p>
          </div>
        )}
      </div>

      {/* Sticky Analyze Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 pb-safe z-40">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleSubmit}
            disabled={!allUploaded || isSubmitting}
            className={[
              'w-full flex items-center justify-center gap-3 rounded-xl py-4 font-heading text-[18px] uppercase tracking-wide transition-all',
              allUploaded && !isSubmitting
                ? 'bg-gold text-[#1A1A1A] active:scale-[0.98]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed',
            ].join(' ')}
          >
            {isSubmitting ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Cpu size={20} />
            )}
            {allUploaded
              ? `Analyze Tree · ${photos.length} photo${photos.length !== 1 ? 's' : ''}`
              : 'Analyze Tree'}
          </button>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={e => { if (e.target.files) processFiles(e.target.files); e.target.value = '' }}
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => { if (e.target.files) processFiles(e.target.files); e.target.value = '' }}
      />
    </>
  )
}
