'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function BackLink({ jobId }: { jobId: string }) {
  return (
    <Link
      href={`/admin/jobs/${jobId}`}
      className="no-print inline-flex items-center gap-1 font-body text-[14px] text-gray-400 hover:text-gray-700 transition-colors mb-8"
    >
      <ChevronLeft size={16} />
      Back to Job
    </Link>
  )
}
