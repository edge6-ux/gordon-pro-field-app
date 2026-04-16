'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import SubmissionRow from '@/components/admin/SubmissionRow'
import type { TreeSubmission } from '@/lib/types'

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [submissions, setSubmissions] = useState<TreeSubmission[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/submissions', {
      headers: { 'x-admin-password': password },
    })

    if (res.status === 401) {
      setError('Incorrect password')
      setLoading(false)
      return
    }

    const data = await res.json() as { submissions: TreeSubmission[] }
    setSubmissions(data.submissions)
    setAuthenticated(true)
    setLoading(false)
  }

  if (!authenticated) {
    return (
      <div className="min-h-[calc(100vh-7rem)] flex items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <h1 className="font-heading text-2xl text-green-dark mb-6">Admin Access</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-text mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-green-dark"
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" variant="secondary" size="md" className="w-full" loading={loading}>
              Sign In
            </Button>
          </form>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl text-green-dark">Submissions</h1>
          <p className="text-sm text-gray-400 mt-1">{submissions.length} total submissions</p>
        </div>
        {loading && <Spinner size="sm" />}
      </div>

      {submissions.length === 0 ? (
        <Card>
          <p className="text-center text-gray-400 py-8">No submissions yet.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Date', 'Customer', 'Address', 'Height', 'Status', ''].map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400
                      ${h === 'Address' ? 'hidden md:table-cell' : ''}
                      ${h === 'Height' ? 'hidden sm:table-cell' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <SubmissionRow key={s.id} submission={s} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
