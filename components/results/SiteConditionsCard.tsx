import Card from '@/components/ui/Card'
import type { AIResult } from '@/lib/types'

interface SiteConditionsCardProps {
  considerations: AIResult['site_considerations']
}

export default function SiteConditionsCard({ considerations }: SiteConditionsCardProps) {
  if (considerations.length === 0) return null

  return (
    <Card>
      <h2 className="font-heading text-xl text-green-dark mb-4">Site Considerations</h2>
      <ul className="space-y-2">
        {considerations.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-gray-text">
            <svg className="w-4 h-4 text-green-mid mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {item}
          </li>
        ))}
      </ul>
    </Card>
  )
}
