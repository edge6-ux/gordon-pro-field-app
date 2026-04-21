'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Menu, X, ClipboardList, Search, Phone } from 'lucide-react'

const NAV_LINKS = [
  { label: 'Request Assessment', href: '/submit',  icon: ClipboardList },
  { label: 'Track Your Job',     href: '/track',   icon: Search },
  { label: 'Call Us',            href: 'tel:+17702716072', icon: Phone, external: true },
]

export default function AppHeader() {
  const pathname  = usePathname()
  const isOperator = pathname?.startsWith('/operator')
  const isAdmin    = pathname?.startsWith('/admin')
  const showNav    = !isOperator && !isAdmin

  const [open, setOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on route change
  useEffect(() => { setOpen(false) }, [pathname])

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
      <div className="px-4 sm:px-6 h-14 flex items-center justify-between" ref={drawerRef}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 cursor-pointer">
          <div className="relative w-8 h-8">
            <Image
              src="/images/fieldapp.png"
              alt="Gordon Pro Tree Service"
              fill
              className="object-contain"
              sizes="32px"
              priority
            />
          </div>
          <span className="font-heading text-green-dark text-lg tracking-wide hidden sm:block">
            Gordon Pro
          </span>
        </Link>

        {/* Right side */}
        {isOperator ? (
          <div className="flex items-center gap-2 bg-[#EAF3DE] rounded-full px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-body text-[#27500A] text-xs font-bold">Crew Mode</span>
          </div>
        ) : isAdmin ? (
          <div className="bg-[#E6F1FB] rounded-full px-3 py-1">
            <span className="font-body text-[#0C447C] text-xs font-bold">Admin</span>
          </div>
        ) : (
          <button
            onClick={() => setOpen(o => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-[#1C3A2B] hover:bg-[#F5F2ED] transition-colors"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}

        {/* Dropdown drawer */}
        {showNav && open && (
          <div
            className="absolute top-14 left-0 right-0 bg-white border-b border-gray-100 shadow-lg py-2 z-50"
            style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
          >
            {NAV_LINKS.map(({ label, href, icon: Icon, external }) => {
              const isActive = !external && pathname === href
              return external ? (
                <a
                  key={href}
                  href={href}
                  className="flex items-center gap-3 px-5 py-3.5 font-body text-[15px] text-gray-700 hover:bg-[#F5F2ED] transition-colors"
                  style={isActive ? { borderLeft: '3px solid #C8922A', color: '#1C3A2B', fontWeight: 600 } : { borderLeft: '3px solid transparent' }}
                >
                  <Icon size={17} className="text-[#C8922A] shrink-0" />
                  {label}
                </a>
              ) : (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 px-5 py-3.5 font-body text-[15px] text-gray-700 hover:bg-[#F5F2ED] transition-colors"
                  style={isActive ? { borderLeft: '3px solid #C8922A', color: '#1C3A2B', fontWeight: 600 } : { borderLeft: '3px solid transparent' }}
                >
                  <Icon size={17} className="text-[#C8922A] shrink-0" />
                  {label}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </header>
  )
}
