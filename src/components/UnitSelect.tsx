import { useState } from 'react'
import { COMMON_UNITS } from '../types'

interface UnitSelectProps {
  value: string
  onChange: (value: string) => void
  className?: string
  inputClassName?: string
}

export default function UnitSelect({ value, onChange, className = '', inputClassName = '' }: UnitSelectProps) {
  const isCommon = COMMON_UNITS.includes(value) || value === ''
  // Only maintain local custom string if they haven't submitted yet
  const [customValue, setCustomValue] = useState(isCommon ? '' : value)

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val === 'custom') {
      onChange(customValue)
    } else {
      onChange(val)
    }
  }

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomValue(e.target.value)
    onChange(e.target.value)
  }

  const selectValue = isCommon ? value : 'custom'

  return (
    <div className={`flex gap-2 items-center ${className}`}>
      <select
        value={selectValue}
        onChange={handleSelect}
        className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <option value="" disabled>选择单位</option>
        {COMMON_UNITS.map(u => (
          <option key={u} value={u}>{u}</option>
        ))}
        <option value="custom">自定义...</option>
      </select>
      {!isCommon && (
        <input
          type="text"
          value={value}
          onChange={handleCustomChange}
          placeholder="输入单位"
          className={`w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputClassName}`}
        />
      )}
    </div>
  )
}
