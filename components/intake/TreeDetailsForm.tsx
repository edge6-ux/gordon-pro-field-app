'use client'

import type { SubmitFormData } from '@/lib/types'

type FormSection = 'contact' | 'property' | 'tree'

interface TreeDetailsFormProps {
  section: FormSection
  data: SubmitFormData
  onChange: (field: keyof SubmitFormData, value: string) => void
}

const labelClass = 'block text-sm font-medium text-gray-text mb-1'
const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-text ' +
  'focus:outline-none focus:ring-2 focus:ring-green-dark focus:border-transparent ' +
  'transition-colors duration-150'
const selectClass = inputClass + ' bg-white'

export default function TreeDetailsForm({ section, data, onChange }: TreeDetailsFormProps) {
  if (section === 'contact') {
    return (
      <div className="space-y-4">
        <div>
          <label htmlFor="customer_name" className={labelClass}>Full Name *</label>
          <input
            id="customer_name"
            type="text"
            className={inputClass}
            value={data.customer_name}
            onChange={(e) => onChange('customer_name', e.target.value)}
            placeholder="Jane Smith"
            required
          />
        </div>
        <div>
          <label htmlFor="customer_phone" className={labelClass}>Phone Number *</label>
          <input
            id="customer_phone"
            type="tel"
            className={inputClass}
            value={data.customer_phone}
            onChange={(e) => onChange('customer_phone', e.target.value)}
            placeholder="(770) 555-0123"
            required
          />
        </div>
        <div>
          <label htmlFor="customer_email" className={labelClass}>Email Address *</label>
          <input
            id="customer_email"
            type="email"
            className={inputClass}
            value={data.customer_email}
            onChange={(e) => onChange('customer_email', e.target.value)}
            placeholder="jane@example.com"
            required
          />
        </div>
        <div>
          <label htmlFor="property_address" className={labelClass}>Property Address *</label>
          <input
            id="property_address"
            type="text"
            className={inputClass}
            value={data.property_address}
            onChange={(e) => onChange('property_address', e.target.value)}
            placeholder="123 Maple Lane, Atlanta, GA 30301"
            required
          />
        </div>
      </div>
    )
  }

  if (section === 'tree') {
    return (
      <div className="space-y-4">
        <div>
          <label htmlFor="tree_height" className={labelClass}>Estimated Tree Height *</label>
          <select
            id="tree_height"
            className={selectClass}
            value={data.tree_height}
            onChange={(e) => onChange('tree_height', e.target.value)}
          >
            <option value="under_20ft">Under 20 ft</option>
            <option value="20_40ft">20 – 40 ft</option>
            <option value="40_60ft">40 – 60 ft</option>
            <option value="over_60ft">Over 60 ft</option>
          </select>
        </div>
        <div>
          <label htmlFor="tree_location" className={labelClass}>Tree Location on Property</label>
          <input
            id="tree_location"
            type="text"
            className={inputClass}
            value={data.tree_location}
            onChange={(e) => onChange('tree_location', e.target.value)}
            placeholder="e.g. Backyard near fence, front yard by driveway"
          />
        </div>
        <div>
          <label htmlFor="lean_direction" className={labelClass}>Noticeable Lean?</label>
          <select
            id="lean_direction"
            className={selectClass}
            value={data.lean_direction}
            onChange={(e) => onChange('lean_direction', e.target.value)}
          >
            <option value="none">No lean</option>
            <option value="slight">Slight lean</option>
            <option value="moderate">Moderate lean</option>
            <option value="severe">Severe lean</option>
          </select>
        </div>
        <div>
          <label htmlFor="proximity_to_structures" className={labelClass}>
            Proximity to Buildings / Power Lines
          </label>
          <select
            id="proximity_to_structures"
            className={selectClass}
            value={data.proximity_to_structures}
            onChange={(e) => onChange('proximity_to_structures', e.target.value)}
          >
            <option value="none">Not close to anything</option>
            <option value="close">Close (within 20 ft)</option>
            <option value="very_close">Very close (within 10 ft)</option>
            <option value="contact">In contact with structure</option>
          </select>
        </div>
        <div>
          <label htmlFor="additional_notes" className={labelClass}>Additional Notes</label>
          <textarea
            id="additional_notes"
            className={inputClass}
            rows={3}
            value={data.additional_notes}
            onChange={(e) => onChange('additional_notes', e.target.value)}
            placeholder="Any other details about the tree, access concerns, etc."
          />
        </div>
      </div>
    )
  }

  return null
}
