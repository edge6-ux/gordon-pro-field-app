'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Briefcase, MapPin, TreePine, Users, X, Trash2, Scissors, Circle, Zap, Layers, HelpCircle } from 'lucide-react'
import type { TreeSubmission, Flag, Job, JobStatus, Crew } from '@/lib/types'
import { JOB_STATUS_CONFIG } from '@/lib/types'
import { getPipelineSteps, getStatusConfig } from '@/lib/jobs'

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20
const AUTH_EXP_KEY = 'gp_admin_exp'

const SERVICE_OPTIONS = [
  { id: 'Tree Removal', label: 'Tree Removal', Icon: TreePine },
  { id: 'Tree Trimming & Pruning', label: 'Tree Trimming & Pruning', Icon: Scissors },
  { id: 'Stump Grinding', label: 'Stump Grinding', Icon: Circle },
  { id: 'Storm Damage / Emergency', label: 'Storm Damage / Emergency', Icon: Zap },
  { id: 'Land Clearing', label: 'Land Clearing', Icon: Layers },
  { id: 'Not Sure — I Need Advice', label: 'Not Sure — I Need Advice', Icon: HelpCircle },
] as const

type AdminView = 'submissions' | 'pipeline'

type SubmissionWithJob = TreeSubmission & {
  job: { id: string; status: JobStatus; reference_code: string } | null
}

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Customer', value: 'source:customer' },
  { label: 'Operator', value: 'source:operator' },
  { label: 'Flagged', value: 'flagged' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function topSeverity(flags: Flag[] = []): 'stop' | 'caution' | 'info' | null {
  if (flags.some(f => f.severity === 'stop')) return 'stop'
  if (flags.some(f => f.severity === 'caution')) return 'caution'
  if (flags.some(f => f.severity === 'info')) return 'info'
  return null
}

function cardBorderClass(flags: Flag[] = []) {
  const sev = topSeverity(flags)
  if (sev === 'stop') return 'border-l-red-500'
  if (sev === 'caution') return 'border-l-yellow-400'
  return 'border-l-green-600'
}

function flagBadgeClass(severity: string) {
  if (severity === 'stop') return 'bg-red-100 text-red-700'
  if (severity === 'caution') return 'bg-yellow-100 text-yellow-700'
  return 'bg-blue-100 text-blue-700'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
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

// ── Small components ──────────────────────────────────────────────────────────

function Spinner({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-4 h-4 border-2' : 'w-8 h-8 border-4'
  return <div className={`${cls} border-green-700 border-t-transparent rounded-full animate-spin`} />
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-gray-200 p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex gap-2 items-center">
            <div className="h-4 bg-gray-200 rounded-full w-32" />
            <div className="h-4 bg-gray-100 rounded-full w-16" />
            <div className="h-4 bg-gray-100 rounded-full w-14" />
          </div>
          <div className="h-3 bg-gray-100 rounded w-4/5" />
          <div className="h-3 bg-gray-100 rounded w-1/3" />
        </div>
        <div className="w-5 h-5 bg-gray-100 rounded mt-0.5" />
      </div>
    </div>
  )
}

// ── Job Pipeline ──────────────────────────────────────────────────────────────

function JobCard({ job, onClick }: { job: Job; onClick: () => void }) {
  const flags = job.submission?.ai_result?.flags ?? []
  const hasStopFlag = flags.some(f => f.severity === 'stop')
  const species = job.submission?.ai_result?.species_name

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl p-3 mb-2 cursor-pointer transition-shadow hover:shadow-md hover:border-gray-300"
    >
      <div className="flex items-center gap-1">
        <span className="font-semibold text-[13px] text-gray-900 truncate flex-1">{job.customer_name}</span>
        {hasStopFlag && (
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#E24B4A' }} />
        )}
      </div>
      <div className="flex items-center gap-1 mt-1">
        <MapPin size={11} className="text-gray-400 flex-shrink-0" />
        <span className="text-[11px] text-gray-400 truncate">{job.property_address}</span>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="font-mono text-[10px] text-gray-400">{job.reference_code}</span>
        <span className="text-[10px] text-gray-400">{timeAgo(job.created_at)}</span>
      </div>
      {job.assigned_to && (
        <div className="flex items-center gap-1 mt-1">
          <Users size={10} className="text-gray-400 flex-shrink-0" />
          <span className="text-[10px] text-gray-500 truncate">{job.assigned_to}</span>
        </div>
      )}
      {species && (
        <div className="flex items-center gap-1 mt-2 pt-2" style={{ borderTop: '1px solid #F3F4F6' }}>
          <TreePine size={11} color="#C8922A" className="flex-shrink-0" />
          <span className="text-[11px] truncate" style={{ color: '#C8922A' }}>{species}</span>
        </div>
      )}
    </div>
  )
}

function PipelineSkeleton() {
  const columns = getPipelineSteps()
  return (
    <div className="overflow-x-auto pb-4">
      <div style={{ display: 'flex', gap: 16, minWidth: 1180 }}>
        {columns.map(col => (
          <div key={col} style={{ minWidth: 220, flex: '0 0 220px' }}>
            <div className="h-8 bg-gray-100 rounded-lg animate-pulse mb-3" />
            {[1, 2, 3].map(j => (
              <div key={j} className="bg-white border border-gray-200 rounded-xl p-3 mb-2 animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-2 bg-gray-100 rounded w-full mb-2" />
                <div className="h-2 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function JobPipeline({
  jobs,
  loading,
  error,
  onRetry,
}: {
  jobs: Job[]
  loading: boolean
  error: boolean
  onRetry: () => void
}) {
  const router = useRouter()
  const columns = getPipelineSteps()

  const grouped = useMemo(() =>
    jobs.reduce((acc, job) => {
      const key = job.status
      acc[key] = [...(acc[key] ?? []), job]
      return acc
    }, {} as Partial<Record<JobStatus, Job[]>>)
  , [jobs])

  if (loading) return <PipelineSkeleton />

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
        <p className="text-sm text-gray-500 mb-3">Failed to load jobs</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-green-800 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div style={{ display: 'flex', gap: 16, minWidth: 1180 }}>
        {columns.map(status => {
          const config = getStatusConfig(status)
          const columnJobs = grouped[status] ?? []

          return (
            <div key={status} style={{ minWidth: 220, flex: '0 0 220px', display: 'flex', flexDirection: 'column', minHeight: 400 }}>
              {/* Column header */}
              <div
                className="flex items-center justify-between mb-3 pb-3"
                style={{ borderBottom: '1px solid #E5E7EB' }}
              >
                <span className="font-semibold text-[13px]" style={{ color: config.color === '#FFFFFF' ? '#1C3A2B' : config.color }}>
                  {config.label}
                </span>
                <span
                  className="font-bold text-[12px] px-2.5 py-0.5 rounded-full"
                  style={{ background: config.bg, color: config.color === '#FFFFFF' ? '#1C3A2B' : config.color }}
                >
                  {columnJobs.length}
                </span>
              </div>

              {/* Job cards */}
              {columnJobs.length === 0 ? (
                <div className="flex-1 flex items-start justify-center pt-8">
                  <p className="text-[13px] text-gray-400">
                    No {config.label.toLowerCase()} jobs
                  </p>
                </div>
              ) : (
                columnJobs.map(job => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onClick={() => router.push(`/admin/jobs/${job.id}`)}
                  />
                ))
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Submission Card ───────────────────────────────────────────────────────────

interface CardProps {
  sub: TreeSubmission
  job: SubmissionWithJob['job']
  expanded: boolean
  flashing: boolean
  notesStatus: 'saving' | 'saved' | 'error' | null
  notesDraft: string
  onToggle: () => void
  onNotesDraftChange: (val: string) => void
  onNotesSave: () => void
  onPhotoClick: (url: string) => void
}

function SubmissionCard({
  sub, job, expanded, flashing, notesStatus,
  notesDraft, onToggle, onNotesDraftChange, onNotesSave, onPhotoClick,
}: CardProps) {
  const flags = sub.ai_result?.flags ?? []
  const severity = topSeverity(flags)
  const borderClass = cardBorderClass(flags)
  const jobConfig = job ? JOB_STATUS_CONFIG[job.status] : null

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 border-l-4 ${borderClass} overflow-hidden ${flashing ? 'flash-new' : ''}`}
    >
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-4 flex items-start gap-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{sub.customer_name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sub.source === 'operator' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
              {sub.source === 'operator' ? 'Operator' : 'Customer'}
            </span>
            {severity === 'stop' && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
                ⚠ Stop Flag
              </span>
            )}
            {severity === 'caution' && !flags.some(f => f.severity === 'stop') && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700">
                ⚠ Caution
              </span>
            )}
            {/* Job status pill */}
            {jobConfig && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ background: jobConfig.bg, color: jobConfig.color === '#FFFFFF' ? '#1C3A2B' : jobConfig.color }}
              >
                {jobConfig.label}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1 truncate">{sub.property_address}</p>
          <p className="text-xs text-gray-400 mt-0.5">{fmtDate(sub.created_at)}</p>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-5 space-y-5">
          {/* Contact + tree details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contact</p>
              <p className="text-gray-900 font-medium">{sub.customer_name}</p>
              <a href={`tel:${sub.customer_phone}`} className="block text-green-700 hover:underline">
                {sub.customer_phone}
              </a>
              {sub.customer_email && (
                <a href={`mailto:${sub.customer_email}`} className="block text-green-700 hover:underline truncate">
                  {sub.customer_email}
                </a>
              )}
              <p className="text-gray-600 pt-1">{sub.property_address}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Job Details</p>
              {job?.reference_code && (
                <p className="font-mono text-xs text-gray-500 tracking-wide">{job.reference_code}</p>
              )}
              {sub.service_type && (
                <p className="text-gray-800 font-medium">{sub.service_type}</p>
              )}
              {sub.tree_count && sub.tree_count !== 'N/A' && (
                <p className="text-gray-600">Trees: {sub.tree_count}</p>
              )}
              {sub.urgency && (
                <p className={`font-medium text-sm ${
                  sub.urgency === 'Emergency'
                    ? 'text-red-600'
                    : sub.urgency === 'Soon'
                    ? 'text-amber-600'
                    : 'text-gray-600'
                }`}>
                  {sub.urgency === 'Emergency' ? '⚡ Emergency' : sub.urgency}
                </p>
              )}
              {sub.best_time_to_call && (
                <p className="text-gray-500 text-xs pt-1">Best time to call: {sub.best_time_to_call}</p>
              )}
              {sub.additional_notes && (
                <p className="text-gray-500 text-xs pt-1 italic">&ldquo;{sub.additional_notes}&rdquo;</p>
              )}
            </div>
          </div>

          {sub.additional_notes && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Customer Notes</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{sub.additional_notes}</p>
            </div>
          )}

          {/* Photos */}
          {sub.photo_urls && sub.photo_urls.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Photos ({sub.photo_urls.length})
              </p>
              <div className="flex gap-2 flex-wrap">
                {sub.photo_urls.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => onPhotoClick(url)}
                    className="focus:outline-none focus:ring-2 focus:ring-green-700 rounded-lg"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Photo ${i + 1}`}
                      className="w-20 h-20 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI Assessment */}
          {sub.ai_result?.no_tree_detected && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2.5 text-sm text-yellow-800">
              ⚠️ No tree detected in submitted photos
            </div>
          )}

          {sub.ai_result && !sub.ai_result.no_tree_detected && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">AI Assessment</p>
              <div className="bg-gray-50 rounded-lg px-3 py-3 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900 text-sm">{sub.ai_result.species_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    sub.ai_result.species_confidence === 'high' ? 'bg-green-100 text-green-700' :
                    sub.ai_result.species_confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {sub.ai_result.species_confidence} confidence
                  </span>
                </div>
                {sub.ai_result.species_description && (
                  <p className="text-xs text-gray-600">{sub.ai_result.species_description}</p>
                )}
                {flags.length > 0 && (
                  <div className="space-y-1.5">
                    {flags.map((flag, i) => (
                      <div key={i} className={`text-xs px-3 py-1.5 rounded-lg font-medium ${flagBadgeClass(flag.severity)}`}>
                        {flag.severity === 'stop' ? '🛑' : flag.severity === 'caution' ? '⚠️' : 'ℹ️'} {flag.message}
                      </div>
                    ))}
                  </div>
                )}
                {sub.ai_result.crew_tips && sub.ai_result.crew_tips.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Crew Tips</p>
                    <ul className="space-y-1">
                      {sub.ai_result.crew_tips.map((tip, i) => (
                        <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                          <span className="text-green-600 flex-shrink-0">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {!sub.ai_result && (
            <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-400">
              AI analysis pending
            </div>
          )}

          {/* Internal Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Internal Notes
            </label>
            <textarea
              value={notesDraft}
              onChange={e => onNotesDraftChange(e.target.value)}
              onBlur={onNotesSave}
              rows={3}
              placeholder="Add internal notes…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 resize-none"
            />
            {notesStatus === 'saving' && <p className="text-xs text-gray-400 mt-1">Saving…</p>}
            {notesStatus === 'saved' && <p className="text-xs text-green-600 mt-1">Saved ✓</p>}
            {notesStatus === 'error' && (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-red-600">Failed to save</p>
                <button onClick={onNotesSave} className="text-xs text-green-700 underline">Retry</button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1 flex-wrap">
            <a
              href={`tel:${sub.customer_phone}`}
              className="flex-1 text-center px-3 py-2 bg-green-800 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Call
            </a>
            {sub.customer_email && (
              <a
                href={`mailto:${sub.customer_email}?subject=Your Gordon Pro Tree Service Assessment`}
                className="flex-1 text-center px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:border-green-700 hover:text-green-800 transition-colors"
              >
                Email
              </a>
            )}
            <a
              href={`/results/${sub.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:border-green-700 hover:text-green-800 transition-colors"
            >
              Full Report
            </a>
            {job && (
              <a
                href={`/admin/jobs/${job.id}`}
                className="flex-1 text-center px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:border-green-700 hover:text-green-800 transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <Briefcase size={14} />
                Manage Job
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminClient() {
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)

  const [view, setView] = useState<AdminView>('submissions')

  const [submissions, setSubmissions] = useState<TreeSubmission[]>([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [initialLoading, setInitialLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const [jobs, setJobs] = useState<Job[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [jobsError, setJobsError] = useState(false)

  const [crews, setCrews] = useState<Crew[]>([])
  const [showCrewPanel, setShowCrewPanel] = useState(false)
  const [newCrewName, setNewCrewName] = useState('')
  const [newCrewPin, setNewCrewPin] = useState('')
  const [crewCreating, setCrewCreating] = useState(false)

  const [showNewJobPanel, setShowNewJobPanel] = useState(false)
  const [newJobCreating, setNewJobCreating] = useState(false)
  const [newJob, setNewJob] = useState({
    customer_name: '', customer_phone: '', customer_email: '',
    property_address: '', services: [] as string[], other_service: '', assigned_to: '',
  })

  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set())
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({})
  const [notesStatus, setNotesStatus] = useState<Record<string, 'saving' | 'saved' | 'error' | null>>({})

  useEffect(() => {
    const exp = localStorage.getItem(AUTH_EXP_KEY)
    if (exp && parseInt(exp, 10) > Date.now()) setAuthed(true)
    setCheckingAuth(false)
  }, [])

  const loadSubmissions = useCallback(async (newOffset: number, append: boolean) => {
    if (append) setLoadingMore(true)
    else setInitialLoading(true)
    try {
      const res = await fetch(`/api/submissions?limit=${PAGE_SIZE}&offset=${newOffset}`)
      const json = await res.json() as { submissions: TreeSubmission[] }
      const items = json.submissions ?? []
      setSubmissions(prev => append ? [...prev, ...items] : items)
      setOffset(newOffset + items.length)
      setHasMore(items.length === PAGE_SIZE)
    } catch {
      // silent
    } finally {
      if (append) setLoadingMore(false)
      else setInitialLoading(false)
    }
  }, [])

  const loadJobs = useCallback(async () => {
    setJobsLoading(true)
    setJobsError(false)
    try {
      const res = await fetch('/api/jobs')
      const data = await res.json() as Job[]
      setJobs(Array.isArray(data) ? data : [])
    } catch {
      setJobsError(true)
    } finally {
      setJobsLoading(false)
    }
  }, [])

  const loadCrews = useCallback(async () => {
    try {
      const res = await fetch('/api/crews')
      const data = await res.json() as Crew[]
      setCrews(Array.isArray(data) ? data : [])
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    if (authed) {
      loadSubmissions(0, false)
      void loadJobs()
      void loadCrews()
    }
  }, [authed, loadSubmissions, loadJobs, loadCrews])

  useEffect(() => {
    if (!authed) return
    const poll = async () => {
      try {
        const res = await fetch(`/api/submissions?limit=5&offset=0`)
        const json = await res.json() as { submissions: TreeSubmission[] }
        const latest = json.submissions ?? []
        setSubmissions(prev => {
          const existingIds = new Set(prev.map(s => s.id))
          const newItems = latest.filter(s => !existingIds.has(s.id))
          if (newItems.length === 0) return prev
          setFlashIds(fids => {
            const next = new Set(fids)
            newItems.forEach(s => next.add(s.id))
            setTimeout(() => setFlashIds(f => {
              const n = new Set(f)
              newItems.forEach(s => n.delete(s.id))
              return n
            }), 3000)
            return next
          })
          return [...newItems, ...prev]
        })
      } catch { /* silent */ }
    }
    const interval = setInterval(() => { void poll() }, 30_000)
    return () => clearInterval(interval)
  }, [authed])

  const filtered = useMemo(() => {
    let list = submissions
    if (activeFilter !== 'all') {
      if (activeFilter.startsWith('source:')) {
        const s = activeFilter.slice(7)
        list = list.filter(sub => sub.source === s)
      } else if (activeFilter === 'flagged') {
        list = list.filter(sub =>
          (sub.ai_result?.flags ?? []).some(f => f.severity === 'stop' || f.severity === 'caution')
        )
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(sub =>
        sub.customer_name.toLowerCase().includes(q) ||
        sub.customer_phone.includes(q) ||
        sub.property_address.toLowerCase().includes(q)
      )
    }
    return list
  }, [submissions, activeFilter, searchQuery])

  const stats = useMemo(() => ({
    total: submissions.length,
    flagged: submissions.filter(s => (s.ai_result?.flags ?? []).some(f => f.severity === 'stop')).length,
    operator: submissions.filter(s => s.source === 'operator').length,
  }), [submissions])

  const activeJobsCount = useMemo(() =>
    jobs.filter(j => j.status === 'assigned' || j.status === 'in_progress').length
  , [jobs])

  const submissionsWithJobs: SubmissionWithJob[] = useMemo(() =>
    filtered.map(sub => {
      const match = jobs.find(j => j.submission_id === sub.id)
      return {
        ...sub,
        job: match ? { id: match.id, status: match.status, reference_code: match.reference_code } : null,
      }
    })
  , [filtered, jobs])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError(null)
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) { setLoginError('Incorrect password'); return }
      localStorage.setItem(AUTH_EXP_KEY, String(Date.now() + 24 * 60 * 60 * 1000))
      setAuthed(true)
    } catch {
      setLoginError('Connection error — try again')
    } finally {
      setLoginLoading(false)
    }
  }

  async function handleNotesSave(id: string) {
    if (!(id in notesDraft)) return
    setNotesStatus(prev => ({ ...prev, [id]: 'saving' }))
    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internal_notes: notesDraft[id] }),
      })
      if (res.ok) {
        const updated = await res.json() as TreeSubmission
        setSubmissions(prev => prev.map(s => s.id === id ? updated : s))
        setNotesStatus(prev => ({ ...prev, [id]: 'saved' }))
        setTimeout(() => setNotesStatus(prev => ({ ...prev, [id]: null })), 2000)
      } else {
        setNotesStatus(prev => ({ ...prev, [id]: 'error' }))
      }
    } catch {
      setNotesStatus(prev => ({ ...prev, [id]: 'error' }))
    }
  }

  function handleLogout() {
    localStorage.removeItem(AUTH_EXP_KEY)
    setAuthed(false)
    setSubmissions([])
    setJobs([])
    setCrews([])
    setOffset(0)
    setPassword('')
  }

  async function handleCreateCrew(e: React.FormEvent) {
    e.preventDefault()
    if (!newCrewName.trim()) return
    setCrewCreating(true)
    try {
      const res = await fetch('/api/crews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCrewName.trim(), pin: newCrewPin.trim() || '0000' }),
      })
      if (res.ok) {
        await loadCrews()
        setNewCrewName('')
        setNewCrewPin('')
      }
    } finally {
      setCrewCreating(false)
    }
  }

  async function handleDeleteCrew(id: string, name: string) {
    if (!window.confirm(`Delete crew "${name}"?`)) return
    await fetch(`/api/crews/${id}`, { method: 'DELETE' })
    await loadCrews()
  }

  async function handleCreateJob(e: React.FormEvent) {
    e.preventDefault()
    setNewJobCreating(true)
    const serviceType = [
      ...newJob.services,
      ...(newJob.other_service.trim() ? [newJob.other_service.trim()] : []),
    ].join(', ')
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: newJob.customer_name,
          customer_phone: newJob.customer_phone,
          customer_email: newJob.customer_email,
          property_address: newJob.property_address,
          service_type: serviceType,
          assigned_to: newJob.assigned_to,
        }),
      })
      if (res.ok) {
        await loadJobs()
        setShowNewJobPanel(false)
        setNewJob({ customer_name: '', customer_phone: '', customer_email: '', property_address: '', services: [], other_service: '', assigned_to: '' })
      }
    } finally {
      setNewJobCreating(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner />
      </div>
    )
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-900 px-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
          <div className="text-center mb-8">
            <h1 className="font-heading text-2xl font-bold text-green-900">Gordon Pro</h1>
            <p className="text-sm text-gray-500 mt-1">Admin Dashboard</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                placeholder="Enter admin password"
                autoFocus
                required
              />
            </div>
            {loginError && <p className="text-sm text-red-600">{loginError}</p>}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-green-800 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors"
            >
              {loginLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-900 text-white px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="font-heading text-lg font-bold">Gordon Pro Admin</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowNewJobPanel(true)}
            className="flex items-center gap-1.5 text-sm bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            + New Job
          </button>
          <button
            onClick={() => setShowCrewPanel(true)}
            className="flex items-center gap-1.5 text-sm text-green-300 hover:text-white transition-colors"
          >
            <Users size={15} />
            Crews
          </button>
          <button
            onClick={handleLogout}
            className="text-sm text-green-300 hover:text-white transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-green-900' },
            { label: 'Stop Flags', value: stats.flagged, color: 'text-red-600' },
            { label: 'Operator', value: stats.operator, color: 'text-indigo-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}

          {/* Active Jobs stat */}
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
            <div className="flex items-center gap-1.5">
              <Briefcase size={20} color="#C8922A" />
              {jobsLoading ? (
                <div className="h-7 w-8 bg-gray-100 rounded animate-pulse" />
              ) : (
                <p className={`text-2xl font-bold ${activeJobsCount > 0 ? 'text-[#C8922A]' : 'text-gray-700'}`}>
                  {activeJobsCount}
                </p>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Active jobs</p>
          </div>
        </div>

        {/* View toggle — desktop only */}
        <div className="hidden md:flex w-fit">
          <div className="flex p-1 rounded-xl" style={{ background: '#F1EFE8' }}>
            {(['submissions', 'pipeline'] as const).map(option => (
              <button
                key={option}
                onClick={() => setView(option)}
                className={`px-5 py-2 rounded-lg text-[14px] transition-all duration-150 ${
                  view === option
                    ? 'bg-white text-[#1A1A1A] font-medium shadow-sm'
                    : 'bg-transparent text-[#888780]'
                }`}
              >
                {option === 'submissions' ? 'Submissions' : 'Job Pipeline'}
              </button>
            ))}
          </div>
        </div>

        {/* Pipeline view — desktop only */}
        {view === 'pipeline' && (
          <div className="hidden md:block">
            <JobPipeline
              jobs={jobs}
              loading={jobsLoading}
              error={jobsError}
              onRetry={loadJobs}
            />
          </div>
        )}

        {/* Submissions view */}
        {(view === 'submissions' || true) && (
          <div className={view === 'pipeline' ? 'md:hidden' : ''}>
            {/* Search + filters */}
            <div className="space-y-3 mb-5">
              <input
                type="search"
                placeholder="Search by name, phone, or address…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-700"
              />
              <div className="flex gap-2 flex-wrap">
                {FILTERS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => setActiveFilter(f.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      activeFilter === f.value
                        ? 'bg-green-800 text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-green-700 hover:text-green-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Submission list */}
            {initialLoading ? (
              <div className="space-y-3">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : submissionsWithJobs.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
                No submissions match your filters.
              </div>
            ) : (
              <div className="space-y-3">
                {submissionsWithJobs.map(sub => (
                  <SubmissionCard
                    key={sub.id}
                    sub={sub}
                    job={sub.job}
                    expanded={expandedId === sub.id}
                    flashing={flashIds.has(sub.id)}
                    notesStatus={notesStatus[sub.id] ?? null}
                    notesDraft={notesDraft[sub.id] ?? sub.internal_notes ?? ''}
                    onToggle={() => setExpandedId(prev => prev === sub.id ? null : sub.id)}
                    onNotesDraftChange={val => setNotesDraft(prev => ({ ...prev, [sub.id]: val }))}
                    onNotesSave={() => handleNotesSave(sub.id)}
                    onPhotoClick={url => setLightboxUrl(url)}
                  />
                ))}

                {hasMore && (
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() => loadSubmissions(offset, true)}
                      disabled={loadingMore}
                      className="px-6 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-green-700 hover:text-green-800 disabled:opacity-60 transition-colors"
                    >
                      {loadingMore ? 'Loading…' : 'Load More'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Photo lightbox */}
      {/* New job panel */}
      {showNewJobPanel && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowNewJobPanel(false)} />
          <div className="bg-white w-96 h-full shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-heading text-[18px] text-gray-900">New Job</h2>
              <button onClick={() => setShowNewJobPanel(false)} className="text-gray-400 hover:text-gray-700 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newJob.customer_name}
                  onChange={e => setNewJob(j => ({ ...j, customer_name: e.target.value }))}
                  placeholder="Full name"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Property Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newJob.property_address}
                  onChange={e => setNewJob(j => ({ ...j, property_address: e.target.value }))}
                  placeholder="123 Main St, City, State"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={newJob.customer_phone}
                    onChange={e => setNewJob(j => ({ ...j, customer_phone: e.target.value }))}
                    placeholder="(555) 000-0000"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                  <input
                    type="email"
                    value={newJob.customer_email}
                    onChange={e => setNewJob(j => ({ ...j, customer_email: e.target.value }))}
                    placeholder="email@example.com"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  What&apos;s Needed
                </label>
                <div className="space-y-1.5">
                  {SERVICE_OPTIONS.map(({ id, label, Icon }) => {
                    const selected = newJob.services.includes(id)
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setNewJob(j => ({
                          ...j,
                          services: selected
                            ? j.services.filter(s => s !== id)
                            : [...j.services, id],
                        }))}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                          selected
                            ? 'bg-green-800 text-white'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        <Icon size={14} className="flex-shrink-0" />
                        {label}
                      </button>
                    )
                  })}

                  {/* Other — inline input styled like the other buttons */}
                  <div className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-colors ${
                    newJob.other_service
                      ? 'bg-green-800 border-green-800'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}>
                    <HelpCircle size={14} className={`flex-shrink-0 ${newJob.other_service ? 'text-white' : 'text-gray-500'}`} />
                    <input
                      type="text"
                      placeholder="Other — describe what's needed…"
                      value={newJob.other_service}
                      onChange={e => setNewJob(j => ({ ...j, other_service: e.target.value }))}
                      className={`flex-1 bg-transparent outline-none text-sm ${
                        newJob.other_service
                          ? 'text-white placeholder:text-green-200'
                          : 'text-gray-700 placeholder:text-gray-400'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Assign to Crew
                </label>
                <select
                  value={newJob.assigned_to}
                  onChange={e => setNewJob(j => ({ ...j, assigned_to: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 bg-white"
                >
                  <option value="">Unassigned</option>
                  {crews.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewJobPanel(false)}
                  className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-medium hover:border-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newJobCreating}
                  className="flex-1 bg-green-800 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors"
                >
                  {newJobCreating ? 'Creating…' : 'Create Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Crew management panel */}
      {showCrewPanel && (
        <div className="fixed inset-0 z-40 flex">
          <div
            className="flex-1 bg-black/40"
            onClick={() => setShowCrewPanel(false)}
          />
          <div className="bg-white w-80 h-full shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-heading text-[18px] text-gray-900">Manage Crews</h2>
              <button
                onClick={() => setShowCrewPanel(false)}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Create form */}
              <form onSubmit={handleCreateCrew} className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">New Crew</p>
                <input
                  type="text"
                  placeholder="Crew name"
                  value={newCrewName}
                  onChange={e => setNewCrewName(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="PIN (default: 0000)"
                  value={newCrewPin}
                  onChange={e => setNewCrewPin(e.target.value)}
                  maxLength={10}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                />
                <button
                  type="submit"
                  disabled={crewCreating || !newCrewName.trim()}
                  className="w-full bg-green-800 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors"
                >
                  {crewCreating ? 'Creating…' : 'Create Crew'}
                </button>
              </form>

              {/* Crew list */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  {crews.length === 0 ? 'No crews yet' : `${crews.length} crew${crews.length !== 1 ? 's' : ''}`}
                </p>
                <div className="space-y-2">
                  {crews.map(crew => (
                    <div
                      key={crew.id}
                      className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-3"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <Users size={13} className="text-green-700" />
                        </div>
                        <span className="text-sm font-medium text-gray-800">{crew.name}</span>
                      </div>
                      <button
                        onClick={() => void handleDeleteCrew(crew.id, crew.name)}
                        className="text-gray-300 hover:text-red-500 transition-colors p-1"
                        aria-label={`Delete ${crew.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-400 leading-relaxed">
                  Crews log in at <span className="font-mono text-gray-600">/crew</span> using their name and PIN to see assigned jobs.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Full size photo"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white text-2xl font-bold bg-black/40 rounded-full hover:bg-black/70 transition-colors"
            onClick={() => setLightboxUrl(null)}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
