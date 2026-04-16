interface ProgressBarProps {
  currentStep: number
  totalSteps: number
}

export default function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const pct = Math.round((currentStep / totalSteps) * 100)

  return (
    <div className="w-full">
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium text-gray-text">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm text-gray-400">{pct}%</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-dark rounded-full transition-all duration-300 ease-out relative"
          style={{ width: `${pct}%` }}
        >
          <span className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-gold rounded-full shadow-sm" />
        </div>
      </div>
      <div className="flex justify-between mt-2">
        {Array.from({ length: totalSteps }, (_, i) => (
          <span
            key={i}
            className={`text-xs ${i + 1 <= currentStep ? 'text-green-dark font-medium' : 'text-gray-400'}`}
          >
            {i + 1}
          </span>
        ))}
      </div>
    </div>
  )
}
