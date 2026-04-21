import Image from 'next/image'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import type { Job, JobReport } from '@/lib/types'
import { formatReference } from '@/lib/jobs'
import PrintButton from '@/components/report/PrintButton'
import BackLink from '@/components/report/BackLink'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props) {
  return {
    title: `Job Report ${formatReference(params.id)} | Gordon Pro`,
    robots: 'noindex, nofollow',
  }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { dateStyle: 'long' })
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function InfoGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
      {items.map(({ label, value }) => (
        <div key={label}>
          <p
            className="font-body"
            style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.07em' }}
          >
            {label}
          </p>
          <p className="font-body" style={{ fontSize: 14, color: '#1A1A1A', marginTop: 2 }}>
            {value || '—'}
          </p>
        </div>
      ))}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="report-section-title font-heading"
      style={{ fontSize: 16, color: '#1A1A1A', borderBottom: '1px solid #E5E7EB', paddingBottom: 8, marginBottom: 16 }}
    >
      {children}
    </h2>
  )
}

export default async function JobReportPage({ params }: Props) {
  const { data: job } = await supabaseAdmin
    .from('jobs')
    .select('*, submission:submissions(*)')
    .eq('id', params.id)
    .single()

  if (!job) redirect('/admin')
  if (!job.report_generated || !job.report_data) redirect(`/admin/jobs/${params.id}`)

  const typedJob = job as Job
  const report = typedJob.report_data as JobReport

  const hasPhotos =
    report.submittedPhotoUrls.length > 0 || report.onsitePhotoUrls.length > 0

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          * { box-shadow: none !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          img { max-width: 100%; page-break-inside: avoid; }
          .report-section { page-break-inside: avoid; margin-bottom: 24px; }
          .report-section-title { page-break-after: avoid; }
        }
      `}</style>

      <PrintButton />

      <div style={{ background: 'white', minHeight: '100vh' }}>
        <div style={{ maxWidth: 672, margin: '0 auto', padding: '40px 32px' }}>

          <BackLink jobId={params.id} />

          {/* ── Report header ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <Image
                src="/images/logo.png"
                width={56}
                height={56}
                alt="Gordon Pro Tree Service"
                style={{ objectFit: 'contain' }}
              />
              <p className="font-heading" style={{ fontSize: 18, color: '#1A1A1A', marginTop: 8 }}>
                Gordon Pro Tree Service
              </p>
              <p className="font-body" style={{ fontSize: 13, color: '#888780', marginTop: 2 }}>
                (770) 271-6072
              </p>
              <p className="font-body" style={{ fontSize: 13, color: '#888780' }}>
                admin@gordonprotree.com
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <p className="font-heading" style={{ fontSize: 22, color: '#1A1A1A' }}>
                Job Completion Report
              </p>
              <p className="font-body" style={{ fontSize: 14, color: '#888780', marginTop: 4 }}>
                {formatReference(report.referenceCode)}
              </p>
              <p className="font-body" style={{ fontSize: 13, color: '#888780', marginTop: 2 }}>
                Completed {fmtDate(report.completedAt)}
              </p>
            </div>
          </div>

          <div style={{ borderBottom: '2px solid #1C3A2B', marginBottom: 24 }} />

          {/* ── Section 1: Customer ── */}
          <div className="report-section" style={{ marginBottom: 24 }}>
            <SectionTitle>Customer Information</SectionTitle>
            <InfoGrid
              items={[
                { label: 'Name', value: report.customerName },
                { label: 'Phone', value: report.customerPhone },
                { label: 'Email', value: report.customerEmail },
                { label: 'Property', value: report.propertyAddress },
              ]}
            />
          </div>

          {/* ── Section 2: Tree assessment ── */}
          <div className="report-section" style={{ marginBottom: 24 }}>
            <SectionTitle>Tree Assessment</SectionTitle>

            <p className="font-heading" style={{ fontSize: 20, color: '#1A1A1A' }}>
              {report.species}
            </p>
            <p className="font-body" style={{ fontSize: 14, color: '#888780', marginTop: 4 }}>
              Identified with {report.confidence} confidence
            </p>

            {report.flags.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <p className="font-body" style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>
                  Flags Identified
                </p>
                {report.flags.map((flag, i) => {
                  const color =
                    flag.severity === 'stop' ? '#B91C1C' :
                    flag.severity === 'caution' ? '#92400E' :
                    '#1E40AF'
                  const label =
                    flag.severity === 'stop' ? 'STOP' :
                    flag.severity === 'caution' ? 'CAUTION' : 'INFO'
                  return (
                    <div key={i} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <span className="font-body" style={{ fontSize: 13, fontWeight: 700, color, flexShrink: 0 }}>
                        {label}
                      </span>
                      <span className="font-body" style={{ fontSize: 13, color }}>
                        {flag.message}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Section 3: Job details ── */}
          <div className="report-section" style={{ marginBottom: 24 }}>
            <SectionTitle>Job Details</SectionTitle>
            <InfoGrid
              items={[
                { label: 'Crew', value: report.assignedTo },
                {
                  label: 'Scheduled',
                  value:
                    report.scheduledDate && report.scheduledTime
                      ? `${report.scheduledDate} at ${report.scheduledTime}`
                      : report.scheduledDate ?? '',
                },
                { label: 'Duration', value: report.estimatedDuration ?? '' },
                { label: 'Submitted', value: fmtDateTime(report.submittedAt) },
                { label: 'Completed', value: fmtDateTime(report.completedAt) },
              ]}
            />

            {report.crewNotes && (
              <div style={{ marginTop: 16 }}>
                <p className="font-body" style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>
                  Crew Notes
                </p>
                <div style={{ background: '#F5F2ED', borderRadius: 8, padding: 16 }}>
                  <p className="font-body" style={{ fontSize: 14, color: '#1A1A1A', whiteSpace: 'pre-wrap' }}>
                    {report.crewNotes}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Section 4: Photos ── */}
          <div className="report-section" style={{ marginBottom: 24 }}>
            <SectionTitle>Photos</SectionTitle>

            {!hasPhotos && (
              <p className="font-body" style={{ fontSize: 14, color: '#888780' }}>
                No photos on record
              </p>
            )}

            {report.submittedPhotoUrls.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <p className="font-body" style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', marginBottom: 12 }}>
                  Submitted by Customer ({report.submittedPhotoUrls.length})
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {report.submittedPhotoUrls.map((url, i) => (
                    <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden' }}>
                      <Image
                        src={url}
                        alt={`Submitted photo ${i + 1}`}
                        fill
                        className="object-cover"
                        sizes="200px"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.onsitePhotoUrls.length > 0 && (
              <div>
                <p className="font-body" style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', marginBottom: 12 }}>
                  Logged On-Site ({report.onsitePhotoUrls.length})
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {report.onsitePhotoUrls.map((url, i) => (
                    <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden' }}>
                      <Image
                        src={url}
                        alt={`On-site photo ${i + 1}`}
                        fill
                        className="object-cover"
                        sizes="200px"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Section 5: Sign off ── */}
          <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 24, textAlign: 'center' }}>
            <p className="font-body" style={{ fontSize: 12, color: '#B4B2A9' }}>
              This report was generated by Gordon Pro Tree Service on{' '}
              {typedJob.report_generated_at ? fmtDateTime(typedJob.report_generated_at) : '—'}.
            </p>
            <p className="font-body" style={{ fontSize: 12, color: '#B4B2A9', marginTop: 4 }}>
              Gordon Pro Tree Service · (770) 271-6072 · admin@gordonprotree.com
            </p>
          </div>

        </div>
      </div>
    </>
  )
}
