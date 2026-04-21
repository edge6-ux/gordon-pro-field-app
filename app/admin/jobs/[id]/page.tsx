'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ChevronLeft, MapPin, Clock, Check, Camera, CheckCircle,
  FileText, ExternalLink, AlertTriangle, Info, X,
} from 'lucide-react'
import type { Job } from '@/lib/types'
import { JOB_STATUS_CONFIG } from '@/lib/types'
import { getPipelineSteps, formatReference, isStepComplete, isStepCurrent } from '@/lib/jobs'

const AUTH_EXP_KEY = 'gp_admin_exp'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── Toast ─────────────────────────────────────────────────────────────────────

type ToastKind = 'success' | 'error'
interface ToastState { message: string; kind: ToastKind; id: number }

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000)
    return () => clearTimeout(t)
  }, [toast.id, onDismiss])

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-white text-[14px] font-body transition-all"
      style={{ background: toast.kind === 'success' ? '#1C3A2B' : '#C41C1C' }}
    >
      {toast.kind === 'success' ? <Check size={16} /> : <X size={16} />}
      {toast.message}
    </div>
  )
}

function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)
  const counter = useRef(0)

  const show = useCallback((message: string, kind: ToastKind = 'success') => {
    counter.current += 1
    setToast({ message, kind, id: counter.current })
  }, [])

  const dismiss = useCallback(() => setToast(null), [])
  return { toast, show, dismiss }
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

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
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white"
        aria-label="Close"
      >
        <X size={28} />
      </button>
      {urls.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => (i - 1 + urls.length) % urls.length) }}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
          >
            <ChevronLeft size={32} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => (i + 1) % urls.length) }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
          >
            <ChevronLeft size={32} className="rotate-180" />
          </button>
        </>
      )}
      <div className="relative w-full max-w-3xl max-h-[85vh] mx-8" onClick={e => e.stopPropagation()}>
        <Image
          src={urls[idx]}
          alt={`Photo ${idx + 1}`}
          width={900}
          height={700}
          className="object-contain w-full max-h-[80vh] rounded-lg"
        />
      </div>
      {urls.length > 1 && (
        <div className="absolute bottom-6 flex gap-2">
          {urls.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); setIdx(i) }}
              className={`w-2 h-2 rounded-full transition-colors ${i === idx ? 'bg-white' : 'bg-white/40'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ background: '#F5F2ED', minHeight: '100vh' }}>
      <div className="max-w-5xl mx-auto px-6 py-6 animate-pulse">
        <div className="h-4 w-32 bg-gray-200 rounded mb-6" />
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
          <div className="h-3 w-24 bg-gray-100 rounded mb-3" />
          <div className="h-7 w-64 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-48 bg-gray-100 rounded" />
        </div>
        <div className="flex gap-6">
          <div className="flex-1 space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm h-40" />
            <div className="bg-white rounded-2xl p-6 shadow-sm h-56" />
            <div className="bg-white rounded-2xl p-6 shadow-sm h-36" />
          </div>
          <div className="w-80 space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm h-48" />
            <div className="bg-white rounded-2xl p-6 shadow-sm h-40" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Card wrapper ──────────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-6 mb-4 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-heading text-[18px] text-gray-900 mb-4">{children}</h2>
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="font-body block text-[13px] font-semibold text-gray-500 mb-1.5">
      {children}
    </label>
  )
}

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[14px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-dark bg-white'

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function JobDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const { toast, show: showToast, dismiss: dismissToast } = useToast()

  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [lightboxUrls, setLightboxUrls] = useState<string[]>([])
  const [lightboxIdx, setLightboxIdx] = useState(0)

  // Scheduling form state (local edits before save)
  const [schedDate, setSchedDate] = useState('')
  const [schedTime, setSchedTime] = useState('')
  const [duration, setDuration] = useState('')
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const [scheduleSaved, setScheduleSaved] = useState(false)

  // Crew notes
  const [crewNotes, setCrewNotes] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [notesError, setNotesError] = useState(false)

  // Status update
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null)

  // Complete job
  const [completing, setCompleting] = useState(false)

  // ── Auth check ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const exp = localStorage.getItem(AUTH_EXP_KEY)
    if (!exp || parseInt(exp, 10) <= Date.now()) {
      router.replace('/admin')
    }
  }, [router])

  // ── Fetch job ────────────────────────────────────────────────────────────────

  const fetchJob = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(`/api/jobs/${id}`)
      if (!res.ok) throw new Error('not found')
      const data = await res.json() as Job
      setJob(data)
      setSchedDate(data.scheduled_date ?? '')
      setSchedTime(data.scheduled_time ?? '')
      setDuration(data.estimated_duration ?? '')
      setCrewNotes(data.crew_notes ?? '')
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { void fetchJob() }, [fetchJob])

  // ── Patch helper ─────────────────────────────────────────────────────────────

  async function patchJob(body: Record<string, unknown>): Promise<Job | null> {
    const res = await fetch(`/api/jobs/${id}/update`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    return res.json() as Promise<Job>
  }

  // ── Status update ────────────────────────────────────────────────────────────

  async function handleStatusClick(status: string) {
    if (!job) return
    const prev = job.status
    setJob(j => j ? { ...j, status: status as Job['status'] } : j)
    setStatusUpdating(status)
    try {
      const updated = await patchJob({ status })
      if (updated) {
        setJob(updated)
        showToast('Status updated ✓')
      } else {
        setJob(j => j ? { ...j, status: prev } : j)
        showToast('Failed to update status', 'error')
      }
    } catch {
      setJob(j => j ? { ...j, status: prev } : j)
      showToast('Failed to update status', 'error')
    } finally {
      setStatusUpdating(null)
    }
  }

  async function handleCancel() {
    if (!window.confirm('Cancel this job? This cannot be undone.')) return
    const updated = await patchJob({ status: 'cancelled' })
    if (updated) {
      setJob(updated)
      showToast('Job cancelled')
    } else {
      showToast('Failed to cancel job', 'error')
    }
  }

  // ── Scheduling ───────────────────────────────────────────────────────────────

  async function handleSaveSchedule() {
    setScheduleSaving(true)
    setScheduleSaved(false)
    try {
      const updated = await patchJob({
        scheduled_date: schedDate || null,
        scheduled_time: schedTime || null,
        estimated_duration: duration || null,
      })
      if (updated) {
        setJob(updated)
        setScheduleSaved(true)
        setTimeout(() => setScheduleSaved(false), 2000)
      } else {
        showToast('Failed to save schedule', 'error')
      }
    } catch {
      showToast('Failed to save schedule', 'error')
    } finally {
      setScheduleSaving(false)
    }
  }

  // ── Crew notes ───────────────────────────────────────────────────────────────

  async function handleNotesSave() {
    setNotesSaving(true)
    setNotesSaved(false)
    setNotesError(false)
    try {
      const updated = await patchJob({ crew_notes: crewNotes })
      if (updated) {
        setJob(updated)
        setNotesSaved(true)
        setTimeout(() => setNotesSaved(false), 2000)
      } else {
        setNotesError(true)
      }
    } catch {
      setNotesError(true)
    } finally {
      setNotesSaving(false)
    }
  }

  // ── Complete job ─────────────────────────────────────────────────────────────

  async function handleComplete() {
    if (!window.confirm('Mark this job complete? A report will be generated.')) return
    setCompleting(true)
    try {
      const res = await fetch(`/api/jobs/${id}/complete`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json() as { success: boolean }
        if (data.success) {
          await fetchJob()
          showToast('Job complete! Report generated.')
        } else {
          showToast('Failed to complete job', 'error')
        }
      } else {
        showToast('Failed to complete job', 'error')
      }
    } catch {
      showToast('Failed to complete job', 'error')
    } finally {
      setCompleting(false)
    }
  }

  // ── Render guards ────────────────────────────────────────────────────────────

  if (loading) return <Skeleton />

  if (error || !job) {
    return (
      <div style={{ background: '#F5F2ED', minHeight: '100vh' }}>
        <div className="max-w-5xl mx-auto px-6 py-6">
          <Link href="/admin" className="inline-flex items-center gap-1 text-[14px] text-gray-400 hover:text-gray-700 mb-6">
            <ChevronLeft size={16} /> Back to Dashboard
          </Link>
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500 text-[15px] mb-4">Failed to load job.</p>
            <button
              onClick={() => void fetchJob()}
              className="px-5 py-2.5 bg-green-dark text-white rounded-lg text-[14px] font-medium hover:opacity-90 transition-opacity"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  const config = JOB_STATUS_CONFIG[job.status]
  const steps = getPipelineSteps()
  const ai = job.submission?.ai_result
  const submittedPhotos = job.submission?.photo_urls ?? []
  const onsitePhotos = job.onsite_photo_urls ?? []

  return (
    <div style={{ background: '#F5F2ED', minHeight: '100vh' }}>
      <div className="max-w-5xl mx-auto px-6 py-6">

        {/* Back */}
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 font-body text-[14px] text-gray-400 hover:text-gray-700 transition-colors mb-6"
        >
          <ChevronLeft size={16} />
          Back to Dashboard
        </Link>

        {/* Page header */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p
                className="font-body"
                style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.07em' }}
              >
                Job {formatReference(job.reference_code)}
              </p>
              <h1 className="font-heading text-[28px] text-gray-900 mt-1">
                {job.customer_name || 'Field Assessment'}
              </h1>
              <div className="flex items-center gap-1.5 mt-1">
                <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                <span className="font-body text-[15px] text-gray-500">
                  {job.property_address || 'No address on file'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <Clock size={12} className="text-gray-400 flex-shrink-0" />
                <span className="font-body text-[13px] text-gray-400">
                  Submitted {fmtDateTime(job.created_at)}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <span
                className="font-body font-bold text-[14px] px-5 py-2 rounded-full"
                style={{ background: config.bg, color: config.color === '#FFFFFF' ? '#1C3A2B' : config.color }}
              >
                {config.label}
              </span>
              <span className="font-body text-[11px] text-gray-400">
                Updated {timeAgo(job.updated_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── LEFT COLUMN ── */}
          <div className="flex-1 min-w-0">

            {/* Status update */}
            <Card>
              <CardTitle>Job Status</CardTitle>
              <div className="flex gap-2 flex-wrap">
                {steps.map(step => {
                  const complete = isStepComplete(step, job.status)
                  const current = isStepCurrent(step, job.status)
                  const stepConfig = JOB_STATUS_CONFIG[step]
                  const isUpdating = statusUpdating === step

                  if (complete) {
                    return (
                      <div
                        key={step}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-body"
                        style={{ background: '#EAF3DE', border: '1px solid #C0DD97', color: '#27500A' }}
                      >
                        <Check size={13} />
                        {stepConfig.label}
                      </div>
                    )
                  }

                  if (current) {
                    return (
                      <div
                        key={step}
                        className="inline-flex items-center px-3 py-2 rounded-lg text-[13px] font-bold font-body"
                        style={{
                          background: stepConfig.bg,
                          border: `2px solid ${stepConfig.color === '#FFFFFF' ? '#1C3A2B' : stepConfig.color}`,
                          color: stepConfig.color === '#FFFFFF' ? '#1C3A2B' : stepConfig.color,
                        }}
                      >
                        {stepConfig.label}
                      </div>
                    )
                  }

                  // Upcoming — clickable
                  return (
                    <button
                      key={step}
                      onClick={() => void handleStatusClick(step)}
                      disabled={!!statusUpdating}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-body transition-colors hover:border-gray-400 disabled:opacity-50"
                      style={{ background: 'white', border: '1px solid #E5E7EB', color: '#888780' }}
                    >
                      {isUpdating && (
                        <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      )}
                      {stepConfig.label}
                    </button>
                  )
                })}
              </div>

              {job.status !== 'cancelled' && job.status !== 'complete' && (
                <button
                  onClick={() => void handleCancel()}
                  className="font-body mt-3 text-[13px] hover:underline"
                  style={{ color: '#E24B4A' }}
                >
                  Cancel this job
                </button>
              )}
            </Card>

            {/* Scheduling */}
            <Card>
              <CardTitle>Scheduling</CardTitle>
              <div className="space-y-4">
                <div>
                  <FieldLabel>Scheduled Date</FieldLabel>
                  <input
                    type="date"
                    value={schedDate}
                    onChange={e => setSchedDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel>Scheduled Time</FieldLabel>
                  <input
                    type="time"
                    value={schedTime}
                    onChange={e => setSchedTime(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel>Estimated Duration</FieldLabel>
                  <select
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select duration...</option>
                    <option value="1 hour">1 hour</option>
                    <option value="2 hours">2 hours</option>
                    <option value="Half day (4 hours)">Half day (4 hours)</option>
                    <option value="Full day">Full day</option>
                    <option value="Multiple days">Multiple days</option>
                  </select>
                </div>

                <button
                  onClick={() => void handleSaveSchedule()}
                  disabled={scheduleSaving}
                  className="font-body px-6 py-2.5 rounded-lg text-[14px] text-white transition-opacity disabled:opacity-60"
                  style={{ background: '#1C3A2B' }}
                >
                  {scheduleSaving ? 'Saving...' : scheduleSaved ? 'Saved ✓' : 'Save Schedule'}
                </button>
              </div>
            </Card>

            {/* Crew notes */}
            <Card>
              <h2 className="font-heading text-[18px] text-gray-900 mb-1">Crew Notes</h2>
              <p className="font-body text-[13px] text-gray-400 mb-4">Visible to crew on site</p>
              <textarea
                rows={5}
                value={crewNotes}
                onChange={e => setCrewNotes(e.target.value)}
                onBlur={() => void handleNotesSave()}
                placeholder="Access instructions, hazards, gate codes, customer preferences..."
                className={`${inputClass} resize-none`}
              />
              <div className="mt-1 h-4">
                {notesSaving && <p className="font-body text-[12px] text-gray-400">Saving...</p>}
                {!notesSaving && notesSaved && <p className="font-body text-[12px] text-green-700">Saved ✓</p>}
                {!notesSaving && notesError && <p className="font-body text-[12px] text-red-600">Failed to save</p>}
              </div>
            </Card>

            {/* On-site photos */}
            <Card>
              <h2 className="font-heading text-[18px] text-gray-900 mb-1">On-Site Photos</h2>
              <p className="font-body text-[13px] text-gray-400 mb-4">
                {onsitePhotos.length} photo{onsitePhotos.length !== 1 ? 's' : ''} logged by crew
              </p>
              {onsitePhotos.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <Camera size={32} className="text-gray-300 mb-2" />
                  <p className="font-body text-[14px] text-gray-400">No on-site photos yet</p>
                  <p className="font-body text-[12px] text-gray-300 mt-1">Added by crew during the job</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {onsitePhotos.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => { setLightboxUrls(onsitePhotos); setLightboxIdx(i) }}
                      className="relative aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-gold focus:ring-2 focus:ring-gold focus:outline-none"
                    >
                      <Image src={url} alt={`On-site photo ${i + 1}`} fill className="object-cover" sizes="160px" />
                    </button>
                  ))}
                </div>
              )}
            </Card>

            {/* Complete job button */}
            {job.status === 'in_progress' && (
              <button
                onClick={() => void handleComplete()}
                disabled={completing}
                className="font-heading w-full flex items-center justify-center gap-2 rounded-xl py-4 text-white uppercase tracking-wider transition-opacity disabled:opacity-60 mb-4"
                style={{ background: '#1C3A2B', fontSize: 16 }}
              >
                <CheckCircle size={20} />
                {completing ? 'Generating report...' : 'Mark Job Complete & Generate Report'}
              </button>
            )}

            {job.status === 'complete' && job.report_generated && (
              <Link
                href={`/admin/jobs/${id}/report`}
                className="font-body w-full flex items-center justify-center gap-2 rounded-xl py-4 mb-4 font-bold text-[14px] transition-colors hover:bg-gray-50"
                style={{ border: '1.5px solid #1C3A2B', color: '#1C3A2B' }}
              >
                <FileText size={18} />
                View Job Report
              </Link>
            )}
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="w-full lg:w-80 lg:sticky lg:top-6 flex-shrink-0">

            {/* Customer info */}
            <Card>
              <CardTitle>Customer</CardTitle>
              <div className="space-y-0 divide-y divide-gray-100">
                {[
                  { label: 'Name', value: job.customer_name, link: null },
                  { label: 'Phone', value: job.customer_phone, link: `tel:${job.customer_phone}` },
                  { label: 'Email', value: job.customer_email, link: `mailto:${job.customer_email}` },
                  { label: 'Address', value: job.property_address, link: null },
                ].map(({ label, value, link }) =>
                  value ? (
                    <div key={label} className="flex items-start justify-between gap-3 py-2">
                      <span className="font-body text-[12px] text-gray-400 flex-shrink-0 pt-0.5">{label}</span>
                      {link ? (
                        <a
                          href={link}
                          className="font-body text-[13px] truncate text-right"
                          style={{ color: '#C8922A' }}
                        >
                          {value}
                        </a>
                      ) : (
                        <span className="font-body text-[13px] text-gray-800 text-right">{value}</span>
                      )}
                    </div>
                  ) : null
                )}
              </div>

              {(job.customer_phone || job.customer_email) && (
                <div className="flex gap-2 mt-4">
                  {job.customer_phone && (
                    <a
                      href={`tel:${job.customer_phone}`}
                      className="flex-1 text-center px-3 py-2 text-white text-[13px] font-medium rounded-lg transition-opacity hover:opacity-90"
                      style={{ background: '#1C3A2B' }}
                    >
                      Call
                    </a>
                  )}
                  {job.customer_email && (
                    <a
                      href={`mailto:${job.customer_email}?subject=Your Gordon Pro Tree Service Job`}
                      className="flex-1 text-center px-3 py-2 text-[13px] font-medium rounded-lg border border-gray-200 text-gray-700 hover:border-gray-400 transition-colors"
                    >
                      Email
                    </a>
                  )}
                </div>
              )}
            </Card>

            {/* AI assessment */}
            <Card>
              <CardTitle>AI Assessment</CardTitle>
              {ai && !ai.no_tree_detected ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="font-heading text-[20px] text-gray-900">{ai.species_name}</span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                        ai.species_confidence === 'high' ? 'bg-green-100 text-green-700' :
                        ai.species_confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {ai.species_confidence} confidence
                    </span>
                  </div>
                  {ai.species_description && (
                    <p className="font-body text-[13px] text-gray-500 leading-relaxed line-clamp-3 mb-3">
                      {ai.species_description}
                    </p>
                  )}
                  {ai.flags.length > 0 && (
                    <div className="mt-3">
                      <p className="font-body font-bold text-[13px] text-gray-700 mb-2">Flags</p>
                      <div className="space-y-1.5">
                        {ai.flags.map((flag, i) => (
                          <div
                            key={i}
                            className={`flex items-start gap-2 text-[12px] px-3 py-2 rounded-lg ${
                              flag.severity === 'stop' ? 'bg-red-50 text-red-700' :
                              flag.severity === 'caution' ? 'bg-amber-50 text-amber-800' :
                              'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {flag.severity === 'stop' && <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />}
                            {flag.severity === 'caution' && <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />}
                            {flag.severity === 'info' && <Info size={13} className="flex-shrink-0 mt-0.5" />}
                            {flag.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <a
                    href={`/results/${job.submission_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-body inline-flex items-center gap-1.5 text-[13px] mt-3"
                    style={{ color: '#C8922A' }}
                  >
                    <ExternalLink size={13} />
                    View full assessment
                  </a>
                </>
              ) : (
                <div className="py-4 text-center">
                  <p className="font-body text-[13px] text-gray-400">
                    {ai?.no_tree_detected ? 'No tree detected in submitted photos' : 'Analysis pending'}
                  </p>
                </div>
              )}
            </Card>

            {/* Submitted photos */}
            <Card>
              <CardTitle>Submitted Photos</CardTitle>
              {submittedPhotos.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {submittedPhotos.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => { setLightboxUrls(submittedPhotos); setLightboxIdx(i) }}
                      className="relative aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-gold focus:ring-2 focus:ring-gold focus:outline-none"
                    >
                      <Image src={url} alt={`Submitted photo ${i + 1}`} fill className="object-cover" sizes="160px" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="font-body text-[13px] text-gray-400">No photos submitted</p>
                </div>
              )}
            </Card>

            {/* View report button (right column) */}
            {job.report_generated && (
              <Link
                href={`/admin/jobs/${id}/report`}
                className="font-body w-full flex items-center justify-center gap-2 rounded-xl py-3 font-bold text-[14px] transition-colors hover:bg-gray-50"
                style={{ border: '1.5px solid #1C3A2B', color: '#1C3A2B' }}
              >
                <FileText size={16} />
                View Job Report
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrls.length > 0 && (
        <Lightbox
          urls={lightboxUrls}
          initial={lightboxIdx}
          onClose={() => setLightboxUrls([])}
        />
      )}

      {/* Toast */}
      {toast && <Toast toast={toast} onDismiss={dismissToast} />}
    </div>
  )
}
