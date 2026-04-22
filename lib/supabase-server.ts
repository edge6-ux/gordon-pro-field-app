import { createClient } from '@supabase/supabase-js'
import type { Job, JobStatus, Crew } from './types'

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
    .select('*, submission:submissions!submission_id(*)')
    .eq('id', jobId)
    .single()

  if (error) {
    console.error('[getJobWithSubmission] Supabase error:', error.message)
    return null
  }
  if (!data) return null
  return data as Job
}

export async function getJobByReference(referenceCode: string): Promise<Job | null> {
  const { data, error } = await supabaseAdmin
    .from('jobs')
    .select('*, submission:submissions!submission_id(*)')
    .eq('reference_code', referenceCode.toUpperCase())
    .single()

  if (error) {
    console.error('[getJobByReference] Supabase error:', error.message)
    return null
  }
  if (!data) return null
  return data as Job
}

export async function createManualJob(params: {
  customer_name: string
  customer_phone: string
  customer_email: string
  property_address: string
  service_type: string
  notes: string
  assigned_to?: string
}): Promise<Job | null> {
  const { data: sub, error: subErr } = await supabaseAdmin
    .from('submissions')
    .insert({
      customer_name: params.customer_name,
      customer_phone: params.customer_phone,
      customer_email: params.customer_email,
      property_address: params.property_address,
      additional_notes: params.notes,
      service_type: params.service_type,
      source: 'operator',
      status: 'pending',
      photo_urls: [],
      ai_result: null,
      tree_height: 'under_20ft',
      tree_location: '',
      lean_direction: 'none',
      proximity_to_structures: 'none',
      tree_count: '',
      urgency: '',
      best_time_to_call: '',
    })
    .select('id')
    .single()

  if (subErr || !sub) {
    console.error('[createManualJob] submission error:', subErr?.message)
    return null
  }

  const referenceCode = crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase()
  const isAssigned = !!params.assigned_to

  const { data: job, error: jobErr } = await supabaseAdmin
    .from('jobs')
    .insert({
      submission_id: sub.id,
      customer_name: params.customer_name,
      customer_phone: params.customer_phone,
      customer_email: params.customer_email,
      property_address: params.property_address,
      status: isAssigned ? 'assigned' : 'submitted',
      assigned_to: params.assigned_to ?? '',
      assigned_at: isAssigned ? new Date().toISOString() : null,
      reference_code: referenceCode,
      crew_notes: params.notes,
      onsite_photo_urls: [],
      report_generated: false,
    })
    .select()
    .single()

  if (jobErr || !job) {
    console.error('[createManualJob] job error:', jobErr?.message)
    return null
  }

  return job as Job
}

export async function getCrews(): Promise<Crew[]> {
  const { data, error } = await supabaseAdmin
    .from('crews')
    .select('id, name, created_at')
    .order('name')
  if (error) { console.error('[getCrews]', error.message); return [] }
  return (data ?? []) as Crew[]
}

export async function createCrew(name: string, pin: string): Promise<Crew | null> {
  const { data, error } = await supabaseAdmin
    .from('crews')
    .insert({ name, pin })
    .select('id, name, created_at')
    .single()
  if (error) { console.error('[createCrew]', error.message); return null }
  return data as Crew
}

export async function deleteCrew(id: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from('crews').delete().eq('id', id)
  if (error) { console.error('[deleteCrew]', error.message); return false }
  return true
}

export async function verifyCrew(id: string, pin: string): Promise<Crew | null> {
  const { data, error } = await supabaseAdmin
    .from('crews')
    .select('id, name, created_at')
    .eq('id', id)
    .eq('pin', pin)
    .single()
  if (error || !data) return null
  return data as Crew
}

export async function getAllJobs(filters?: {
  status?: JobStatus
  assignedTo?: string
  limit?: number
  offset?: number
}): Promise<Job[]> {
  let query = supabaseAdmin
    .from('jobs')
    .select(`
      *,
      submission:submissions!submission_id(
        ai_result,
        photo_urls,
        source,
        service_type
      )
    `)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.assignedTo) {
    query = query.eq('assigned_to', filters.assignedTo)
  }

  if (filters?.limit !== undefined) {
    query = query.limit(filters.limit)
  }

  if (filters?.offset !== undefined) {
    query = query.range(filters.offset, filters.offset + (filters.limit ?? 1000) - 1)
  }

  const { data, error } = await query
  if (error) {
    console.error('[getAllJobs] Supabase error:', error.message, '| hint:', error.hint, '| details:', error.details)
    return []
  }
  if (!data) return []
  return data as Job[]
}
