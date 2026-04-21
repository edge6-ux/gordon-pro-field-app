'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export default function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copy reference number"
      className="flex items-center justify-center w-11 h-11 rounded-xl transition-colors duration-150"
      style={{ background: 'rgba(255,255,255,0.12)' }}
    >
      {copied
        ? <Check size={16} color="#4ADE80" />
        : <Copy size={16} color="white" />
      }
    </button>
  )
}
