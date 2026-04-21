import { notFound } from 'next/navigation'
import { getServiceClient } from '@/lib/supabase'
import type { TreeSubmission, Job } from '@/lib/types'
import ResultsContent from './ResultsContent'

interface ResultsPageProps {
  params: { id: string }
}

async function getSubmission(id: string): Promise<TreeSubmission | null> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as TreeSubmission
}

async function getJob(submissionId: string): Promise<Job | null> {
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('jobs')
    .select('*')
    .eq('submission_id', submissionId)
    .single()
  return (data as Job) ?? null
}

export async function generateMetadata({ params }: ResultsPageProps) {
  const submission = await getSubmission(params.id)
  if (!submission) return { title: 'Assessment Not Found' }
  return {
    title: `Tree Assessment — ${submission.customer_name} | Gordon Pro Tree Service`,
    description: 'Your AI-powered tree assessment results from Gordon Pro Tree Service.',
  }
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const [submission, job] = await Promise.all([
    getSubmission(params.id),
    getJob(params.id),
  ])

  if (!submission) notFound()

  return (
    <ResultsContent
      submission={submission}
      referenceCode={job?.reference_code ?? null}
      job={job}
    />
  )
}
