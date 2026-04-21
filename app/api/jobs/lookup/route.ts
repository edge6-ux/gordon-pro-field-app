import { NextRequest, NextResponse } from 'next/server'
import { getJobByReference } from '@/lib/supabase'
import { last4Digits } from '@/lib/jobs'

export async function POST(request: NextRequest) {
  let body: { referenceCode?: string; phone?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.referenceCode || !body.phone) {
    return NextResponse.json({ error: 'referenceCode and phone are required' }, { status: 400 })
  }

  try {
    const job = await getJobByReference(body.referenceCode)

    if (!job || last4Digits(job.customer_phone) !== last4Digits(body.phone)) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({ referenceCode: job.reference_code })
  } catch (err) {
    console.error('[POST /api/jobs/lookup]', err)
    return NextResponse.json({ error: 'Failed to look up job' }, { status: 500 })
  }
}
