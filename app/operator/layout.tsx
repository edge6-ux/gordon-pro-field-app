import AuthGuard from '@/components/operator/AuthGuard'

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>
}
