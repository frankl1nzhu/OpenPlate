import { useState, useEffect } from 'react'
import { COMMON_UNITS } from '../types'

interface UnitSelectProps {
  value: string
  onChange: (value: string) => void
  className?: string
  inputClassName?: string
}

export default function UnitSelect({ value, onChange, className = '', inputClassName = '' }: UnitSelectProps) {
  const initialIsCustom = !COMMON_UNITS.includes(value) && value !== ''
  const [isCustomMode, setIsCustomMode] = useState(initialIsCustom)

  useEffect(() => {
    if (!COMMON_UNITS.includes(value) && value !== '') {
      setIsCustomMode(true)
    }
  }, [value])

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val === 'custom') {
      setIsCustomMode(true)
      if (COMMON_UNITS.includes(value)) {
        onChange('')
      }
    } else {
      setIsCustomMode(false)
      onChange(val)
    }
  }

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className={`flex gap-2 items-center ${className}`}>
      <select
        value={isCustomMode ? 'custom' : value}
        onChange={handleSelect}
        className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <option value="" disabled>选择单位</option>
        {COMMON_UNITS.map(u => (
          <option key={u} value={u}>{u}</option>
        ))}
        <option value="custom">自定义...</option>
      </select>
      {isCustomMode && (
        <input
          type="text"
          value={value}
          onChange={handleCustomChange}
          placeholder="输入单位"
          autoFocus
          className={`w-24 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputClassName}`}
        />
      )}
    </div>
  )
}
