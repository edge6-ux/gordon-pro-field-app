import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function GET() {
  const supabase = getServiceClient()

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const dayOfWeek = now.getDay()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - dayOfWeek)
  startOfWeek.setHours(0, 0, 0, 0)

  const [todayRes, weekRes, totalRes] = await Promise.all([
    supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('source', 'operator')
      .gte('created_at', startOfToday),
    supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('source', 'operator')
      .gte('created_at', startOfWeek.toISOString()),
    supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('source', 'operator'),
  ])

  return NextResponse.json({
    today: todayRes.count ?? 0,
    week: weekRes.count ?? 0,
    total: totalRes.count ?? 0,
  })
}
