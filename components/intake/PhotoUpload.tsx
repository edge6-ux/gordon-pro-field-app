'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import Image from 'next/image'

interface PhotoUploadProps {
  value: File[]
  onChange: (files: File[]) => void
  maxFiles?: number
}

export default function PhotoUpload({ value, onChange, maxFiles = 5 }: PhotoUploadProps) {
  const [previews, setPreviews] = useState<string[]>([])

  const onDrop = useCallback(
    (accepted: File[]) => {
      const combined = [...value, ...accepted].slice(0, maxFiles)
      onChange(combined)
      const newPreviews = combined.map((f) => URL.createObjectURL(f))
      setPreviews((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p))
        return newPreviews
      })
    },
    [value, onChange, maxFiles]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'] },
    maxFiles,
    maxSize: 10 * 1024 * 1024,
  })

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(previews[index])
    const newFiles = value.filter((_, i) => i !== index)
    const newPreviews = previews.filter((_, i) => i !== index)
    onChange(newFiles)
    setPreviews(newPreviews)
  }

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={[
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer',
          'transition-colors duration-150',
          isDragActive
            ? 'border-gold bg-gold-light'
            : 'border-gray-300 hover:border-green-dark hover:bg-green-dark/5',
        ].join(' ')}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p className="text-sm font-medium text-gray-text">
            {isDragActive ? 'Drop photos here' : 'Drag & drop photos, or click to browse'}
          </p>
          <p className="text-xs text-gray-400">
            Up to {maxFiles} photos · JPG, PNG, WEBP, HEIC · Max 10MB each
          </p>
        </div>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {previews.map((src, i) => (
            <div key={src} className="relative aspect-square group">
              <Image
                src={src}
                alt={`Photo ${i + 1}`}
                fill
                className="object-cover rounded-lg"
                sizes="100px"
              />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full
                           text-xs flex items-center justify-center opacity-0 group-hover:opacity-100
                           transition-opacity duration-150"
                aria-label="Remove photo"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">
        {value.length}/{maxFiles} photos selected
      </p>
    </div>
  )
}
