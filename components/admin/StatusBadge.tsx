import Badge from '@/components/ui/Badge'
import type { TreeSubmission } from '@/lib/types'

type BadgeVariant = 'gray' | 'gold' | 'blue' | 'green' | 'red'

const statusMap: Record<TreeSubmission['status'], { label: string; variant: BadgeVariant }> = {
  pending: { label: 'Pending', variant: 'gray' },
  reviewed: { label: 'Reviewed', variant: 'blue' },
  quoted: { label: 'Quoted', variant: 'gold' },
  scheduled: { label: 'Scheduled', variant: 'green' },
  completed: { label: 'Completed', variant: 'green' },
}

interface StatusBadgeProps {
  status: TreeSubmission['status']
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { label, variant } = statusMap[status]
  return <Badge variant={variant}>{label}</Badge>
}
