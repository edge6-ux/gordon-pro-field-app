import { NextRequest, NextResponse } from 'next/server'
import { getAllJobs, createManualJob } from '@/lib/supabase'
import { JobStatus } from '@/lib/types'

const VALID_STATUSES: JobStatus[] = [
  'submitted', 'reviewed', 'assigned', 'in_progress', 'complete', 'cancelled',
]

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const statusParam = searchParams.get('status')
  const assignedToParam = searchParams.get('assigned_to')
  const limitParam = searchParams.get('limit')
  const offsetParam = searchParams.get('offset')

  const status = statusParam && VALID_STATUSES.includes(statusParam as JobStatus)
    ? (statusParam as JobStatus)
    : undefined

  const assignedTo = assignedToParam ?? undefined
  const limit = limitParam ? parseInt(limitParam, 10) : undefined
  const offset = offsetParam ? parseInt(offsetParam, 10) : undefined

  try {
    const jobs = await getAllJobs({ status, assignedTo, limit, offset })
    return NextResponse.json(jobs)
  } catch (err) {
    console.error('[GET /api/jobs] error:', err)
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    customer_name?: string
    customer_phone?: string
    customer_email?: string
    property_address?: string
    service_type?: string
    notes?: string
    assigned_to?: string
  }

  const customer_name = body.customer_name?.trim()
  const property_address = body.property_address?.trim()

  if (!customer_name || !property_address) {
    return NextResponse.json(
      { error: 'Customer name and property address are required' },
      { status: 400 }
    )
  }

  const job = await createManualJob({
    customer_name,
    property_address,
    customer_phone: body.customer_phone?.trim() ?? '',
    customer_email: body.customer_email?.trim() ?? '',
    service_type: body.service_type?.trim() ?? '',
    notes: body.notes?.trim() ?? '',
    assigned_to: body.assigned_to?.trim() || undefined,
  })

  if (!job) {
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }

  return NextResponse.json(job, { status: 201 })
}
