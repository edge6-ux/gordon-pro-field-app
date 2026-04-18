'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Camera,
  Cpu,
  ClipboardList,
  Shield,
  Award,
  Phone,
  ArrowRight,
  Leaf,
} from 'lucide-react'

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
      <div className="w-10 h-10 rounded-full bg-green-dark flex items-center justify-center mb-4">
        <span className="font-heading text-white text-base font-bold">{number}</span>
      </div>
      <div className="w-12 h-12 rounded-full bg-gold-light flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-heading text-base text-green-dark mb-1">{title}</h3>
      <p className="text-[13px] text-gray-500 leading-relaxed max-w-[160px]">{description}</p>
    </div>
  )
}

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
      <section className="bg-green-dark pt-12 pb-32">
        <div
          className="max-w-2xl mx-auto px-4 flex flex-col items-center text-center motion-safe:transition-all motion-safe:duration-500"
          style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(12px)' }}
        >
          <div className="relative w-20 h-20 mb-5">
            <Image
              src="/images/fieldapp.png"
              alt="Gordon Pro Tree Service"
              fill
              className="object-contain"
              sizes="80px"
              priority
            />
          </div>
          <p className="font-body text-[11px] uppercase tracking-widest mb-2" style={{ color: '#9FE1CB' }}>
            Gordon Pro Tree Service
          </p>
          <h1 className="font-heading text-[36px] md:text-[44px] text-white leading-[1.1] mb-3">
            Free Tree Assessment
          </h1>
          <p className="text-white/70 text-[15px] leading-relaxed max-w-xs">
            Upload photos and get an AI-powered assessment — we&apos;ll follow up with pricing.
          </p>
        </div>
      </section>

      {/* ── CARD (overlaps hero) ── */}
      <section className="bg-off-white pb-16">
        <div className="max-w-[420px] mx-auto px-4">
          <Link
            href="/submit"
            className="block -mt-16 relative z-10"
            style={{
              opacity: cardVisible ? 1 : 0,
              transform: cardVisible ? 'translateY(0)' : 'translateY(16px)',
              transition: 'opacity 400ms ease, transform 400ms ease',
              transitionDelay: '100ms',
            }}
          >
            <div
              className="bg-white rounded-3xl p-8 cursor-pointer hover:scale-[1.01] transition-transform duration-200"
              style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
            >
              {/* Badge */}
              <div className="flex justify-center mb-6">
                <div
                  className="inline-flex items-center gap-2 rounded-full px-4 py-1.5"
                  style={{ background: '#EAF3DE', border: '1px solid #C0DD97' }}
                >
                  <Leaf size={14} style={{ color: '#3B6D11' }} />
                  <span className="font-body text-[13px] font-bold" style={{ color: '#27500A' }}>
                    AI-Powered Species ID
                  </span>
                </div>
              </div>

              <h2 className="font-heading text-[22px] text-green-dark text-center mb-2">
                Request a Free Assessment
              </h2>
              <p className="text-gray-500 text-[14px] leading-relaxed text-center mb-6">
                Upload photos of your tree and we&apos;ll get back to you same day with an estimate.
              </p>

              <ul className="space-y-3 mb-6">
                {[
                  '2-3 clear photos of the tree',
                  'Your contact information',
                  'Property address',
                ].map(item => (
                  <li key={item} className="flex items-center gap-3">
                    <div
                      className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0"
                      style={{ background: '#1C3A2B' }}
                    >
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span className="text-[14px] text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>

              <div
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-heading text-[16px] uppercase tracking-wider text-white transition-colors hover:bg-[#2D5A40]"
                style={{ background: '#1C3A2B' }}
              >
                Get a Free Assessment
                <ArrowRight size={18} />
              </div>
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
            <div
              className="hidden md:block absolute top-5 left-[calc(16.67%+28px)] right-[calc(16.67%+28px)] h-px"
              style={{ borderTop: '2px dashed #1C3A2B' }}
            />
            <Step
              number="1"
              icon={<Camera size={22} className="text-gold" />}
              title="Upload Photos"
              description="Take 2-3 clear photos of the tree from different angles."
              delay={0}
            />
            <Step
              number="2"
              icon={<Cpu size={22} className="text-gold" />}
              title="AI Analysis"
              description="Our AI identifies the species and analyzes site conditions."
              delay={100}
            />
            <Step
              number="3"
              icon={<ClipboardList size={22} className="text-gold" />}
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
