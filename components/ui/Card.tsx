import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  accent?: string
  children: React.ReactNode
}

export default function Card({ accent, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={[
        'bg-white rounded-xl border border-gray-200 p-6',
        accent ? 'border-l-4' : '',
        className,
      ].join(' ')}
      style={accent ? { borderLeftColor: accent } : undefined}
      {...props}
    >
      {children}
    </div>
  )
}
