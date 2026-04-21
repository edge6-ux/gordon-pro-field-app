'use client'

import { Printer } from 'lucide-react'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print fixed top-4 right-4 z-10 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[14px] font-body transition-opacity hover:opacity-90"
      style={{ background: '#1C3A2B' }}
    >
      <Printer size={16} />
      Print Report
    </button>
  )
}
