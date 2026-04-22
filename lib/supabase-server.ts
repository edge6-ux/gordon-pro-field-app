import { createClient } from '@supabase/supabase-js'
import type { Job, JobStatus } from './types'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function getJobWithSubmission(jobId: string): Promise<Job | null> {
  const { data, error } = await supabaseAdmin
    .from('jobs')
    .select('*, submission:submissions(*)')
    .eq('id', jobId)
    .single()

  if (error || !data) return null
  return data as Job
}

export async function getJobByReference(referenceCode: string): Promise<Job | null> {
  const { data, error } = await supabaseAdmin
    .from('jobs')
    .select('*, submission:submissions(*)')
    .eq('reference_code', referenceCode.toUpperCase())
    .single()

  if (error || !data) return null
  return data as Job
}

export async function getAllJobs(filters?: {
  status?: JobStatus
  limit?: number
  offset?: number
}): Promise<Job[]> {
  let query = supabaseAdmin
    .from('jobs')
    .select(`
      *,
      submission:submissions(
        ai_result,
        photo_urls,
        source
      )
    `)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query
  if (error || !data) return []
  return data as Job[]
}
