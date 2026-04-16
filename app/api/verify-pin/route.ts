import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { pin } = await request.json() as { pin: string }

  const crewPin = process.env.CREW_PIN ?? process.env.ADMIN_PASSWORD ?? ''

  if (!pin || pin !== crewPin) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
