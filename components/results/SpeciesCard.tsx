import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import type { AIResult } from '@/lib/types'

type BadgeVariant = 'green' | 'gold' | 'gray'

const confidenceVariant: Record<AIResult['species_confidence'], BadgeVariant> = {
  high: 'green',
  medium: 'gold',
  low: 'gray',
}

const confidenceLabel: Record<AIResult['species_confidence'], string> = {
  high: 'High Confidence',
  medium: 'Medium Confidence',
  low: 'Low Confidence',
}

interface SpeciesCardProps {
  result: AIResult
}

export default function SpeciesCard({ result }: SpeciesCardProps) {
  return (
    <Card accent="#2D5A40">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h2 className="font-heading text-2xl text-green-dark">{result.species_name}</h2>
          <p className="text-sm text-gray-400 mt-0.5">AI-identified species</p>
        </div>
        <Badge variant={confidenceVariant[result.species_confidence]}>
          {confidenceLabel[result.species_confidence]}
        </Badge>
      </div>
      <p className="text-sm text-gray-text leading-relaxed mb-4">{result.species_description}</p>
      {result.key_characteristics.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Key Characteristics
          </h3>
          <ul className="space-y-1">
            {result.key_characteristics.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-text">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-mid shrink-0" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
