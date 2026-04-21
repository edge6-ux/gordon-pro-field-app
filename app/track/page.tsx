import type { Metadata } from 'next'
import TrackLookupForm from './TrackLookupForm'

export const metadata: Metadata = {
  title: 'Track Your Job | Gordon Pro',
  description: 'Check the status of your tree assessment and job with Gordon Pro Tree Service.',
}

export default function TrackPage() {
  return <TrackLookupForm />
}
