import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'

export async function GET() {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    return NextResponse.json({ ok: false, reason: 'BLOB_READ_WRITE_TOKEN not set' })
  }

  try {
    const blob = await put('test/ping.txt', 'ok', {
      access: 'public',
      contentType: 'text/plain',
    })
    return NextResponse.json({ ok: true, url: blob.url })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    })
  }
}
