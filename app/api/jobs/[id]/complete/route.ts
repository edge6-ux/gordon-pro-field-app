import { NextRequest, NextResponse } from 'next/server'
import { getJobWithSubmission, supabaseAdmin } from '@/lib/supabase'
import { JobReport } from '@/lib/types'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const job = await getJobWithSubmission(id)

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Job must be in_progress to mark complete' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    const reportData: JobReport = {
      referenceCode: job.reference_code,
      customerName: job.customer_name,
      customerPhone: job.customer_phone,
      customerEmail: job.customer_email,
      propertyAddress: job.property_address,
      submittedAt: job.created_at,
      completedAt: now,
      species: job.submission?.ai_result?.species_name ?? 'Not identified',
      confidence: job.submission?.ai_result?.species_confidence ?? 'low',
      flags: job.submission?.ai_result?.flags ?? [],
      crewTips: job.submission?.ai_result?.crew_tips ?? [],
      crewNotes: job.crew_notes ?? '',
      submittedPhotoUrls: job.submission?.photo_urls ?? [],
      onsitePhotoUrls: job.onsite_photo_urls ?? [],
      assignedTo: job.assigned_to,
      scheduledDate: job.scheduled_date,
      scheduledTime: job.scheduled_time,
      estimatedDuration: job.estimated_duration,
    }

    const { error } = await supabaseAdmin
      .from('jobs')
      .update({
        status: 'complete',
        completed_at: now,
        report_generated: true,
        report_generated_at: now,
        report_data: reportData,
      })
      .eq('id', id)

    if (error) {
      console.error('[POST /api/jobs/[id]/complete]', error)
      return NextResponse.json({ error: 'Failed to complete job' }, { status: 500 })
    }

    return NextResponse.json({ success: true, reportData, jobId: id })
  } catch (err) {
    console.error('[POST /api/jobs/[id]/complete]', err)
    return NextResponse.json({ error: 'Failed to complete job' }, { status: 500 })
  }
}
