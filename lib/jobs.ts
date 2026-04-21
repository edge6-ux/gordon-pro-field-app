import { JobStatus, JOB_STATUS_CONFIG } from './types'

export function getStatusLabel(status: JobStatus): string {
  return JOB_STATUS_CONFIG[status].label
}

export function getNextStatus(status: JobStatus): JobStatus | null {
  return JOB_STATUS_CONFIG[status].next
}

export function isTerminalStatus(status: JobStatus): boolean {
  return status === 'complete' || status === 'cancelled'
}

export function formatReference(code: string): string {
  return `#${code.toUpperCase()}`
}

export function last4Digits(phone: string): string {
  return phone.replace(/\D/g, '').slice(-4)
}

export function getStatusConfig(status: JobStatus) {
  return JOB_STATUS_CONFIG[status]
}

export function getPipelineSteps(): JobStatus[] {
  return ['submitted', 'reviewed', 'assigned', 'in_progress', 'complete']
}

export function isStepComplete(step: JobStatus, currentStatus: JobStatus): boolean {
  const steps = getPipelineSteps()
  return steps.indexOf(step) < steps.indexOf(currentStatus)
}

export function isStepCurrent(step: JobStatus, currentStatus: JobStatus): boolean {
  return step === currentStatus
}
