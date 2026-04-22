import { NextRequest, NextResponse } from 'next/server'
import { deleteCrew } from '@/lib/supabase'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ok = await deleteCrew(id)
  if (!ok) return NextResponse.json({ error: 'Failed to delete crew' }, { status: 500 })
  return NextResponse.json({ success: true })
}
