import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function GET() {
  const apiKey = process.env.RESEND_API_KEY
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY is not set' }, { status: 500 })
  }

  const resend = new Resend(apiKey)

  const { data, error } = await resend.emails.send({
    from: 'Gordon Pro Tree Service <jobs@gordonprotreeservice.com>',
    to: 'edgerrinwashington@gmail.com',
    subject: 'Gordon Pro — email test',
    html: '<p>If you can read this, Resend is working correctly.</p>',
  })

  return NextResponse.json({
    success: !error,
    data,
    error,
    env: {
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey.slice(0, 8) + '...',
      appUrl,
    },
  })
}
