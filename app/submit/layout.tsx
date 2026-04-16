import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Get a Free Quote | Gordon Pro Tree Service',
  description:
    'Upload photos of your tree for a free quote from Gordon Pro Tree Service. Fast response, licensed arborists.',
}

export default function SubmitLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
