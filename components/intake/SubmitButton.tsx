'use client'

import Button from '@/components/ui/Button'

interface SubmitButtonProps {
  loading?: boolean
  disabled?: boolean
}

export default function SubmitButton({ loading = false, disabled = false }: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      variant="primary"
      size="lg"
      loading={loading}
      disabled={disabled}
      className="w-full"
    >
      {loading ? 'Analyzing your tree…' : 'Submit for AI Analysis'}
    </Button>
  )
}
