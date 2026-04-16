import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { v4 as uuidv4 } from 'uuid'

const MAX_SIZE = 10 * 1024 * 1024

// Vercel Blob auto-names the token after your store name, so accept both variants
const BLOB_TOKEN =
  process.env.BLOB_READ_WRITE_TOKEN ||
  process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN

export async function POST(request: NextRequest) {
  if (!BLOB_TOKEN) {
    console.error('No Blob token found in environment')
    return NextResponse.json({ error: 'Storage not configured' }, { status: 500 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const filename = `submissions/${uuidv4()}.${ext}`

    const blob = await put(filename, file, {
      access: 'public',
      contentType: file.type || 'image/jpeg',
      token: BLOB_TOKEN,
    })

    return NextResponse.json({ url: blob.url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Upload error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
