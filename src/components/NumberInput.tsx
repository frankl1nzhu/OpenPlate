import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react'

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value: number
  onValueChange: (value: number) => void
}

/**
 * A number input that keeps an empty field empty while it is being edited.
 * On focus, if the value is 0 the field clears so the user can type directly.
 * The numeric state still receives 0, so calculations and validation remain safe.
 */
export default function NumberInput({ value, onValueChange, ...props }: NumberInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState(value === 0 ? '' : String(value))

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      // The parent may update this value asynchronously (for example, when loading a form).
      // Do not overwrite an active user's in-progress edit.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setText(value === 0 ? '' : String(value))
    }
  }, [value])

  return (
    <input
      {...props}
      ref={inputRef}
      type="number"
      value={text}
      placeholder="0"
      onFocus={(e) => {
        if (text === '0') setText('')
        props.onFocus?.(e)
      }}
      onBlur={(e) => {
        if (text.trim() === '') {
          setText('')
          onValueChange(0)
        }
        props.onBlur?.(e)
      }}
      onChange={(event) => {
        const nextText = event.target.value
        setText(nextText)
        const nextValue = Number(nextText)
        if (Number.isFinite(nextValue)) onValueChange(nextValue)
      }}
    />
  )
}
