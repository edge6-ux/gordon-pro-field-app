import { redirect } from 'next/navigation'
import Image from 'next/image'
import { CheckCircle, AlertTriangle, Info, Zap, Scissors, Shield, CloudLightning, TreePine, ArrowRight } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase'
import type { TreeSubmission, AIResult, Flag } from '@/lib/types'
import CopyButton from '@/components/results/CopyButton'

// ─── Types ────────────────────────────────────────────────────────────────────

type SubmissionRow = TreeSubmission & { reference_code?: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function firstTwoSentences(text: string): string {
  const matches = text.match(/[^.!?]+[.!?]+(\s|$)/g)
  if (!matches || matches.length === 0) return text
  return matches.slice(0, 2).join('').trim()
}

// ─── Flag rewriter ────────────────────────────────────────────────────────────

function rewriteFlagForHomeowner(message: string): string {
  return message
    .replace(/\bspecimen\b/gi, 'tree')
    .replace(/\broot\s*plate\b/gi, 'base of the tree')
    .replace(/\bcanopy\s*loading\b/gi, 'branch weight')
    .replace(/\bdynamic\s*load(ing)?\b/gi, 'movement under wind')
    .replace(/\brigging\s*assessment\b/gi, 'careful planning')
    .replace(/\brigging\s*required\b/gi, 'careful planning required')
    .replace(/\bdeadman\s*anchors?\b/gi, 'ground anchors')
    .replace(/\bcrew\s*protocols?\b/gi, 'extra care by our team')
    .replace(/\bcutting\s*operations?\b/gi, 'the work')
    .replace(/\basymmetric(al)?\b/gi, 'unevenly weighted')
    .replace(/\bchipper\b/gi, 'equipment')
    .replace(/\belevated\s*work\b/gi, 'working at height')
    .replace(/\bclimbing\b/gi, 'accessing the tree')
    .replace(/\brigging\b/gi, 'careful lowering')
    .replace(/\bcrew\b/gi, 'our team')
    .replace(/\boperations?\b/gi, 'work')
}

// ─── Recommendation text ──────────────────────────────────────────────────────

function getRecommendationText(serviceType: string | null, hasStopFlag: boolean): string {
  if (serviceType === 'Tree Removal') {
    return hasStopFlag
      ? "Based on what we can see, this tree should be assessed in person as soon as possible. Our team will prioritize your call and can typically schedule urgent removals within 48 hours."
      : "Tree removal is one of our most common services. We'll come out, assess the tree in person, and give you a firm quote before any work begins — no surprises."
  }
  const texts: Record<string, string> = {
    'Tree Trimming & Pruning':
      "Regular trimming keeps your trees healthy, safe, and looking their best. We'll assess in person and recommend the right approach — whether that's crown reduction, deadwood removal, or a light shape-up.",
    'Stump Grinding':
      "Stump grinding is a fast, clean process that removes the stump below ground level. We'll confirm the size and accessibility on our call and get you scheduled quickly.",
    'Storm Damage / Emergency':
      "Storm damage needs quick attention to keep your property safe. We prioritize emergency calls and aim to be on site the same day when possible. Expect a call from us very shortly.",
    'Land Clearing':
      "Land clearing projects vary in scope. We'll get a full picture on our call and can typically provide a same-day quote for most residential clearing jobs.",
    'Not Sure — I Need Advice':
      "No problem — that's exactly what we're here for. Our team will walk you through your options on the call and recommend the right service for your situation.",
  }
  return (serviceType && texts[serviceType])
    ?? "Our team will review your request and reach out shortly to discuss the best approach for your property."
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

  const hasStopFlag = aiResult?.flags?.some(f => f.severity === 'stop') ?? false

  const FLAG_ORDER: Record<Flag['severity'], number> = { stop: 0, caution: 1, info: 2 }
  const sortedFlags: Flag[] = hasAI && aiResult?.flags
    ? [...aiResult.flags]
        .sort((a, b) => FLAG_ORDER[a.severity] - FLAG_ORDER[b.severity])
        .slice(0, 2)
    : []

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

        {/* ─── SECTION 3 — WHAT WE FOUND ─── */}
        {hasAI && sortedFlags.length > 0 && (
          <div
            className="bg-white rounded-2xl p-6"
            style={{ border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <p
              className="font-body text-[11px] uppercase mb-4"
              style={{ color: '#C8922A', letterSpacing: '0.08em' }}
            >
              What We Found
            </p>
            {sortedFlags.map((flag, i) => {
              const isLast = i === sortedFlags.length - 1
              const iconBg =
                flag.severity === 'stop' ? '#FCEBEB' :
                flag.severity === 'caution' ? '#FAEEDA' : '#E6F1FB'
              const iconColor =
                flag.severity === 'stop' ? '#E24B4A' :
                flag.severity === 'caution' ? '#C8922A' : '#185FA5'
              const severityLabel =
                flag.severity === 'stop' ? 'Needs Attention' :
                flag.severity === 'caution' ? 'Worth Knowing' : 'Good to Know'
              return (
                <div
                  key={i}
                  className={`flex gap-3 items-start py-4${!isLast ? ' border-b border-[#F3F4F6]' : ''}`}
                >
                  <div
                    className="shrink-0 flex items-center justify-center rounded-full"
                    style={{ width: 40, height: 40, background: iconBg }}
                  >
                    {flag.severity === 'info'
                      ? <Info size={18} color={iconColor} />
                      : <AlertTriangle size={18} color={iconColor} />
                    }
                  </div>
                  <div>
                    <p className="font-body font-bold text-[13px]" style={{ color: iconColor }}>
                      {severityLabel}
                    </p>
                    <p
                      className="font-body text-[14px] text-[#4A4A4A] mt-1"
                      style={{ lineHeight: 1.6 }}
                    >
                      {rewriteFlagForHomeowner(flag.message)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ─── SECTION 4 — OUR RECOMMENDATION ─── */}
        <div
          className="bg-white rounded-2xl p-6"
          style={{
            border: '1px solid #E5E7EB',
            borderLeft: '4px solid #1C3A2B',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <p
            className="font-body text-[11px] uppercase mb-1"
            style={{ color: '#1C3A2B', letterSpacing: '0.08em' }}
          >
            Our Recommendation
          </p>
          {submission.urgency === 'Emergency' && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg mt-2 mb-3"
              style={{ background: '#FCEBEB' }}
            >
              <Zap size={14} color="#E24B4A" />
              <span className="font-body font-bold text-[13px]" style={{ color: '#791F1F' }}>
                We&apos;ve flagged this as urgent and will prioritize your call.
              </span>
            </div>
          )}
          <p className="font-body text-[15px] text-[#4A4A4A]" style={{ lineHeight: 1.7 }}>
            {getRecommendationText(submission.service_type || null, hasStopFlag)}
          </p>
        </div>

        {/* ─── SECTION 5 — PREVENTATIVE CARE ─── */}
        <div
          className="bg-white rounded-2xl p-6"
          style={{ border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          <p
            className="font-body text-[11px] uppercase mb-1"
            style={{ color: '#C8922A', letterSpacing: '0.08em' }}
          >
            Keep Your Trees Healthy
          </p>
          <p
            className="font-body text-[14px] text-[#4A4A4A] mb-4"
            style={{ lineHeight: 1.6 }}
          >
            Most tree emergencies are preventable. Regular maintenance keeps your trees safe, healthy, and looking their best year-round.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {([
              { icon: <Scissors size={16} color="#1C3A2B" />, title: 'Annual Trimming',          desc: 'Keeps canopy healthy and clear of structures' },
              { icon: <Shield size={16} color="#1C3A2B" />,   title: 'Tree Health Inspections',  desc: 'Catch problems early before they become emergencies' },
              { icon: <CloudLightning size={16} color="#1C3A2B" />, title: 'Storm Preparation',  desc: 'Reduce risk before storm season hits' },
              { icon: <TreePine size={16} color="#1C3A2B" />, title: 'New Tree Planting',        desc: 'Add shade and value to your property' },
            ] as { icon: JSX.Element; title: string; desc: string }[]).map(({ icon, title, desc }) => (
              <div
                key={title}
                className="flex gap-3 items-start rounded-xl p-4"
                style={{ background: '#F5F2ED' }}
              >
                <div
                  className="shrink-0 flex items-center justify-center rounded-full"
                  style={{ width: 36, height: 36, background: '#EAF3DE' }}
                >
                  {icon}
                </div>
                <div>
                  <p className="font-body font-bold text-[13px] text-[#1A1A1A]">{title}</p>
                  <p className="font-body text-[12px] text-[#888780] mt-0.5" style={{ lineHeight: 1.5 }}>
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-1">
            <a
              href="https://gordonprotreeservice.com/services"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-body text-[14px] text-[#1C3A2B] hover:underline"
            >
              View all our services
              <ArrowRight size={14} color="#1C3A2B" />
            </a>
          </div>
        </div>

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
