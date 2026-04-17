import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getServiceClient } from '@/lib/supabase'
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

interface SubmitBody {
  firstName: string
  lastName: string
  phone: string
  email: string
  address: string
  treeHeight: TreeSubmission['tree_height']
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
      customer_name: `${body.firstName} ${body.lastName}`.trim(),
      customer_phone: body.phone,
      customer_email: body.email,
      property_address: body.address,
      tree_height: body.treeHeight,
      tree_location: body.treeLocation ?? '',
      lean_direction: body.leanDirection ?? 'none',
      proximity_to_structures: body.proximity ?? 'none',
      additional_notes: body.notes ?? '',
      photo_urls: body.photoUrls,
      status: 'pending',
      source: body.source === 'operator' ? 'operator' : 'customer',
    }

    const supabase = getServiceClient()
    const { error } = await supabase.from('submissions').insert(submission)
    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 })
    }

    // Fire-and-forget email notification
    sendEmailNotification(submission).catch(console.error)

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
      <p><strong>Tree Height:</strong> ${heightLabels[submission.tree_height] ?? submission.tree_height}</p>
      <p><strong>Lean:</strong> ${submission.lean_direction}</p>
      <p><strong>Proximity:</strong> ${submission.proximity_to_structures}</p>
      <p><strong>Photos:</strong> ${submission.photo_urls.length}</p>
      ${submission.additional_notes ? `<p><strong>Notes:</strong> ${submission.additional_notes}</p>` : ''}
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://your-app.vercel.app'}/results/${submission.id}">
        View AI Assessment →
      </a></p>
    `,
  })
}
