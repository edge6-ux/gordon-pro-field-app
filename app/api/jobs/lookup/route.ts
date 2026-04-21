import { NextRequest, NextResponse } from 'next/server'
import { getJobByReference, supabaseAdmin } from '@/lib/supabase'
import { last4Digits } from '@/lib/jobs'
import type { Job } from '@/lib/types'

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
    const { data: jobData, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('reference_code', body.referenceCode.toUpperCase())
      .single()

    console.log('Raw job data:', jobData)
    console.log('Raw job error:', jobError)

    const job = jobData as Job | null

    console.log('Job found:', job ? 'yes' : 'no')
    console.log('Job phone:', job?.customer_phone)
    console.log('Input last4:', last4Digits(body.phone))
    console.log('Job last4:', job?.customer_phone ? last4Digits(job.customer_phone) : 'null')

    if (!job || last4Digits(job.customer_phone) !== last4Digits(body.phone)) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({ referenceCode: job.reference_code })
  } catch (err) {
    console.error('[POST /api/jobs/lookup]', err)
    return NextResponse.json({ error: 'Failed to look up job' }, { status: 500 })
  }
}
