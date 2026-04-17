import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Free Tree Assessment | Gordon Pro Tree Service',
  description:
    'Upload photos of your tree for a free assessment from Gordon Pro Tree Service. AI-powered analysis, licensed arborists, fast response.',
}

export default function SubmitLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
