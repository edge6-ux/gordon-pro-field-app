import Card from '@/components/ui/Card'
import type { Flag } from '@/lib/types'

interface FlagCardProps {
  flags: Flag[]
}

type FlagStyle = { bg: string; border: string; icon: string; label: string }

const flagStyles: Record<Flag['severity'], FlagStyle> = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'ℹ️',
    label: 'Note',
  },
  caution: {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    icon: '⚠️',
    label: 'Caution',
  },
  stop: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    icon: '🛑',
    label: 'Stop',
  },
}

export default function FlagCard({ flags }: FlagCardProps) {
  if (flags.length === 0) return null

  return (
    <Card>
      <h2 className="font-heading text-xl text-green-dark mb-4">Site Flags</h2>
      <div className="space-y-2">
        {flags.map((flag, i) => {
          const style = flagStyles[flag.severity]
          return (
            <div
              key={i}
              className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${style.bg} ${style.border}`}
            >
              <span className="text-base shrink-0 mt-0.5">{style.icon}</span>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 block mb-0.5">
                  {style.label}
                </span>
                <p className="text-sm text-gray-text">{flag.message}</p>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
