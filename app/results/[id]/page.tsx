import { notFound } from 'next/navigation'
import { getServiceClient } from '@/lib/supabase'
import type { TreeSubmission } from '@/lib/types'
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

export async function generateMetadata({ params }: ResultsPageProps) {
  const submission = await getSubmission(params.id)
  if (!submission) return { title: 'Assessment Not Found' }
  return {
    title: `Tree Assessment — ${submission.customer_name} | Gordon Pro Tree Service`,
    description: 'Your AI-powered tree assessment results from Gordon Pro Tree Service.',
  }
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const submission = await getSubmission(params.id)
  if (!submission) notFound()

  return <ResultsContent submission={submission} />
}
