import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'

const BLOB_TOKEN =
  process.env.BLOB_READ_WRITE_TOKEN ||
  process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN

export async function GET() {
  if (!BLOB_TOKEN) {
    return NextResponse.json({ ok: false, reason: 'No blob token found in environment' })
  }

  try {
    const blob = await put('test/ping.txt', 'ok', {
      access: 'public',
      contentType: 'text/plain',
      token: BLOB_TOKEN,
    })
    return NextResponse.json({ ok: true, url: blob.url })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    })
  }
}
