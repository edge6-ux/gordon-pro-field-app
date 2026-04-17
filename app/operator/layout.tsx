import AuthGuard from '@/components/operator/AuthGuard'
import SessionWarning from '@/components/operator/SessionWarning'

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      {children}
      <SessionWarning />
    </AuthGuard>
  )
}
