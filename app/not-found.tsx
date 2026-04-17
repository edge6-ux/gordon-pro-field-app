import Image from 'next/image'
import Link from 'next/link'
import { MapPin } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F5F2ED] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="relative w-20 h-20 mx-auto mb-8">
          <Image
            src="/images/fieldapp.png"
            alt="Gordon Pro"
            fill
            className="object-contain"
            sizes="80px"
          />
        </div>
        <MapPin size={48} className="text-gold mx-auto mb-4" />
        <h1 className="font-heading text-[26px] text-green-dark mb-2">Page Not Found</h1>
        <p className="font-body text-[15px] text-gray-400 mb-8 leading-relaxed">
          This page doesn&apos;t exist or the link has expired.
        </p>
        <Link
          href="/"
          className="block w-full bg-gold text-green-dark font-medium rounded-xl py-4 text-base text-center hover:bg-amber-600 active:scale-[0.98] transition-all duration-150"
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}
