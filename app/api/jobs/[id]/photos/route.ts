import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let body: { photoUrl?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.photoUrl || !body.photoUrl.startsWith('https://')) {
    return NextResponse.json({ error: 'photoUrl must be a valid https URL' }, { status: 400 })
  }

  try {
    const { data: job } = await supabaseAdmin
      .from('jobs')
      .select('onsite_photo_urls')
      .eq('id', id)
      .single()

    const updatedUrls = [...(job?.onsite_photo_urls ?? []), body.photoUrl]

    const { data, error } = await supabaseAdmin
      .from('jobs')
      .update({ onsite_photo_urls: updatedUrls })
      .eq('id', id)
      .select('onsite_photo_urls')
      .single()

    if (error) {
      console.error('[POST /api/jobs/[id]/photos]', error)
      return NextResponse.json({ error: 'Failed to update photos' }, { status: 500 })
    }

    return NextResponse.json({ onsite_photo_urls: data.onsite_photo_urls })
  } catch (err) {
    console.error('[POST /api/jobs/[id]/photos]', err)
    return NextResponse.json({ error: 'Failed to update photos' }, { status: 500 })
  }
}
