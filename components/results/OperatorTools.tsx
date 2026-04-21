'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import imageCompression from 'browser-image-compression'
import { Loader2, Camera, CheckCircle, User, Phone } from 'lucide-react'
import type { Job, JobStatus, JOB_STATUS_CONFIG } from '@/lib/types'
import { JOB_STATUS_CONFIG as STATUS_CONFIG } from '@/lib/types'
import { formatReference } from '@/lib/jobs'

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-white text-sm font-body shadow-lg"
      style={{ background: type === 'success' ? '#1C3A2B' : '#B91C1C', whiteSpace: 'nowrap' }}
    >
      {message}
    </div>
  )
}

function useToast() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const show = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2500)
  }, [])
  return { toast, show }
}

// ─── Card 1: Job Status ───────────────────────────────────────────────────────

function JobStatusCard({ job, onStatusChange }: { job: Job; onStatusChange: (next: JobStatus) => void }) {
  const [status, setStatus] = useState<JobStatus>(job.status)
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(job.status === 'complete')
  const { toast, show } = useToast()

  const cfg = STATUS_CONFIG[status]

  const advance = async (target: JobStatus) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/jobs/${job.id}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: target }),
      })
      if (!res.ok) throw new Error()
      setStatus(target)
      if (target === 'complete') setCompleted(true)
      onStatusChange(target)
      show(target === 'complete' ? 'Job marked complete!' : 'Status updated')
    } catch {
      show('Failed to update status', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (completed) {
    return (
      <>
        <div
          className="rounded-2xl px-6 py-5 print:hidden"
          style={{ background: '#1C3A2B', border: '1px solid #1C3A2B' }}
        >
          <div className="flex items-center gap-3">
            <CheckCircle size={24} style={{ color: '#9FE1CB', flexShrink: 0 }} />
            <div>
              <p className="font-body text-[11px] uppercase tracking-widest" style={{ color: '#9FE1CB' }}>
                Job Complete
              </p>
              <p className="font-heading text-[18px] text-white leading-tight">
                {formatReference(job.reference_code)}
              </p>
            </div>
          </div>
        </div>
        {toast && <Toast {...toast} />}
      </>
    )
  }

  return (
    <>
      <div
        className="bg-white rounded-2xl px-6 py-5 print:hidden"
        style={{ border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-body text-[11px] uppercase tracking-widest mb-1" style={{ color: '#888780' }}>
              Job Record
            </p>
            <p className="font-heading text-[18px] text-green-dark leading-tight">
              {formatReference(job.reference_code)}
            </p>
          </div>
          <span
            className="font-body text-[12px] font-bold px-3 py-1 rounded-full"
            style={{ background: cfg.bg, color: cfg.color === '#FFFFFF' ? '#1C3A2B' : cfg.color }}
          >
            {cfg.label}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {status === 'assigned' && (
            <button
              onClick={() => advance('in_progress')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-body text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: '#C8922A' }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              Mark In Progress
            </button>
          )}

          {(status === 'in_progress' || status === 'assigned') && (
            <button
              onClick={() => advance('complete')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-body text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: '#1C3A2B' }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              Mark Complete
            </button>
          )}

          {status !== 'assigned' && status !== 'in_progress' && (
            <p className="text-center font-body text-[13px] text-gray-400 py-1">
              No actions available for this status
            </p>
          )}
        </div>
      </div>
      {toast && <Toast {...toast} />}
    </>
  )
}

// ─── Card 2: On-Site Photos ───────────────────────────────────────────────────

const PHOTO_STATUSES: JobStatus[] = ['assigned', 'in_progress', 'complete']

function OnsitePhotosCard({ job, currentStatus }: { job: Job; currentStatus: JobStatus }) {
  const [photos, setPhotos] = useState<string[]>(job.onsite_photo_urls ?? [])
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast, show } = useToast()

  if (!PHOTO_STATUSES.includes(currentStatus)) return null

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      })
      const form = new FormData()
      form.append('file', compressed, file.name)
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: form })
      if (!uploadRes.ok) throw new Error('Upload failed')
      const { url } = await uploadRes.json()
      const saveRes = await fetch(`/api/jobs/${job.id}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl: url }),
      })
      if (!saveRes.ok) throw new Error('Save failed')
      setPhotos(p => [...p, url])
      show('Photo saved')
    } catch {
      show('Photo upload failed', 'error')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <>
      <div
        className="bg-white rounded-2xl px-6 py-5 print:hidden"
        style={{ border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        <p className="font-body text-[11px] uppercase tracking-widest mb-1" style={{ color: '#C8922A' }}>
          On-Site
        </p>
        <h3 className="font-heading text-[18px] text-green-dark mb-4">Log Photos</h3>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleCapture}
        />

        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-body text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 mb-4"
          style={{ background: '#1C3A2B' }}
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
          {uploading ? 'Uploading…' : 'Take Photo'}
        </button>

        {photos.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {photos.map((url, i) => (
              <div key={url} className="relative aspect-square rounded-lg overflow-hidden">
                <Image
                  src={url}
                  alt={`On-site photo ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="180px"
                />
              </div>
            ))}
          </div>
        )}

        {photos.length === 0 && (
          <p className="text-center font-body text-[13px] text-gray-400">No photos logged yet</p>
        )}
      </div>
      {toast && <Toast {...toast} />}
    </>
  )
}

// ─── Card 3: Save Job Record ──────────────────────────────────────────────────

const NEEDS_RECORD = (name: string) =>
  !name || name.trim() === '' || name.toLowerCase() === 'operator submission'

function SaveJobRecordCard({ job }: { job: Job }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const { toast, show } = useToast()

  if (!NEEDS_RECORD(job.customer_name)) return null

  const handleSave = async () => {
    if (!name.trim()) { show('Name is required', 'error'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/jobs/${job.id}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_name: name.trim(), customer_phone: phone.trim() }),
      })
      if (!res.ok) throw new Error()
      setSaved(true)
      show('Record saved')
    } catch {
      show('Failed to save record', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (saved) return null

  return (
    <>
      <div
        className="bg-white rounded-2xl px-6 py-5 print:hidden"
        style={{ border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        <p className="font-body text-[11px] uppercase tracking-widest mb-1" style={{ color: '#C8922A' }}>
          Customer
        </p>
        <h3 className="font-heading text-[18px] text-green-dark mb-4">Save Job Record</h3>

        <div className="space-y-3 mb-4">
          <div className="relative">
            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Customer name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 font-body text-[14px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-dark placeholder:text-gray-400"
            />
          </div>
          <div className="relative">
            <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="tel"
              placeholder="Phone (optional)"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 font-body text-[14px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-dark placeholder:text-gray-400"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-body text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: '#1C3A2B' }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : null}
          {saving ? 'Saving…' : 'Save Record'}
        </button>
      </div>
      {toast && <Toast {...toast} />}
    </>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function OperatorTools({ job, submissionId }: { job: Job; submissionId: string }) {
  const [currentStatus, setCurrentStatus] = useState<JobStatus>(job.status)

  return (
    <div className="space-y-4 print:hidden">
      <JobStatusCard job={job} onStatusChange={setCurrentStatus} />
      <OnsitePhotosCard job={job} currentStatus={currentStatus} />
      <SaveJobRecordCard job={job} />
    </div>
  )
}
