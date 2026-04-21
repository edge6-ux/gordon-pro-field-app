import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getServiceClient } from '@/lib/supabase'
import { sendSubmissionConfirmed } from '@/lib/email'
import type { TreeSubmission } from '@/lib/types'

// ─── Rate limiting ────────────────────────────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function getRateLimitKey(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000
  const maxRequests = 10
  const record = rateLimitMap.get(key)
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }
  if (record.count >= maxRequests) return false
  record.count++
  return true
}

// Accepts both the new customer form format and the legacy operator format
interface SubmitBody {
  // New customer form fields
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  propertyAddress?: string
  serviceType?: string
  treeCount?: string
  urgency?: string
  bestTimeToCall?: string
  additionalNotes?: string

  // Legacy operator form fields
  firstName?: string
  lastName?: string
  phone?: string
  email?: string
  address?: string
  treeHeight?: TreeSubmission['tree_height']
  treeLocation?: string
  leanDirection?: TreeSubmission['lean_direction']
  proximity?: TreeSubmission['proximity_to_structures']
  notes?: string

  photoUrls: string[]
  source?: TreeSubmission['source']
}

export async function POST(request: NextRequest) {
  const ip = getRateLimitKey(request)
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later or call us at (770) 271-6072.' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json() as SubmitBody

    const id = uuidv4()
    const submission: Omit<TreeSubmission, 'ai_result'> = {
      id,
      created_at: new Date().toISOString(),
      customer_name: body.customerName ?? `${body.firstName ?? ''} ${body.lastName ?? ''}`.trim(),
      customer_phone: body.customerPhone ?? body.phone ?? '',
      customer_email: body.customerEmail ?? body.email ?? '',
      property_address: body.propertyAddress ?? body.address ?? '',
      tree_height: body.treeHeight ?? 'under_20ft',
      tree_location: body.treeLocation ?? '',
      lean_direction: body.leanDirection ?? 'none',
      proximity_to_structures: body.proximity ?? 'none',
      additional_notes: body.additionalNotes ?? body.notes ?? '',
      photo_urls: body.photoUrls,
      status: 'pending',
      source: body.source === 'operator' ? 'operator' : 'customer',
      service_type: body.serviceType ?? '',
      tree_count: body.treeCount ?? '',
      urgency: body.urgency ?? '',
      best_time_to_call: body.bestTimeToCall ?? '',
    }

    const supabase = getServiceClient()
    const { error } = await supabase.from('submissions').insert(submission)
    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 })
    }

    // Fire-and-forget: internal operator notification
    sendEmailNotification(submission).catch(console.error)

    // Email 1 — submission confirmed
    // Only for customer submissions with an email address
    if (
      body.customerEmail &&
      body.customerEmail.trim() !== '' &&
      body.source !== 'operator'
    ) {
      try {
        // Try to get the DB-generated reference code; fall back to ID slice
        const { data: row } = await supabase
          .from('submissions')
          .select('reference_code')
          .eq('id', id)
          .single()

        const referenceCode = row?.reference_code ?? id.slice(0, 8).toUpperCase()
        const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/+$/, '')

        await sendSubmissionConfirmed({
          customerName: body.customerName || 'there',
          customerEmail: body.customerEmail,
          referenceCode,
          trackingUrl: `${appUrl}/track/${referenceCode}`,
        })
      } catch (emailError) {
        // Never block the submission response if email fails
        console.error('Email 1 failed:', emailError)
      }
    }

    return NextResponse.json({ id })
  } catch (err) {
    console.error('Submit error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function sendEmailNotification(submission: Omit<TreeSubmission, 'ai_result'>) {
  const apiKey = process.env.RESEND_API_KEY
  const notifyEmail = process.env.NOTIFICATION_EMAIL
  if (!apiKey || !notifyEmail) return

  const { Resend } = await import('resend')
  const resend = new Resend(apiKey)

  const heightLabels: Record<string, string> = {
    under_20ft: 'Under 20ft',
    '20_40ft': '20–40ft',
    '40_60ft': '40–60ft',
    over_60ft: 'Over 60ft',
  }

  await resend.emails.send({
    from: 'Gordon Pro Field App <noreply@gordonprotreeservice.com>',
    to: [notifyEmail],
    subject: `New assessment request — ${submission.customer_name}`,
    html: `
      <h2>New Tree Assessment Submission</h2>
      <p><strong>Customer:</strong> ${submission.customer_name}</p>
      <p><strong>Phone:</strong> ${submission.customer_phone}</p>
      <p><strong>Email:</strong> ${submission.customer_email}</p>
      <p><strong>Address:</strong> ${submission.property_address}</p>
      ${submission.service_type ? `<p><strong>Service:</strong> ${submission.service_type}</p>` : ''}
      ${submission.urgency ? `<p><strong>Urgency:</strong> ${submission.urgency}</p>` : ''}
      ${submission.tree_height ? `<p><strong>Tree Height:</strong> ${heightLabels[submission.tree_height] ?? submission.tree_height}</p>` : ''}
      <p><strong>Photos:</strong> ${submission.photo_urls.length}</p>
      ${submission.additional_notes ? `<p><strong>Notes:</strong> ${submission.additional_notes}</p>` : ''}
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://your-app.vercel.app'}/results/${submission.id}">
        View Submission →
      </a></p>
    `,
  })
}
