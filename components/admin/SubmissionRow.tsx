import Link from 'next/link'
import StatusBadge from './StatusBadge'
import type { TreeSubmission } from '@/lib/types'

interface SubmissionRowProps {
  submission: TreeSubmission
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const heightLabels: Record<TreeSubmission['tree_height'], string> = {
  under_20ft: '< 20 ft',
  '20_40ft': '20–40 ft',
  '40_60ft': '40–60 ft',
  over_60ft: '60+ ft',
}

export default function SubmissionRow({ submission }: SubmissionRowProps) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150">
      <td className="px-4 py-3 text-sm text-gray-text">{formatDate(submission.created_at)}</td>
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-gray-text">{submission.customer_name}</p>
        <p className="text-xs text-gray-400">{submission.customer_phone}</p>
      </td>
      <td className="px-4 py-3 text-sm text-gray-text hidden md:table-cell">
        {submission.property_address}
      </td>
      <td className="px-4 py-3 text-sm text-gray-400 hidden sm:table-cell">
        {heightLabels[submission.tree_height]}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={submission.status} />
      </td>
      <td className="px-4 py-3">
        <Link
          href={`/results/${submission.id}`}
          className="text-sm text-green-mid font-medium hover:text-green-dark transition-colors duration-150"
        >
          View →
        </Link>
      </td>
    </tr>
  )
}
