import { NextRequest, NextResponse } from 'next/server'
import { getCrews, createCrew } from '@/lib/supabase'

export async function GET() {
  const crews = await getCrews()
  return NextResponse.json(crews)
}

export async function POST(request: NextRequest) {
  const body = await request.json() as { name?: string; pin?: string }
  const name = body.name?.trim()
  const pin = body.pin?.trim() || '0000'

  if (!name) {
    return NextResponse.json({ error: 'Crew name is required' }, { status: 400 })
  }

  const crew = await createCrew(name, pin)
  if (!crew) {
    return NextResponse.json({ error: 'Failed to create crew' }, { status: 500 })
  }

  return NextResponse.json(crew, { status: 201 })
}
