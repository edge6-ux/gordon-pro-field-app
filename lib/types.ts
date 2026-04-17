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
