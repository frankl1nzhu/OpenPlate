import { useState, useEffect } from 'react'
import { COMMON_UNITS } from '../types'

interface UnitSelectProps {
  value: string
  onChange: (value: string) => void
  className?: string
  inputClassName?: string
}

export default function UnitSelect({ value, onChange, className = '', inputClassName = '' }: UnitSelectProps) {
  const isCommon = COMMON_UNITS.includes(value) || value === ''
  const [mode, setMode] = useState<'common' | 'custom'>(isCommon ? 'common' : 'custom')
  const [customValue, setCustomValue] = useState(isCommon ? '' : value)

  useEffect(() => {
    if (!COMMON_UNITS.includes(value) && value !== '' && mode === 'common') {
      setMode('custom')
      setCustomValue(value)
    }
  }, [value, mode])

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val === 'custom') {
      setMode('custom')
      onChange(customValue)
    } else {
      setMode('common')
      onChange(val)
    }
  }

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomValue(e.target.value)
    onChange(e.target.value)
  }

  const selectValue = mode === 'custom' ? 'custom' : value

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
      {mode === 'custom' && (
        <input
          type="text"
          value={customValue}
          onChange={handleCustomChange}
          placeholder="输入单位"
          className={`w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputClassName}`}
        />
      )}
    </div>
  )
}
