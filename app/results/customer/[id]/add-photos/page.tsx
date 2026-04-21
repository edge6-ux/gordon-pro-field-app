'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Cpu, Loader2, Sparkles, X } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import imageCompression from 'browser-image-compression'
import AppHeader from '@/components/layout/AppHeader'
import AppFooter from '@/components/layout/AppFooter'
import type { TreeSubmission } from '@/lib/types'

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

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_PHOTOS = 5

const ANALYZE_MESSAGES = [
  'Identifying species...',
  'Analyzing site conditions...',
  'Preparing your assessment...',
]

// ─── Upload helper ────────────────────────────────────────────────────────────

async function uploadFile(
  file: File,
  onPhase: (phase: 'compressing' | 'uploading') => void,
  onProgress: (pct: number) => void
): Promise<string> {
  if (!navigator.onLine) throw new Error('No internet connection')

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

// ─── Loading Overlay ──────────────────────────────────────────────────────────

function LoadingOverlay() {
  const [msgIdx, setMsgIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setMsgIdx(i => (i + 1) % ANALYZE_MESSAGES.length), 2500)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1C3A2B] px-8">
      <div className="relative w-36 h-36 mb-8">
        <Image src="/images/fieldapp.png" alt="Gordon Pro" fill className="object-contain" sizes="144px" />
      </div>
      <Loader2 size={32} className="text-[#C8922A] animate-spin mb-6" />
      <p className="font-body text-white text-base text-center min-h-[1.5rem] transition-all duration-300">
        {ANALYZE_MESSAGES[msgIdx]}
      </p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AddPhotosPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { id } = params

  const [ready,     setReady]     = useState(false)
  const [photos,    setPhotos]    = useState<PhotoItem[]>([])
  const [dragging,  setDragging]  = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const photosRef = useRef<PhotoItem[]>([])
  photosRef.current = photos

  // Fetch submission on mount — redirect if not found or already analyzed
  useEffect(() => {
    fetch(`/api/submissions/${id}`)
      .then(res => {
        if (!res.ok) { router.replace('/'); return null }
        return res.json() as Promise<TreeSubmission>
      })
      .then(data => {
        if (!data) return
        if (data.ai_result) { router.replace(`/results/customer/${id}`); return }
        setReady(true)
      })
      .catch(() => router.replace('/'))
  }, [id, router])

  const startUpload = useCallback((item: PhotoItem) => {
    uploadFile(
      item.file,
      (phase)    => setPhotos(prev => prev.map(p => p.id === item.id ? { ...p, phase }    : p)),
      (progress) => setPhotos(prev => prev.map(p => p.id === item.id ? { ...p, progress } : p)),
    )
      .then(url  => setPhotos(prev => prev.map(p => p.id === item.id ? { ...p, url, phase: 'done',  progress: 100 } : p)))
      .catch(err => setPhotos(prev => prev.map(p => p.id === item.id ? { ...p, phase: 'error', errorMessage: (err as Error).message } : p)))
  }, [])

  const processFiles = useCallback((files: FileList | File[]) => {
    const arr   = Array.from(files)
    const slots = MAX_PHOTOS - photosRef.current.length
    if (slots <= 0) return

    const toAdd = arr.slice(0, slots).map<PhotoItem>(file => ({
      id:           uuidv4(),
      file,
      preview:      URL.createObjectURL(file),
      url:          null,
      progress:     0,
      phase:        'compressing',
      errorMessage: null,
    }))

    setPhotos(prev => [...prev, ...toAdd])
    toAdd.forEach(startUpload)
  }, [startUpload])

  const removePhoto = useCallback((photoId: string) => {
    setPhotos(prev => {
      const item = prev.find(p => p.id === photoId)
      if (item) URL.revokeObjectURL(item.preview)
      return prev.filter(p => p.id !== photoId)
    })
  }, [])

  const uploadedUrls = photos.filter(p => p.phase === 'done' && p.url).map(p => p.url as string)
  const canSubmit    = uploadedUrls.length > 0 && photos.every(p => p.phase === 'done' || p.phase === 'error')

  const handleSubmit = async () => {
    if (!canSubmit) return
    setAnalyzing(true)
    setError(null)
    try {
      const patchRes = await fetch(`/api/submissions/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ photo_urls: uploadedUrls }),
      })
      if (!patchRes.ok) throw new Error('Failed to save photos')

      const analyzeRes = await fetch('/api/analyze', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ submissionId: id }),
      })
      if (!analyzeRes.ok) throw new Error('AI analysis failed')

      router.push(`/results/customer/${id}`)
    } catch (err) {
      setAnalyzing(false)
      setError((err as Error).message ?? 'Analysis failed. Please try again.')
    }
  }

  if (!ready) return null

  return (
    <>
      {analyzing && <LoadingOverlay />}

      <AppHeader />

      <div className="min-h-screen bg-[#F5F2ED]">
        <div className="max-w-lg mx-auto px-4 py-8 pb-32">

          {/* Header card */}
          <div className="bg-[#1C3A2B] rounded-2xl p-6 mb-6">
            <p
              className="font-body text-[11px] uppercase"
              style={{ color: '#9FE1CB', letterSpacing: '0.08em' }}
            >
              Add Photos
            </p>
            <h1 className="font-heading text-[22px] text-white mt-1 leading-tight">
              Get Your AI Assessment
            </h1>
            <p
              className="font-body text-[13px] mt-1 leading-snug"
              style={{ color: 'rgba(255,255,255,0.6)' }}
            >
              Upload photos of your tree and our AI will analyze it instantly.
            </p>
          </div>

          {/* Photo upload card */}
          <div
            className="bg-white rounded-2xl p-6 mb-4"
            style={{ border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            {/* Benefit callout */}
            <div
              className="flex gap-3 rounded-xl p-4 mb-4"
              style={{ background: '#EAF3DE', border: '1px solid #C0DD97' }}
            >
              <Sparkles size={20} color="#1C3A2B" className="shrink-0 mt-0.5" />
              <p className="font-body text-[13px]" style={{ color: '#27500A' }}>
                Our AI identifies your tree species, flags any hazards, and gives our team
                everything they need to quote your job accurately.
              </p>
            </div>

            {/* Drop zone */}
            {photos.length < MAX_PHOTOS && (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); processFiles(e.dataTransfer.files) }}
                onClick={() => document.getElementById('photo-input-addon')?.click()}
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors duration-150"
                style={{
                  borderColor: dragging ? '#1C3A2B' : '#D1D5DB',
                  background:  dragging ? 'rgba(28,58,43,0.04)' : 'transparent',
                }}
              >
                <input
                  id="photo-input-addon"
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={e => { if (e.target.files) processFiles(e.target.files) }}
                />
                <svg
                  className="w-10 h-10 mx-auto mb-2 text-gray-400"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path
                    strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                  />
                </svg>
                <p className="font-body text-[14px] font-medium text-gray-600 mb-1">
                  Tap to add photos
                </p>
                <p className="font-body text-[12px] text-gray-400">
                  Up to {MAX_PHOTOS} photos · JPG, PNG, WEBP, HEIC
                </p>
              </div>
            )}

            {/* Thumbnails with progress */}
            {photos.length > 0 && (
              <div className={`grid grid-cols-3 gap-2${photos.length < MAX_PHOTOS ? ' mt-4' : ''}`}>
                {photos.map(photo => (
                  <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <Image src={photo.preview} alt="Tree photo" fill className="object-cover" sizes="120px" />

                    {(photo.phase === 'compressing' || photo.phase === 'uploading') && (
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1">
                        <Loader2 size={20} className="text-white animate-spin" />
                        <p className="font-body text-[10px] text-white">{photo.progress}%</p>
                      </div>
                    )}

                    {photo.phase === 'done' && (
                      <div className="absolute bottom-1.5 right-1.5 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}

                    {photo.phase === 'error' && (
                      <div className="absolute inset-0 bg-red-900/70 flex items-center justify-center">
                        <p className="font-body text-[10px] text-white text-center px-1">Upload failed</p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      className="absolute top-1 left-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
                      aria-label="Remove photo"
                    >
                      <X size={12} color="white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {photos.length > 0 && (
              <p className="font-body text-[12px] text-gray-400 mt-3">
                {photos.length}/{MAX_PHOTOS} photos added
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div
              className="rounded-xl px-4 py-3 mb-4 font-body text-[14px]"
              style={{ background: '#FCEBEB', color: '#791F1F', border: '1px solid #F09595' }}
            >
              {error}
            </div>
          )}

        </div>
      </div>

      <AppFooter />

      {/* Sticky submit button */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white px-4 py-4 z-40"
        style={{ borderTop: '1px solid #E5E7EB' }}
      >
        <div className="max-w-lg mx-auto">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || analyzing}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-4 font-heading text-[16px] uppercase tracking-wide transition-colors duration-150"
            style={{
              background: canSubmit ? '#C8922A' : '#E5E7EB',
              color:      canSubmit ? 'white'   : '#9CA3AF',
            }}
          >
            {canSubmit
              ? <><Cpu size={18} /> Analyze My Tree</>
              : 'Add photos to continue'
            }
          </button>
        </div>
      </div>
    </>
  )
}
