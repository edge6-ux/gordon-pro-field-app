import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Check, Calendar, ArrowRight, Clock, CheckCircle, Users, Zap, Phone, Mail } from 'lucide-react'
import { getJobByReference } from '@/lib/supabase'
import { getPipelineSteps, isStepComplete, isStepCurrent, formatReference } from '@/lib/jobs'
import { JOB_STATUS_CONFIG, type JobStatus } from '@/lib/types'

interface Props {
  params: { ref: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: `Job ${formatReference(params.ref)} | Gordon Pro`,
    robots: 'noindex',
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const NEXT_STEP_CONTENT: Partial<Record<JobStatus, { icon: React.ReactNode; title: string; body: string }>> = {
  submitted: {
    icon: <Clock size={24} color="#C8922A" />,
    title: 'Pending Review',
    body: 'Our team will review your assessment — usually within a few hours during business hours. We\'ll reach out shortly.',
  },
  reviewed: {
    icon: <CheckCircle size={24} color="#C8922A" />,
    title: 'Review Complete',
    body: 'We\'ve reviewed your assessment and will be reaching out to discuss the job and get you scheduled.',
  },
  assigned: {
    icon: <Users size={24} color="#C8922A" />,
    title: 'Crew Assigned',
    body: 'Your job has been assigned to our crew. We\'ll confirm the exact schedule shortly.',
  },
  in_progress: {
    icon: <Zap size={24} color="#C8922A" />,
    title: 'Crew On Site',
    body: 'Our crew is currently working on your property. We\'ll update this status when the job is complete.',
  },
}

export default async function TrackStatusPage({ params }: Props) {
  const job = await getJobByReference(params.ref)
  if (!job) redirect('/track')

  const config = JOB_STATUS_CONFIG[job.status]
  const steps = getPipelineSteps()
  const nextStep = NEXT_STEP_CONTENT[job.status]
  const isComplete = job.status === 'complete'
  const isCancelled = job.status === 'cancelled'

  return (
    <div style={{ background: '#F5F2ED', minHeight: '100vh' }}>
      <div style={{ maxWidth: 512, margin: '0 auto', padding: '32px 16px' }}>

        {/* ── Section 1: Header card ── */}
        <div
          className="fade-up"
          style={{
            background: '#1C3A2B',
            borderRadius: 16,
            padding: 24,
            marginBottom: 16,
            animationDelay: '0ms',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <p
                className="font-body"
                style={{ color: '#9FE1CB', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}
              >
                Job Status
              </p>
              <p className="font-heading" style={{ color: 'white', fontSize: 20, marginTop: 4 }}>
                Gordon Pro Tree Service
              </p>
            </div>
            <div
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 9999,
                padding: '4px 12px',
                flexShrink: 0,
              }}
            >
              <span className="font-body font-mono" style={{ color: 'white', fontSize: 12 }}>
                {formatReference(job.reference_code)}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <span
              className="font-body"
              style={{
                background: config.bg,
                color: config.color,
                borderRadius: 9999,
                padding: '6px 16px',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {config.label}
            </span>
            <span className="font-body" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
              Submitted {formatDate(job.created_at)}
            </span>
          </div>
        </div>

        {/* ── Section 2: Progress timeline ── */}
        <div
          className="fade-up bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
          style={{ marginBottom: 16, animationDelay: '80ms' }}
        >
          <h2 className="font-heading" style={{ fontSize: 18, color: '#1A1A1A', marginBottom: 24 }}>
            Job Progress
          </h2>

          {steps.map((step, idx) => {
            const complete = isStepComplete(step, job.status)
            const current = isStepCurrent(step, job.status)
            const isLast = idx === steps.length - 1
            const stepConfig = JOB_STATUS_CONFIG[step]

            const circleStyle: React.CSSProperties = complete
              ? { background: '#1C3A2B', border: 'none', boxShadow: 'none' }
              : current
              ? { background: '#C8922A', border: 'none', boxShadow: '0 0 0 4px rgba(200,146,42,0.2)' }
              : { background: 'white', border: '2px solid #E5E7EB', boxShadow: 'none' }

            return (
              <div key={step} style={{ display: 'flex', gap: 16, paddingBottom: isLast ? 0 : 24 }}>
                {/* Left: circle + line */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      ...circleStyle,
                    }}
                  >
                    {complete && <Check size={14} color="white" />}
                    {current && (
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />
                    )}
                  </div>
                  {!isLast && (
                    <div
                      style={{
                        width: 2,
                        flex: 1,
                        marginTop: 4,
                        background: complete
                          ? '#1C3A2B'
                          : 'repeating-linear-gradient(to bottom, #E5E7EB 0, #E5E7EB 6px, transparent 6px, transparent 12px)',
                      }}
                    />
                  )}
                </div>

                {/* Right: text */}
                <div style={{ flex: 1, paddingTop: 4 }}>
                  <p
                    className="font-body"
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: complete || current ? '#1A1A1A' : '#888780',
                    }}
                  >
                    {stepConfig.label}
                  </p>
                  <p
                    className="font-body"
                    style={{
                      fontSize: 13,
                      color: complete || current ? '#4A4A4A' : '#B4B2A9',
                      marginTop: 2,
                    }}
                  >
                    {stepConfig.description}
                  </p>

                  {current && job.scheduled_date && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        background: '#EAF3DE',
                        borderRadius: 9999,
                        padding: '4px 12px',
                        marginTop: 8,
                      }}
                    >
                      <Calendar size={12} color="#27500A" />
                      <span className="font-body" style={{ fontSize: 12, fontWeight: 700, color: '#27500A' }}>
                        Scheduled for {formatDate(job.scheduled_date)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Section 3: Job details ── */}
        <div
          className="fade-up bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
          style={{ marginBottom: 16, animationDelay: '160ms' }}
        >
          <h2 className="font-heading" style={{ fontSize: 18, color: '#1A1A1A', marginBottom: 16 }}>
            Your Submission
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p
                className="font-body"
                style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.06em' }}
              >
                Property
              </p>
              <p className="font-body" style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A', marginTop: 2 }}>
                {job.property_address}
              </p>
            </div>
            <div>
              <p
                className="font-body"
                style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.06em' }}
              >
                Submitted
              </p>
              <p className="font-body" style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A', marginTop: 2 }}>
                {formatDateTime(job.created_at)}
              </p>
            </div>
            <div>
              <p
                className="font-body"
                style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.06em' }}
              >
                Reference
              </p>
              <p className="font-mono" style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A', marginTop: 2 }}>
                {job.reference_code}
              </p>
            </div>
            {job.scheduled_date && (
              <div>
                <p
                  className="font-body"
                  style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.06em' }}
                >
                  Scheduled
                </p>
                <p className="font-body" style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A', marginTop: 2 }}>
                  {formatDate(job.scheduled_date)}
                  {job.scheduled_time && ` at ${job.scheduled_time}`}
                </p>
              </div>
            )}
          </div>

          <hr style={{ margin: '16px 0', borderColor: '#E5E7EB' }} />

          <Link
            href={`/results/customer/${job.submission_id}`}
            style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#C8922A', fontSize: 14 }}
            className="font-body"
          >
            <ArrowRight size={14} color="#C8922A" />
            View your full assessment
          </Link>
        </div>

        {/* ── Section 4: What happens next (non-terminal) ── */}
        {!isComplete && !isCancelled && nextStep && (
          <div
            className="fade-up bg-white rounded-2xl p-6 shadow-sm"
            style={{
              marginBottom: 16,
              animationDelay: '240ms',
              border: '1px solid #E5E7EB',
              borderLeft: '4px solid #C8922A',
            }}
          >
            <div style={{ marginBottom: 12 }}>{nextStep.icon}</div>
            <h3 className="font-heading" style={{ fontSize: 16, color: '#1A1A1A', marginBottom: 8 }}>
              {nextStep.title}
            </h3>
            <p className="font-body" style={{ fontSize: 14, color: '#888780', lineHeight: 1.6 }}>
              {nextStep.body}
            </p>
          </div>
        )}

        {/* ── Section 5: Complete state ── */}
        {isComplete && (
          <div
            className="fade-up bg-white rounded-2xl p-6 shadow-sm"
            style={{
              marginBottom: 16,
              animationDelay: '240ms',
              border: '1px solid #E5E7EB',
              borderLeft: '4px solid #1C3A2B',
            }}
          >
            <CheckCircle size={32} color="#1C3A2B" style={{ marginBottom: 12 }} />
            <h3 className="font-heading" style={{ fontSize: 20, color: '#1C3A2B', marginBottom: 8 }}>
              Job Complete
            </h3>
            <p className="font-body" style={{ fontSize: 14, color: '#888780', lineHeight: 1.6, marginBottom: 16 }}>
              Your job has been completed by the Gordon Pro crew. Thank you for choosing us — we hope everything looks
              great!
            </p>
            {job.completed_at && (
              <p className="font-body" style={{ fontSize: 13, color: '#B4B2A9' }}>
                Completed on {formatDate(job.completed_at)}
              </p>
            )}
          </div>
        )}

        {/* ── Section 6: Contact card ── */}
        <div
          className="fade-up bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
          style={{ marginBottom: 16, animationDelay: isComplete || isCancelled ? '320ms' : '320ms' }}
        >
          <h2 className="font-heading" style={{ fontSize: 18, color: '#1A1A1A', marginBottom: 16 }}>
            Need Help?
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <a
              href="tel:7702716072"
              className="font-body w-full flex items-center justify-center gap-2 rounded-xl py-3 text-white transition-colors"
              style={{ background: '#1C3A2B', fontSize: 15 }}
            >
              <Phone size={16} />
              Call (770) 271-6072
            </a>
            <a
              href="mailto:admin@gordonprotree.com"
              className="font-body w-full flex items-center justify-center gap-2 rounded-xl py-3 transition-colors"
              style={{
                background: 'white',
                border: '1.5px solid #1C3A2B',
                color: '#1C3A2B',
                fontSize: 15,
              }}
            >
              <Mail size={16} />
              Email Us
            </a>
          </div>

          <p
            className="font-body"
            style={{ fontSize: 12, color: '#888780', textAlign: 'center', marginTop: 16 }}
          >
            Reference your job number{' '}
            <span className="font-mono" style={{ fontWeight: 600 }}>
              {formatReference(job.reference_code)}
            </span>{' '}
            when you call or email.
          </p>
        </div>

      </div>
    </div>
  )
}
