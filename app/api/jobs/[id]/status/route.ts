import { NextRequest, NextResponse } from 'next/server'
import { getJobByReference } from '@/lib/supabase'
import { JOB_STATUS_CONFIG } from '@/lib/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const job = await getJobByReference(id)

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({
      referenceCode: job.reference_code,
      status: job.status,
      statusConfig: JOB_STATUS_CONFIG[job.status],
      customerName: job.customer_name,
      propertyAddress: job.property_address,
      submittedAt: job.created_at,
      scheduledDate: job.scheduled_date,
      scheduledTime: job.scheduled_time,
      completedAt: job.completed_at,
      submissionId: job.submission_id,
    })
  } catch (err) {
    console.error('[GET /api/jobs/[id]/status]', err)
    return NextResponse.json({ error: 'Failed to fetch job status' }, { status: 500 })
  }
}
