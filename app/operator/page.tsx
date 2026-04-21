'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Camera, ClipboardList } from 'lucide-react'

type Stats = { today: number; week: number; total: number }

function StatItem({ label, value }: { label: string; value: number | null }) {
  return (
    <div
      className="flex flex-col items-center gap-1 flex-1 pt-3"
      style={{ borderTop: '2px solid rgba(200,146,42,0.3)' }}
    >
      <span className="font-heading text-[28px] leading-none text-white font-bold">
        {value === null ? (
          <span className="inline-block w-8 h-6 bg-white/10 rounded animate-pulse" />
        ) : (
          value
        )}
      </span>
      <span className="text-[11px] text-white/50 font-body uppercase tracking-widest mt-1">{label}</span>
    </div>
  )
}

export default function OperatorPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/operator/stats')
      .then(r => r.json())
      .then((data: Stats) => setStats(data))
      .catch(() => setStats({ today: 0, week: 0, total: 0 }))
  }, [])

  return (
    <div className="relative min-h-[calc(100svh-3.5rem)] bg-green-dark flex flex-col items-center justify-center px-6 overflow-hidden">

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 pt-4 px-4 flex items-center justify-between">
        <div className="relative w-12 h-12">
          <Image
            src="/images/fieldapp.png"
            alt="Gordon Pro"
            fill
            className="object-contain"
            sizes="48px"
          />
        </div>
        <button
          onClick={() => router.push('/admin')}
          className="font-body text-[12px] text-white/50 hover:text-white/80 transition-colors px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          Admin
        </button>
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center text-center w-full max-w-xs pb-28 pt-16">
        <div
          className="animate-pulse-border flex items-center justify-center mb-8"
          style={{
            width: 96,
            height: 96,
            borderRadius: 24,
            borderWidth: 2,
            borderStyle: 'solid',
            backgroundColor: 'transparent',
          }}
        >
          <Camera size={40} color="#C8922A" strokeWidth={1.5} />
        </div>

        <h1 className="font-heading text-[36px] text-white mb-3 leading-tight">Analyze a Tree</h1>
        <p className="text-white/70 text-base font-body mb-10 max-w-xs leading-relaxed">
          Take or upload photos to get instant species ID and job tips.
        </p>

        {/* Primary CTA */}
        <button
          onClick={() => router.push('/operator/analyze')}
          className="w-full flex items-center justify-center gap-3 bg-gold text-[#1A1A1A] rounded-2xl font-heading text-[18px] uppercase tracking-wider active:scale-[0.98] transition-transform"
          style={{ height: 64 }}
        >
          <Camera size={20} />
          Analyze a Tree
        </button>

        {/* Secondary button */}
        <button
          onClick={() => router.push('/admin')}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-body text-[13px] text-white active:scale-[0.98] transition-transform mt-4"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          <ClipboardList size={16} className="text-white" />
          Recent Jobs
        </button>
      </div>

      {/* Bottom stats bar */}
      <div className="absolute bottom-0 left-0 right-0 pb-6 px-6">
        <div className="flex items-start gap-4">
          <StatItem label="Today" value={stats?.today ?? null} />
          <div className="w-px h-12 bg-white/20 mt-3" />
          <StatItem label="This Week" value={stats?.week ?? null} />
          <div className="w-px h-12 bg-white/20 mt-3" />
          <StatItem label="Total" value={stats?.total ?? null} />
        </div>
      </div>

    </div>
  )
}
