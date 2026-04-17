'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { TreeSubmission, Flag } from '@/lib/types'

const PAGE_SIZE = 20
const AUTH_EXP_KEY = 'gp_admin_exp'

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'status:pending' },
  { label: 'Reviewed', value: 'status:reviewed' },
  { label: 'Quoted', value: 'status:quoted' },
  { label: 'Scheduled', value: 'status:scheduled' },
  { label: 'Completed', value: 'status:completed' },
  { label: 'Customer', value: 'source:customer' },
  { label: 'Operator', value: 'source:operator' },
  { label: 'Flagged', value: 'flagged' },
]

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  reviewed: 'Reviewed',
  quoted: 'Quoted',
  scheduled: 'Scheduled',
  completed: 'Completed',
}

const HEIGHT_LABELS: Record<string, string> = {
  under_20ft: 'Under 20 ft',
  '20_40ft': '20–40 ft',
  '40_60ft': '40–60 ft',
  over_60ft: 'Over 60 ft',
}

const LEAN_LABELS: Record<string, string> = {
  none: 'None', slight: 'Slight', moderate: 'Moderate', severe: 'Severe',
}

const PROX_LABELS: Record<string, string> = {
  none: 'None', close: 'Close', very_close: 'Very Close', contact: 'Contact',
}

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

function statusBadgeClass(status: string) {
  switch (status) {
    case 'pending': return 'bg-gray-100 text-gray-600'
    case 'reviewed': return 'bg-blue-100 text-blue-700'
    case 'quoted': return 'bg-purple-100 text-purple-700'
    case 'scheduled': return 'bg-orange-100 text-orange-700'
    case 'completed': return 'bg-green-100 text-green-700'
    default: return 'bg-gray-100 text-gray-600'
  }
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

// ── Sub-component ────────────────────────────────────────────────────────────

interface CardProps {
  sub: TreeSubmission
  expanded: boolean
  flashing: boolean
  statusSaving: boolean
  statusSaved: boolean
  notesStatus: 'saving' | 'saved' | 'error' | null
  notesDraft: string
  onToggle: () => void
  onStatusChange: (status: string) => void
  onNotesDraftChange: (val: string) => void
  onNotesSave: () => void
  onPhotoClick: (url: string) => void
}

function SubmissionCard({
  sub, expanded, flashing, statusSaving, statusSaved, notesStatus,
  notesDraft, onToggle, onStatusChange, onNotesDraftChange, onNotesSave, onPhotoClick,
}: CardProps) {
  const flags = sub.ai_result?.flags ?? []
  const severity = topSeverity(flags)
  const borderClass = cardBorderClass(flags)

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
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadgeClass(sub.status)}`}>
              {STATUS_LABELS[sub.status]}
            </span>
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
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tree Details</p>
              <p className="text-gray-800">{HEIGHT_LABELS[sub.tree_height] ?? sub.tree_height}</p>
              <p className="text-gray-600">Lean: {LEAN_LABELS[sub.lean_direction] ?? sub.lean_direction}</p>
              <p className="text-gray-600">Proximity: {PROX_LABELS[sub.proximity_to_structures] ?? sub.proximity_to_structures}</p>
              {sub.tree_location && (
                <p className="text-gray-500 text-xs pt-1">{sub.tree_location}</p>
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

          {/* Status + Internal Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Status
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={sub.status}
                  onChange={e => onStatusChange(e.target.value)}
                  disabled={statusSaving}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-700 disabled:opacity-60"
                >
                  {(['pending', 'reviewed', 'quoted', 'scheduled', 'completed'] as const).map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
                {statusSaving && <Spinner size="sm" />}
                {!statusSaving && statusSaved && (
                  <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>

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
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
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
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function AdminClient() {
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)

  const [submissions, setSubmissions] = useState<TreeSubmission[]>([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [initialLoading, setInitialLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set())
  const [statusSaving, setStatusSaving] = useState<Record<string, boolean>>({})
  const [statusSaved, setStatusSaved] = useState<Record<string, boolean>>({})
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

  useEffect(() => {
    if (authed) loadSubmissions(0, false)
  }, [authed, loadSubmissions])

  useEffect(() => {
    if (!authed) return
    const channel = supabase
      .channel('admin-new-submissions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'submissions' },
        (payload) => {
          const newSub = payload.new as TreeSubmission
          setSubmissions(prev => [newSub, ...prev])
          setFlashIds(prev => new Set([...prev, newSub.id]))
          setTimeout(() => {
            setFlashIds(prev => {
              const next = new Set(prev)
              next.delete(newSub.id)
              return next
            })
          }, 3000)
        }
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [authed])

  const filtered = useMemo(() => {
    let list = submissions
    if (activeFilter !== 'all') {
      if (activeFilter.startsWith('status:')) {
        const s = activeFilter.slice(7)
        list = list.filter(sub => sub.status === s)
      } else if (activeFilter.startsWith('source:')) {
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
    pending: submissions.filter(s => s.status === 'pending').length,
    flagged: submissions.filter(s => (s.ai_result?.flags ?? []).some(f => f.severity === 'stop')).length,
    operator: submissions.filter(s => s.source === 'operator').length,
  }), [submissions])

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

  async function handleStatusChange(id: string, status: string) {
    setStatusSaving(prev => ({ ...prev, [id]: true }))
    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        const updated = await res.json() as TreeSubmission
        setSubmissions(prev => prev.map(s => s.id === id ? updated : s))
        setStatusSaved(prev => ({ ...prev, [id]: true }))
        setTimeout(() => setStatusSaved(prev => ({ ...prev, [id]: false })), 1500)
      } else {
        // surface error via flash
        setStatusSaved(prev => ({ ...prev, [id]: false }))
      }
    } finally {
      setStatusSaving(prev => ({ ...prev, [id]: false }))
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
    setOffset(0)
    setPassword('')
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
        <button
          onClick={handleLogout}
          className="text-sm text-green-300 hover:text-white transition-colors"
        >
          Sign Out
        </button>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-green-900' },
            { label: 'Pending', value: stats.pending, color: 'text-gray-700' },
            { label: 'Stop Flags', value: stats.flagged, color: 'text-red-600' },
            { label: 'Operator', value: stats.operator, color: 'text-indigo-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Search + filters */}
        <div className="space-y-3">
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
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
            No submissions match your filters.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(sub => (
              <SubmissionCard
                key={sub.id}
                sub={sub}
                expanded={expandedId === sub.id}
                flashing={flashIds.has(sub.id)}
                statusSaving={!!statusSaving[sub.id]}
                statusSaved={!!statusSaved[sub.id]}
                notesStatus={notesStatus[sub.id] ?? null}
                notesDraft={notesDraft[sub.id] ?? sub.internal_notes ?? ''}
                onToggle={() => setExpandedId(prev => prev === sub.id ? null : sub.id)}
                onStatusChange={status => handleStatusChange(sub.id, status)}
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

      {/* Photo lightbox */}
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
