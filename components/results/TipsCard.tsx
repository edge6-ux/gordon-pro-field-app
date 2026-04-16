import Card from '@/components/ui/Card'
import type { AIResult } from '@/lib/types'

interface TipsCardProps {
  tips: AIResult['crew_tips']
}

export default function TipsCard({ tips }: TipsCardProps) {
  return (
    <Card accent="#C8922A">
      <h2 className="font-heading text-xl text-green-dark mb-4">Crew Tips</h2>
      <ol className="space-y-3">
        {tips.map((tip, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-gray-text">
            <span className="shrink-0 w-6 h-6 rounded-full bg-gold/20 text-amber-800 font-bold
                             text-xs flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            {tip}
          </li>
        ))}
      </ol>
    </Card>
  )
}
