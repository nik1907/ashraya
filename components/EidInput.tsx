'use client'

import { useState } from 'react'

import { formatEid } from '@/lib/validation'

/** Emirates ID input that auto-inserts the dashes as you type (784-YYYY-NNNNNNN-N). */
export function EidInput({
  name,
  required,
  className,
  defaultValue = '',
}: {
  name: string
  required?: boolean
  className?: string
  defaultValue?: string
}) {
  const [value, setValue] = useState(() => formatEid(defaultValue))
  return (
    <input
      name={name}
      value={value}
      onChange={(e) => setValue(formatEid(e.target.value))}
      required={required}
      inputMode="numeric"
      placeholder="784-1990-1234567-1"
      maxLength={18}
      className={className}
    />
  )
}
