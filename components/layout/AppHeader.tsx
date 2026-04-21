'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

export default function AppHeader() {
  const pathname = usePathname()
  const isOperator = pathname?.startsWith('/operator')
  const isAdmin = pathname?.startsWith('/admin')

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
      <div className="px-4 sm:px-6 h-14 flex items-center justify-between">
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

        {isOperator ? (
          <div className="flex items-center gap-2 bg-[#EAF3DE] rounded-full px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-body text-[#27500A] text-xs font-bold">Crew Mode</span>
          </div>
        ) : isAdmin ? (
          <div className="bg-[#E6F1FB] rounded-full px-3 py-1">
            <span className="font-body text-[#0C447C] text-xs font-bold">Admin</span>
          </div>
        ) : null}
      </div>
    </header>
  )
}
