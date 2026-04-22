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
    const {
      customerName,
      customerPhone,
      customerEmail,
      propertyAddress,
      serviceType,
      treeCount,
      urgency,
      bestTimeToCall,
      additionalNotes,
      photoUrls,
      source,
    } = await request.json() as SubmitBody

    const submissionId = uuidv4()
    const jobReferenceCode = crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase()

    const supabase = getServiceClient()
    const { error } = await supabase.from('submissions').insert({
      id:                submissionId,
      created_at:        new Date().toISOString(),
      customer_name:     customerName,
      customer_phone:    customerPhone,
      customer_email:    customerEmail,
      property_address:  propertyAddress,
      service_type:      serviceType || '',
      tree_count:        treeCount || '',
      urgency:           urgency || '',
      best_time_to_call: bestTimeToCall || '',
      additional_notes:  additionalNotes || '',
      photo_urls:        photoUrls || [],
      source:            source || 'customer',
      status:            'pending',
    })
    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 })
    }

    // Create a job record immediately so the status pipeline is visible to the customer
    const { error: jobError } = await supabase.from('jobs').insert({
      submission_id:    submissionId,
      customer_name:    customerName ?? '',
      customer_phone:   customerPhone ?? '',
      customer_email:   customerEmail ?? '',
      property_address: propertyAddress ?? '',
      status:           'submitted',
      assigned_to:      '',
      assigned_at:      null,
      reference_code:   jobReferenceCode,
      crew_notes:       '',
      onsite_photo_urls: [],
      report_generated: false,
    })
    if (jobError) {
      console.error('Job insert error:', jobError)
      // Non-fatal — submission is saved; job creation failure shouldn't block the customer
    }

    // Fire-and-forget: internal operator notification
    sendEmailNotification({
      id:                      submissionId,
      created_at:              new Date().toISOString(),
      customer_name:           customerName ?? '',
      customer_phone:          customerPhone ?? '',
      customer_email:          customerEmail ?? '',
      property_address:        propertyAddress ?? '',
      tree_height:             'under_20ft',
      tree_location:           '',
      lean_direction:          'none',
      proximity_to_structures: 'none',
      additional_notes:        additionalNotes || '',
      photo_urls:              photoUrls || [],
      status:                  'pending',
      source:                  source || 'customer',
      service_type:            serviceType || '',
      tree_count:              treeCount || '',
      urgency:                 urgency || '',
      best_time_to_call:       bestTimeToCall || '',
    }).catch(console.error)

    // Email 1 — submission confirmed
    // Only for customer submissions with an email address
    if (
      customerEmail &&
      customerEmail.trim() !== '' &&
      source !== 'operator'
    ) {
      try {
        const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/+$/, '')
        await sendSubmissionConfirmed({
          customerName: customerName || 'there',
          customerEmail: customerEmail,
          referenceCode: jobReferenceCode,
          trackingUrl: `${appUrl}/track/${jobReferenceCode}`,
        })
      } catch (emailError) {
        // Never block the submission response if email fails
        console.error('Email 1 failed:', emailError)
      }
    }

    return NextResponse.json({ id: submissionId })
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
    from: 'Gordon Pro Field App <onboarding@resend.dev>',
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
