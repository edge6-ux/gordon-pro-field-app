'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { AlertCircle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error:', error)
  }, [error])

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
        <AlertCircle size={48} className="text-gold mx-auto mb-4" />
        <h1 className="font-heading text-[26px] text-green-dark mb-2">
          Something Went Wrong
        </h1>
        <p className="font-body text-[15px] text-gray-400 mb-8 leading-relaxed">
          We hit an unexpected error. Your submission was not lost — try again or call us directly
          if the problem continues.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full bg-gold text-green-dark font-medium rounded-xl py-4 text-base hover:bg-amber-600 active:scale-[0.98] transition-all duration-150"
          >
            Try Again
          </button>
          <a
            href="tel:7702716072"
            className="w-full border border-gray-300 text-gray-700 font-medium rounded-xl py-4 text-base text-center hover:border-gray-400 active:scale-[0.98] transition-all duration-150"
          >
            Call (770) 271-6072
          </a>
        </div>
        {error.digest && (
          <p className="font-body text-xs text-gray-400 mt-6">Error ref: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
