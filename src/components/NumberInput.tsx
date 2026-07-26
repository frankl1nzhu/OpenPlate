import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react'

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value: number
  onValueChange: (value: number) => void
}

/**
 * A number input that keeps an empty field empty while it is being edited.
 * The numeric state still receives 0, so calculations and validation remain safe.
 */
export default function NumberInput({ value, onValueChange, ...props }: NumberInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState(String(value))

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      // The parent may update this value asynchronously (for example, when loading a form).
      // Do not overwrite an active user's in-progress edit.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setText(String(value))
    }
  }, [value])

  return (
    <input
      {...props}
      ref={inputRef}
      type="number"
      value={text}
      onChange={(event) => {
        const nextText = event.target.value
        setText(nextText)
        const nextValue = Number(nextText)
        if (Number.isFinite(nextValue)) onValueChange(nextValue)
      }}
    />
  )
}
