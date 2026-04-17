'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Home,
  Camera,
  Cpu,
  ClipboardList,
  Shield,
  Award,
  Phone,
  Check,
} from 'lucide-react'

// ─── Sub-components ───────────────────────────────────────────────────────────

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <Check size={14} className="text-gold shrink-0" strokeWidth={2.5} />
      <span className="text-sm text-gray-500">{children}</span>
    </li>
  )
}

function Step({
  number,
  icon,
  title,
  description,
  delay,
}: {
  number: string
  icon: React.ReactNode
  title: string
  description: string
  delay: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className="flex flex-col items-center text-center motion-safe:transition-all motion-safe:duration-500"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      <div className="relative mb-4">
        <div className="w-14 h-14 rounded-full bg-gold-light flex items-center justify-center">
          {icon}
        </div>
        <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gold text-green-dark text-xs font-bold flex items-center justify-center">
          {number}
        </span>
      </div>
      <h3 className="font-heading text-base text-green-dark mb-1">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed max-w-[160px]">{description}</p>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [heroVisible, setHeroVisible] = useState(false)
  const [cardVisible, setCardVisible] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setHeroVisible(true), 50)
    const t2 = setTimeout(() => setCardVisible(true), 200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <>
      {/* ── HERO ── */}
      <section className="bg-green-dark py-16 md:py-24">
        <div
          className="max-w-2xl mx-auto px-4 flex flex-col items-center text-center motion-safe:transition-all motion-safe:duration-500"
          style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(12px)' }}
        >
          <div className="relative w-[120px] h-[120px] mb-6">
            <Image
              src="/images/fieldapp.png"
              alt="Gordon Pro Tree Service"
              fill
              className="object-contain"
              sizes="120px"
              priority
            />
          </div>
          <h1 className="font-heading text-[36px] md:text-[48px] text-white leading-tight mb-4">
            Gordon Pro Field App
          </h1>
          <p className="text-white/80 text-[18px] leading-relaxed max-w-lg">
            Upload photos of your tree and get an instant AI-powered assessment — then we&apos;ll
            reach out to discuss the job and pricing.
          </p>
        </div>
      </section>

      {/* ── CUSTOMER CARD ── */}
      <section className="bg-off-white py-16">
        <div className="max-w-3xl mx-auto px-4 flex justify-center">
          <Link
            href="/submit"
            className={[
              'group block w-full max-w-md bg-white border-2 border-gray-200 rounded-2xl p-8',
              'hover:border-gold hover:shadow-lg hover:scale-[1.02]',
              'transition-all duration-200 cursor-pointer motion-safe:transition-all',
            ].join(' ')}
            style={{
              opacity: cardVisible ? 1 : 0,
              transform: cardVisible ? 'translateY(0)' : 'translateY(16px)',
              transitionDelay: '100ms',
            }}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-[72px] h-[72px] rounded-full bg-gold-light flex items-center justify-center mb-6">
                <Home size={32} className="text-gold" />
              </div>
              <h2 className="font-heading text-2xl text-green-dark mb-3">
                Request a Free Assessment
              </h2>
              <p className="text-gray-500 text-[15px] leading-relaxed mb-6">
                Upload photos of your tree, tell us about the job, and we&apos;ll get back to
                you with an estimate — usually same day.
              </p>
              <ul className="text-left w-full space-y-2 mb-6">
                <p className="text-xs font-bold text-gray-text tracking-wide mb-3">
                  You&apos;ll need:
                </p>
                <CheckItem>2-3 photos of the tree</CheckItem>
                <CheckItem>Your contact information</CheckItem>
                <CheckItem>Property address</CheckItem>
              </ul>
              <span className="block w-full text-center bg-gold text-green-dark font-medium rounded-lg py-3 px-4 text-sm transition-colors duration-150 group-hover:bg-amber-600">
                Get a Free Assessment →
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-white py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <p className="text-gold text-xs font-semibold uppercase tracking-widest mb-3">
            How It Works
          </p>
          <h2 className="font-heading text-[28px] text-green-dark mb-12">
            AI-Powered Tree Assessment
          </h2>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-4">
            <div className="hidden md:block absolute top-7 left-[calc(16.67%+28px)] right-[calc(16.67%+28px)] h-px border-t-2 border-dashed border-gray-200" />
            <Step
              number="1"
              icon={<Camera size={24} className="text-gold" />}
              title="Upload Photos"
              description="Take 2-3 clear photos of the tree from different angles."
              delay={0}
            />
            <Step
              number="2"
              icon={<Cpu size={24} className="text-gold" />}
              title="AI Analysis"
              description="Our AI identifies the species and analyzes site conditions."
              delay={100}
            />
            <Step
              number="3"
              icon={<ClipboardList size={24} className="text-gold" />}
              title="Get Results"
              description="Receive species info, crew tips, and any hazard flags instantly."
              delay={200}
            />
          </div>
        </div>
      </section>

      {/* ── TRUST STRIP ── */}
      <section className="bg-green-dark py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-0 sm:divide-x sm:divide-white/20">
            {[
              { icon: <Shield size={18} className="text-white" />, label: 'Licensed & Insured' },
              { icon: <Award size={18} className="text-white" />, label: 'Certified Arborists' },
              { icon: <Phone size={18} className="text-white" />, label: '(770) 271-6072' },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-2 sm:px-10">
                {icon}
                <span className="text-white/80 text-sm font-body">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
