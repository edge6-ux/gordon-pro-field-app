'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Camera, ImagePlus, ClipboardList } from 'lucide-react'

type Stats = { today: number; week: number; total: number }

function StatItem({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex flex-col items-center gap-0.5 flex-1">
      <span className="font-heading text-[22px] leading-none text-white">
        {value === null ? (
          <span className="inline-block w-8 h-5 bg-white/10 rounded animate-pulse" />
        ) : (
          value
        )}
      </span>
      <span className="text-[11px] text-white/50 font-body">{label}</span>
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
        <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white text-[13px] font-body">Crew Mode</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center text-center w-full max-w-xs pb-28 pt-16">
        <div
          className="w-[120px] h-[120px] rounded-3xl flex items-center justify-center mb-8"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '2px solid rgba(200,146,42,0.4)',
          }}
        >
          <Camera className="text-gold" size={48} />
        </div>

        <h1 className="font-heading text-[36px] text-white mb-3 leading-tight">Analyze a Tree</h1>
        <p className="text-white/70 text-base font-body mb-12 max-w-xs leading-relaxed">
          Take or upload photos to get instant species ID and job tips.
        </p>

        {/* Primary CTA */}
        <button
          onClick={() => router.push('/operator/analyze')}
          className="w-full flex items-center justify-center gap-3 bg-gold text-[#1A1A1A] rounded-2xl py-5 font-heading text-xl uppercase tracking-wider active:scale-[0.98] transition-transform"
        >
          <Camera size={20} />
          Take Photos
        </button>

        {/* Secondary buttons */}
        <div className="flex gap-3 w-full mt-4">
          <button
            onClick={() => router.push('/operator/analyze?mode=library')}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 font-body text-[14px] text-white active:scale-[0.98] transition-transform"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <ImagePlus size={16} className="text-white" />
            Upload from Library
          </button>
          <button
            onClick={() => router.push('/admin')}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 font-body text-[14px] text-white active:scale-[0.98] transition-transform"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <ClipboardList size={16} className="text-white" />
            Recent Jobs
          </button>
        </div>
      </div>

      {/* Bottom stats bar */}
      <div className="absolute bottom-0 left-0 right-0 pb-6 px-6">
        <div className="flex items-center" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
          <StatItem label="Today" value={stats?.today ?? null} />
          <div className="w-px h-8 bg-white/20 mx-2" />
          <StatItem label="This Week" value={stats?.week ?? null} />
          <div className="w-px h-8 bg-white/20 mx-2" />
          <StatItem label="Total" value={stats?.total ?? null} />
        </div>
      </div>

    </div>
  )
}
