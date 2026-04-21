import { redirect } from 'next/navigation'
import Image from 'next/image'
import { CheckCircle, AlertTriangle, Info, Zap, Scissors, Shield, CloudLightning, TreePine, ArrowRight, Check, Sparkles, Camera } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase'
import type { TreeSubmission, AIResult, Flag, Job } from '@/lib/types'
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

// ─── Status pipeline data ─────────────────────────────────────────────────────

const STATUS_STEPS: { key: string; label: string }[] = [
  { key: 'submitted',   label: 'Received' },
  { key: 'reviewed',    label: 'Reviewed' },
  { key: 'assigned',    label: 'Scheduled' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'complete',    label: 'Complete' },
]

const STATUS_DESCRIPTIONS: Record<string, string> = {
  submitted:   "We've received your request and will review it shortly.",
  reviewed:    "We've reviewed your request and will be in touch soon.",
  assigned:    "Your job has been scheduled. We'll confirm details shortly.",
  in_progress: "Our crew is on site.",
  complete:    "Your job is complete. Thank you for choosing Gordon Pro!",
}

function getCallTimeframe(urgency: string): string {
  if (urgency === 'Emergency') return 'within the hour'
  if (urgency === 'Soon') return 'within a few hours'
  if (urgency === 'Routine') return 'within 1 business day'
  return 'shortly'
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

  const { data: jobData } = await supabaseAdmin
    .from('jobs')
    .select('*')
    .eq('submission_id', params.id)
    .single()

  const job = jobData as Job | null

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

  const isComplete = job?.status === 'complete'
  const stepIndex  = job ? STATUS_STEPS.findIndex(s => s.key === job.status) : -1

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

        {/* ─── STATUS SECTION ─── */}
        {job && (
          <div
            className="bg-white rounded-2xl p-6"
            style={{ border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <p
              className="font-body text-[11px] uppercase mb-3"
              style={{ color: '#888780', letterSpacing: '0.08em' }}
            >
              Job Status
            </p>

            {/* Mobile: vertical pipeline */}
            <div className="flex flex-col sm:hidden">
              {STATUS_STEPS.map((step, i) => {
                const isDone    = i < stepIndex
                const isCurrent = i === stepIndex
                const isLast    = i === STATUS_STEPS.length - 1
                return (
                  <div key={step.key} className="flex items-start gap-3">
                    <div className="flex flex-col items-center" style={{ width: 28 }}>
                      <div
                        className="shrink-0 flex items-center justify-center rounded-full"
                        style={{
                          width: 28, height: 28,
                          background: isDone ? '#1C3A2B' : isCurrent ? '#C8922A' : 'white',
                          border: (!isDone && !isCurrent) ? '2px solid #E5E7EB' : 'none',
                          boxShadow: isCurrent ? '0 0 0 4px rgba(200,146,42,0.2)' : 'none',
                        }}
                      >
                        {isDone
                          ? <Check size={12} color="white" />
                          : isCurrent
                          ? <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />
                          : null}
                      </div>
                      {!isLast && (
                        <div style={{
                          width: 2, minHeight: 20, flexGrow: 1,
                          background: isDone ? '#1C3A2B' : '#E5E7EB',
                          margin: '2px 0',
                        }} />
                      )}
                    </div>
                    <p
                      className="font-body text-[12px] pt-1 pb-4"
                      style={{
                        fontWeight: (isDone || isCurrent) ? 700 : 400,
                        color: (isDone || isCurrent) ? '#1A1A1A' : '#888780',
                      }}
                    >
                      {step.label}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Desktop: horizontal pipeline */}
            <div className="hidden sm:flex items-start">
              {STATUS_STEPS.map((step, i) => {
                const isDone    = i < stepIndex
                const isCurrent = i === stepIndex
                const isLast    = i === STATUS_STEPS.length - 1
                return (
                  <div key={step.key} className="flex items-center flex-1">
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className="flex items-center justify-center rounded-full shrink-0"
                        style={{
                          width: 28, height: 28,
                          background: isDone ? '#1C3A2B' : isCurrent ? '#C8922A' : 'white',
                          border: (!isDone && !isCurrent) ? '2px solid #E5E7EB' : 'none',
                          boxShadow: isCurrent ? '0 0 0 4px rgba(200,146,42,0.2)' : 'none',
                        }}
                      >
                        {isDone
                          ? <Check size={12} color="white" />
                          : isCurrent
                          ? <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />
                          : null}
                      </div>
                      <p
                        className="font-body text-[11px] text-center"
                        style={{
                          fontWeight: (isDone || isCurrent) ? 700 : 400,
                          color: (isDone || isCurrent) ? '#1A1A1A' : '#888780',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {step.label}
                      </p>
                    </div>
                    {!isLast && (
                      <div
                        className="flex-1 mx-2"
                        style={{
                          height: 2,
                          marginBottom: 22,
                          background: isDone ? '#1C3A2B' : 'transparent',
                          borderTop: isDone ? 'none' : '2px dashed #E5E7EB',
                        }}
                      />
                    )}
                  </div>
                )
              })}
            </div>

            <p className="font-body text-[14px] text-center mt-4" style={{ color: '#888780' }}>
              {STATUS_DESCRIPTIONS[job.status] ?? ''}
            </p>
          </div>
        )}

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

        {/* ─── SECTION 6 — WHAT HAPPENS NEXT ─── */}
        {!isComplete && (
          <div
            className="bg-white rounded-2xl p-6"
            style={{ border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <p
              className="font-body text-[11px] uppercase mb-4"
              style={{ color: '#888780', letterSpacing: '0.08em' }}
            >
              What Happens Next
            </p>
            {([
              {
                n: 1,
                title: 'We review your request',
                desc: 'Our team looks over your submission and any photos you provided.',
              },
              {
                n: 2,
                title: 'We call you',
                desc: `Expect a call ${getCallTimeframe(submission.urgency)} to discuss the job and answer any questions.`,
              },
              {
                n: 3,
                title: 'We come out and quote',
                desc: 'We assess the job in person and give you a firm price before any work begins. No surprises.',
              },
            ] as { n: number; title: string; desc: string }[]).map(({ n, title, desc }, i, arr) => (
              <div
                key={n}
                className="flex gap-4 items-start"
                style={{
                  paddingBottom: i < arr.length - 1 ? 16 : 0,
                  borderBottom: i < arr.length - 1 ? '1px solid #F3F4F6' : 'none',
                  marginBottom: i < arr.length - 1 ? 16 : 0,
                }}
              >
                <div
                  className="shrink-0 flex items-center justify-center rounded-full"
                  style={{ width: 36, height: 36, background: '#1C3A2B' }}
                >
                  <span className="font-heading text-white font-bold text-[16px]">{n}</span>
                </div>
                <div>
                  <p className="font-body font-bold text-[14px] text-[#1A1A1A]">{title}</p>
                  <p className="font-body text-[13px] text-[#888780] mt-1" style={{ lineHeight: 1.5 }}>
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── SECTION 7 — AI UPSELL ─── */}
        {!hasAI && !isComplete && (
          <div
            className="bg-white rounded-2xl p-6"
            style={{
              border: '1px solid #E5E7EB',
              borderLeft: '4px solid #C8922A',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <div className="flex gap-3 items-start mb-3">
              <Sparkles size={22} color="#C8922A" className="shrink-0 mt-0.5" />
              <h3 className="font-heading text-[18px] text-[#1A1A1A] leading-tight">
                Get a faster, more accurate quote
              </h3>
            </div>
            <p className="font-body text-[14px] text-[#888780] mb-4" style={{ lineHeight: 1.6 }}>
              Add a few photos of your tree and our AI will analyze it instantly — giving our team
              everything they need to quote your job accurately before we even call.
            </p>
            <a
              href="/submit"
              className="w-full flex items-center justify-center gap-2 font-heading text-[15px] uppercase tracking-wide text-white rounded-xl py-3 hover:opacity-90 transition-opacity"
              style={{ background: '#C8922A' }}
            >
              <Camera size={16} />
              Add Photos Now
            </a>
          </div>
        )}

        {/* ─── SECTION 8 — CONTACT CARD ─── */}
        <div className="bg-[#1C3A2B] rounded-2xl p-6 text-center">
          <p
            className="font-body text-[12px] uppercase mb-2"
            style={{ color: '#9FE1CB', letterSpacing: '0.08em' }}
          >
            Questions? We&apos;re here.
          </p>
          <a
            href="tel:7702716072"
            className="block font-heading text-white py-2 w-full hover:opacity-85 transition-opacity"
            style={{ fontSize: 28, fontWeight: 700 }}
          >
            (770) 271-6072
          </a>
          <p className="font-body text-[13px] mt-2" style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            Mon–Fri 8am–6pm<br />Emergency line: 24/7
          </p>
        </div>

      </div>
    </div>
  )
}
