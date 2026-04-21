import { NextRequest, NextResponse } from 'next/server'
import { getJobWithSubmission } from '@/lib/supabase'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const job = await getJobWithSubmission(id)

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json(job)
  } catch (err) {
    console.error('[GET /api/jobs/[id]]', err)
    return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 })
  }
}
