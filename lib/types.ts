export type TreeSubmission = {
  id: string
  created_at: string
  customer_name: string
  customer_phone: string
  customer_email: string
  property_address: string
  tree_height: 'under_20ft' | '20_40ft' | '40_60ft' | 'over_60ft'
  tree_location: string
  lean_direction: 'none' | 'slight' | 'moderate' | 'severe'
  proximity_to_structures: 'none' | 'close' | 'very_close' | 'contact'
  additional_notes: string
  photo_urls: string[]
  ai_result: AIResult | null
  status: 'pending' | 'reviewed' | 'quoted' | 'scheduled' | 'completed'
  source: 'customer' | 'operator'
  internal_notes?: string
  service_type: string
  tree_count: string
  urgency: string
  best_time_to_call: string
}

export type AIResult = {
  no_tree_detected?: boolean
  species_name: string
  species_confidence: 'high' | 'medium' | 'low'
  species_description: string
  key_characteristics: string[]
  site_considerations: string[]
  crew_tips: string[]
  flags: Flag[]
  generated_at: string
}

export type Flag = {
  severity: 'info' | 'caution' | 'stop'
  message: string
}

export type JobStatus =
  | 'submitted'
  | 'reviewed'
  | 'assigned'
  | 'in_progress'
  | 'complete'
  | 'cancelled'

export type Job = {
  id: string
  created_at: string
  updated_at: string
  submission_id: string
  customer_name: string
  customer_phone: string
  customer_email: string
  property_address: string
  status: JobStatus
  assigned_to: string
  assigned_at: string | null
  scheduled_date: string | null
  scheduled_time: string | null
  estimated_duration: string | null
  crew_notes: string
  onsite_photo_urls: string[]
  completed_at: string | null
  report_generated: boolean
  report_generated_at: string | null
  report_data: JobReport | null
  reference_code: string
  submission?: TreeSubmission
}

export type JobReport = {
  referenceCode: string
  customerName: string
  customerPhone: string
  customerEmail: string
  propertyAddress: string
  submittedAt: string
  completedAt: string
  species: string
  confidence: string
  flags: Flag[]
  crewTips: string[]
  crewNotes: string
  submittedPhotoUrls: string[]
  onsitePhotoUrls: string[]
  assignedTo: string
  scheduledDate: string | null
  scheduledTime: string | null
  estimatedDuration: string | null
}

export type Crew = {
  id: string
  name: string
  created_at: string
}

export type JobStatusConfig = {
  label: string
  color: string
  bg: string
  next: JobStatus | null
  description: string
}

export const JOB_STATUS_CONFIG: Record<JobStatus, JobStatusConfig> = {
  submitted: {
    label: 'Submitted',
    color: '#4A4A4A',
    bg: '#F1EFE8',
    next: 'reviewed',
    description: 'Assessment received, pending team review',
  },
  reviewed: {
    label: 'Reviewed',
    color: '#185FA5',
    bg: '#E6F1FB',
    next: 'assigned',
    description: 'Team has reviewed the assessment',
  },
  assigned: {
    label: 'Assigned',
    color: '#854F0B',
    bg: '#FAEEDA',
    next: 'in_progress',
    description: 'Assigned to crew, pending scheduling',
  },
  in_progress: {
    label: 'In Progress',
    color: '#27500A',
    bg: '#EAF3DE',
    next: 'complete',
    description: 'Crew is on site',
  },
  complete: {
    label: 'Complete',
    color: '#FFFFFF',
    bg: '#1C3A2B',
    next: null,
    description: 'Job finished successfully',
  },
  cancelled: {
    label: 'Cancelled',
    color: '#791F1F',
    bg: '#FCEBEB',
    next: null,
    description: 'Job cancelled',
  },
}

export type SubmitFormData = {
  customer_name: string
  customer_phone: string
  customer_email: string
  property_address: string
  tree_height: TreeSubmission['tree_height']
  tree_location: string
  lean_direction: TreeSubmission['lean_direction']
  proximity_to_structures: TreeSubmission['proximity_to_structures']
  additional_notes: string
  photos: File[]
}
