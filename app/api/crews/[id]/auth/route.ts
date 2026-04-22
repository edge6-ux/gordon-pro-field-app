import { NextRequest, NextResponse } from 'next/server'
import { verifyCrew } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json() as { pin?: string }

  if (!body.pin) {
    return NextResponse.json({ error: 'PIN required' }, { status: 400 })
  }

  const crew = await verifyCrew(id, body.pin)
  if (!crew) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
  }

  return NextResponse.json({ id: crew.id, name: crew.name })
}
