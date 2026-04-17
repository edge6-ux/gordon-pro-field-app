import { NextRequest, NextResponse } from 'next/server'
import { analyzeTree } from '@/lib/claude'
import { getServiceClient } from '@/lib/supabase'

export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    const { submissionId } = await request.json() as { submissionId: string }

    const supabase = getServiceClient()
    const { data: submission, error: fetchError } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .single()

    if (fetchError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    const aiResult = await analyzeTree(submission.photo_urls ?? [], submission)

    const { error: updateError } = await supabase
      .from('submissions')
      .update({ ai_result: aiResult, status: 'reviewed' })
      .eq('id', submissionId)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to save AI result' }, { status: 500 })
    }

    return NextResponse.json({ aiResult })
  } catch (err) {
    console.error('Analyze error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
