'use client'

import { useState, useEffect, useCallback } from 'react'
import { MapPin, Calendar, AlertTriangle, ChevronRight, LogOut } from 'lucide-react'
import type { Job, Crew } from '@/lib/types'
import { JOB_STATUS_CONFIG } from '@/lib/types'

const SESS_KEY = 'gp_crew_sess'
const ACTIVE_STATUSES = ['submitted', 'reviewed', 'assigned', 'in_progress'] as const

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function topFlag(flags: { severity: string }[] = []) {
  if (flags.some(f => f.severity === 'stop')) return 'stop'
  if (flags.some(f => f.severity === 'caution')) return 'caution'
  return null
}

function StatusBadge({ status }: { status: Job['status'] }) {
  const cfg = JOB_STATUS_CONFIG[status]
  return (
    <span
      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color === '#FFFFFF' ? '#1C3A2B' : cfg.color }}
    >
      {cfg.label}
    </span>
  )
}

function JobCard({ job }: { job: Job }) {
  const flags = job.submission?.ai_result?.flags ?? []
  const flag = topFlag(flags)

  return (
    <a
      href={job.submission_id ? `/results/${job.submission_id}` : '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
      style={flag === 'stop' ? { borderLeftWidth: 4, borderLeftColor: '#E24B4A' } : flag === 'caution' ? { borderLeftWidth: 4, borderLeftColor: '#F59E0B' } : {}}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <StatusBadge status={job.status} />
            <span className="font-mono text-[11px] text-gray-400">{job.reference_code}</span>
            {flag === 'stop' && (
              <span className="flex items-center gap-0.5 text-[11px] font-semibold text-red-600">
                <AlertTriangle size={11} /> Stop flag
              </span>
            )}
            {flag === 'caution' && !flags.some(f => f.severity === 'stop') && (
              <span className="flex items-center gap-0.5 text-[11px] font-semibold text-amber-600">
                <AlertTriangle size={11} /> Caution
              </span>
            )}
          </div>
          <p className="font-semibold text-[15px] text-gray-900 truncate">{job.customer_name || 'Field Assessment'}</p>
          {job.property_address && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={12} className="text-gray-400 flex-shrink-0" />
              <span className="text-[13px] text-gray-500 truncate">{job.property_address}</span>
            </div>
          )}
          {job.scheduled_date && (
            <div className="flex items-center gap-1 mt-1">
              <Calendar size={12} className="text-gray-400 flex-shrink-0" />
              <span className="text-[13px] text-gray-600">
                {fmtDate(job.scheduled_date)}
                {job.scheduled_time && ` at ${job.scheduled_time}`}
                {job.estimated_duration && ` · ${job.estimated_duration}`}
              </span>
            </div>
          )}
          {job.submission?.ai_result?.species_name && (
            <p className="text-[12px] text-amber-700 mt-1 truncate">
              {job.submission.ai_result.species_name}
            </p>
          )}
          {job.crew_notes && (
            <p className="text-[12px] text-gray-500 mt-1 italic line-clamp-2">
              &ldquo;{job.crew_notes}&rdquo;
            </p>
          )}
        </div>
        <ChevronRight size={16} className="text-gray-300 flex-shrink-0 mt-1" />
      </div>
    </a>
  )
}

export default function CrewPage() {
  const [crews, setCrews] = useState<Crew[]>([])
  const [crewsLoading, setCrewsLoading] = useState(true)

  const [session, setSession] = useState<{ id: string; name: string } | null>(null)
  const [selectedCrewId, setSelectedCrewId] = useState('')
  const [pin, setPin] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)

  const [jobs, setJobs] = useState<Job[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem(SESS_KEY)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { id: string; name: string; exp: number }
        if (parsed.exp > Date.now()) setSession({ id: parsed.id, name: parsed.name })
        else localStorage.removeItem(SESS_KEY)
      } catch {
        localStorage.removeItem(SESS_KEY)
      }
    }
  }, [])

  useEffect(() => {
    fetch('/api/crews')
      .then(r => r.json())
      .then((data: Crew[]) => setCrews(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setCrewsLoading(false))
  }, [])

  const loadJobs = useCallback(async (crewName: string) => {
    setJobsLoading(true)
    try {
      const res = await fetch(`/api/jobs?assigned_to=${encodeURIComponent(crewName)}`)
      const data = await res.json() as Job[]
      const active = (Array.isArray(data) ? data : []).filter(j =>
        (ACTIVE_STATUSES as readonly string[]).includes(j.status)
      )
      setJobs(active)
    } catch {
      setJobs([])
    } finally {
      setJobsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session) void loadJobs(session.name)
  }, [session, loadJobs])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCrewId || !pin) return
    setLoginLoading(true)
    setLoginError(null)
    try {
      const res = await fetch(`/api/crews/${selectedCrewId}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      if (!res.ok) { setLoginError('Incorrect PIN'); return }
      const crew = await res.json() as { id: string; name: string }
      const sess = { id: crew.id, name: crew.name, exp: Date.now() + 24 * 60 * 60 * 1000 }
      localStorage.setItem(SESS_KEY, JSON.stringify(sess))
      setSession({ id: crew.id, name: crew.name })
    } catch {
      setLoginError('Connection error — try again')
    } finally {
      setLoginLoading(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem(SESS_KEY)
    setSession(null)
    setJobs([])
    setPin('')
    setSelectedCrewId('')
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-900 px-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
          <div className="text-center mb-8">
            <h1 className="font-heading text-2xl font-bold text-green-900">Gordon Pro</h1>
            <p className="text-sm text-gray-500 mt-1">Crew Portal</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Crew</label>
              {crewsLoading ? (
                <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
              ) : crews.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-2">No crews set up yet.</p>
              ) : (
                <select
                  value={selectedCrewId}
                  onChange={e => setSelectedCrewId(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 bg-white"
                >
                  <option value="">Select crew...</option>
                  {crews.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PIN</label>
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="Enter your crew PIN"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
              />
            </div>
            {loginError && <p className="text-sm text-red-600">{loginError}</p>}
            <button
              type="submit"
              disabled={loginLoading || !selectedCrewId}
              className="w-full bg-green-800 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors"
            >
              {loginLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  const byStatus = ACTIVE_STATUSES.reduce((acc, s) => {
    acc[s] = jobs.filter(j => j.status === s)
    return acc
  }, {} as Record<string, Job[]>)

  const scheduled = jobs.filter(j => j.scheduled_date).sort(
    (a, b) => a.scheduled_date!.localeCompare(b.scheduled_date!)
  )
  const unscheduled = jobs.filter(j => !j.scheduled_date)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-900 text-white px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="font-heading text-lg font-bold">Gordon Pro</h1>
          <p className="text-green-300 text-xs">{session.name}</p>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-green-300 hover:text-white transition-colors">
          <LogOut size={14} />
          Sign Out
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">
            {jobs.length === 0 ? 'No active jobs' : `${jobs.length} active job${jobs.length !== 1 ? 's' : ''}`}
          </h2>
          <button onClick={() => void loadJobs(session.name)} className="text-sm text-green-700 hover:underline">
            Refresh
          </button>
        </div>

        {jobsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 text-sm">
            No active jobs assigned to {session.name}.
          </div>
        ) : (
          <div className="space-y-6">
            {scheduled.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Scheduled</p>
                <div className="space-y-3">
                  {scheduled.map(job => <JobCard key={job.id} job={job} />)}
                </div>
              </section>
            )}
            {unscheduled.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Unscheduled</p>
                <div className="space-y-3">
                  {unscheduled.map(job => <JobCard key={job.id} job={job} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
