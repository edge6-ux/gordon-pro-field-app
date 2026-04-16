import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { v4 as uuidv4 } from 'uuid'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB (after client-side compression, always well under)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!file.type.startsWith('image/') && file.size === 0) {
      return NextResponse.json({ error: 'Invalid file' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const filename = `submissions/${uuidv4()}.${ext}`

    const blob = await put(filename, file, {
      access: 'public',
      contentType: file.type || 'image/jpeg',
    })

    return NextResponse.json({ url: blob.url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Upload error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
