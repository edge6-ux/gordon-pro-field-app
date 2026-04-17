import Link from 'next/link'
import Image from 'next/image'

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
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
        <span className="font-body text-xs text-gray-400 tracking-wider uppercase">
          Field App
        </span>
      </div>
    </header>
  )
}
