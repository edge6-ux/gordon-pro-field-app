import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { JobStatus } from '@/lib/types'

const VALID_STATUSES: JobStatus[] = [
  'submitted', 'reviewed', 'assigned', 'in_progress', 'complete', 'cancelled',
]

type UpdateBody = {
  status?: JobStatus
  assigned_to?: string
  scheduled_date?: string
  scheduled_time?: string
  estimated_duration?: string
  crew_notes?: string
  customer_name?: string
  customer_phone?: string
  customer_email?: string
  property_address?: string
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let body: UpdateBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const updateFields: Record<string, unknown> = {}
  const allowed: (keyof UpdateBody)[] = [
    'status', 'assigned_to', 'scheduled_date', 'scheduled_time',
    'estimated_duration', 'crew_notes', 'customer_name',
    'customer_phone', 'customer_email', 'property_address',
  ]
  for (const key of allowed) {
    if (body[key] !== undefined) updateFields[key] = body[key]
  }

  if (body.status === 'assigned') {
    updateFields.assigned_at = new Date().toISOString()
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('jobs')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      }
      console.error('[PATCH /api/jobs/[id]/update]', error)
      return NextResponse.json({ error: 'Failed to update job' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[PATCH /api/jobs/[id]/update]', err)
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 })
  }
}
