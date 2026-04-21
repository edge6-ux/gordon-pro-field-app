import { NextRequest, NextResponse } from 'next/server'
import { getAllJobs } from '@/lib/supabase'
import { JobStatus } from '@/lib/types'

const VALID_STATUSES: JobStatus[] = [
  'submitted', 'reviewed', 'assigned', 'in_progress', 'complete', 'cancelled',
]

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const statusParam = searchParams.get('status')
  const limitParam = searchParams.get('limit')
  const offsetParam = searchParams.get('offset')

  const status = statusParam && VALID_STATUSES.includes(statusParam as JobStatus)
    ? (statusParam as JobStatus)
    : undefined

  const limit = limitParam ? parseInt(limitParam, 10) : undefined
  const offset = offsetParam ? parseInt(offsetParam, 10) : undefined

  try {
    const jobs = await getAllJobs({ status, limit, offset })
    return NextResponse.json(jobs)
  } catch (err) {
    console.error('[GET /api/jobs]', err)
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}
