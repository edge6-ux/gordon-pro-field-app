import { redirect } from 'next/navigation'
import Image from 'next/image'
import { CheckCircle } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase'
import type { TreeSubmission, AIResult } from '@/lib/types'
import CopyButton from '@/components/results/CopyButton'

// ─── Types ────────────────────────────────────────────────────────────────────

type SubmissionRow = TreeSubmission & { reference_code?: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function firstTwoSentences(text: string): string {
  const matches = text.match(/[^.!?]+[.!?]+(\s|$)/g)
  if (!matches || matches.length === 0) return text
  return matches.slice(0, 2).join('').trim()
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata() {
  return {
    title: 'Your Assessment | Gordon Pro',
    description:
      'Your tree service request has been received by Gordon Pro Tree Service.',
    robots: 'noindex, nofollow',
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CustomerResultsPage({
  params,
}: {
  params: { id: string }
}) {
  const { data } = await supabaseAdmin
    .from('submissions')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!data) redirect('/')

  const submission = data as SubmissionRow
  const aiResult   = submission.ai_result as AIResult | null
  const hasAI      = aiResult !== null && aiResult !== undefined

  const referenceCode =
    submission.reference_code ?? submission.id.slice(0, 8).toUpperCase()

  const blurb =
    hasAI && aiResult?.species_description
      ? firstTwoSentences(aiResult.species_description)
      : ''

  return (
    <div className="min-h-screen bg-[#F5F2ED]">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">

        {/* ─── SECTION 1 — CONFIRMATION HEADER ─── */}
        <div className="bg-[#1C3A2B] rounded-2xl p-6">
          {/* Top row */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p
                className="font-body text-[11px] uppercase"
                style={{ color: '#9FE1CB', letterSpacing: '0.08em' }}
              >
                Service Request
              </p>
              <h1 className="font-heading text-[22px] text-white mt-1 leading-tight">
                {hasAI ? 'Assessment Complete' : 'Request Received'}
              </h1>
              <p
                className="font-body text-[13px] mt-1 leading-snug"
                style={{ color: 'rgba(255,255,255,0.6)' }}
              >
                We&apos;ll be in touch soon — usually within a few hours
              </p>
            </div>
            <CheckCircle size={28} color="#C8922A" className="shrink-0 mt-0.5" />
          </div>

          {/* Reference row */}
          <div
            className="mt-4 flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <div>
              <p
                className="font-body text-[11px] uppercase"
                style={{ color: '#9FE1CB', letterSpacing: '0.08em' }}
              >
                Your Reference Number
              </p>
              <p
                className="font-body font-mono font-bold text-white mt-1"
                style={{ fontSize: 20 }}
              >
                {referenceCode}
              </p>
            </div>
            <CopyButton code={referenceCode} />
          </div>
        </div>

        {/* ─── SECTION 2 — YOUR TREE ─── */}
        {hasAI && aiResult && (
          <div
            className="bg-white rounded-2xl p-6"
            style={{
              border: '1px solid #E5E7EB',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <p
              className="font-body text-[11px] uppercase mb-1"
              style={{ color: '#C8922A', letterSpacing: '0.08em' }}
            >
              Identified Species
            </p>
            <h2 className="font-heading text-[24px] text-[#1A1A1A] mb-3">
              {aiResult.species_name}
            </h2>
            {blurb && (
              <p className="font-body text-[14px] text-[#4A4A4A] leading-[1.7]">
                {blurb}
              </p>
            )}

            {/* Photo strip */}
            {submission.photo_urls.length > 0 && (
              <div className="mt-4 flex gap-2 overflow-x-auto">
                {submission.photo_urls.slice(0, 3).map((url) => (
                  <div
                    key={url}
                    className="relative shrink-0 rounded-lg overflow-hidden"
                    style={{ width: 80, height: 80 }}
                  >
                    <Image
                      src={url}
                      alt="Submitted tree photo"
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 3 — WHAT WE FOUND */}
        {/* Added in Prompt B */}

        {/* SECTION 4 — OUR RECOMMENDATION */}
        {/* Added in Prompt B */}

        {/* SECTION 5 — PREVENTATIVE CARE */}
        {/* Added in Prompt B */}

        {/* SECTION 6 — WHAT HAPPENS NEXT */}
        {/* Added in Prompt C */}

        {/* SECTION 7 — AI UPSELL */}
        {/* Added in Prompt C */}

        {/* SECTION 8 — CONTACT CARD */}
        {/* Added in Prompt C */}

      </div>
    </div>
  )
}
