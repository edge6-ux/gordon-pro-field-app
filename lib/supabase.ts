import { createClient } from '@supabase/supabase-js'
import type { TreeSubmission, Job, JobStatus } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export type { TreeSubmission }

export const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

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
