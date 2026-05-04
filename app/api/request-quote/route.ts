import { NextRequest, NextResponse } from 'next/server'

const UPSTREAM = 'https://gordon-admin.vercel.app/api/public/request-quote'

export async function POST(req: NextRequest) {
  // Parse incoming body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Forward to admin backend
  let res: Response
  try {
    res = await fetch(UPSTREAM, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[request-quote] upstream fetch failed:', msg)
    return NextResponse.json({ error: `Network error reaching quote server: ${msg}` }, { status: 502 })
  }

  // Parse response — admin may return HTML on unexpected errors
  let data: unknown
  try {
    data = await res.json()
  } catch {
    const text = await res.text().catch(() => '')
    console.error('[request-quote] non-JSON response from upstream:', res.status, text.slice(0, 200))
    return NextResponse.json(
      { error: `Quote server returned an unexpected response (HTTP ${res.status})` },
      { status: 502 }
    )
  }

  return NextResponse.json(data, { status: res.status })
}
