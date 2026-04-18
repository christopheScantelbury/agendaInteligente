import { useEffect, useMemo, useRef, useState } from 'react'
import { Clock } from 'lucide-react'

interface TimeWheelInputProps {
  value: string
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

const parseTime = (value: string) => {
  const [hourRaw = '00', minuteRaw = '00'] = value.split(':')
  const hour = HOUR_OPTIONS.includes(hourRaw) ? hourRaw : '00'
  const minute = MINUTE_OPTIONS.includes(minuteRaw) ? minuteRaw : '00'
  return { hour, minute }
}

const selectTimeSegment = (input: HTMLInputElement, caret: number) => {
  if (caret <= 2) {
    input.setSelectionRange(0, 2)
    return
  }
  input.setSelectionRange(3, 5)
}

const normalizeCompleteTime = (text: string): string | null => {
  const match = text.match(/^(\d{1,2}):(\d{1,2})$/)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null
  const normalizedHour = Math.min(23, Math.max(0, hour))
  const normalizedMinute = Math.min(59, Math.max(0, minute))
  return `${String(normalizedHour).padStart(2, '0')}:${String(normalizedMinute).padStart(2, '0')}`
}

export default function TimeWheelInput({
  value,
  onChange,
  className = '',
  disabled = false,
}: TimeWheelInputProps) {
  const [open, setOpen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const hourContainerRef = useRef<HTMLDivElement>(null)
  const minuteContainerRef = useRef<HTMLDivElement>(null)
  const hourOptionRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const minuteOptionRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const { hour, minute } = useMemo(() => parseTime(value), [value])
  const [inputValue, setInputValue] = useState(`${hour}:${minute}`)

  useEffect(() => {
    if (!isFocused) {
      setInputValue(`${hour}:${minute}`)
    }
  }, [hour, minute, isFocused])

  useEffect(() => {
    if (!open) return
    const onOutsideClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutsideClick)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onOutsideClick)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    hourOptionRefs.current[hour]?.scrollIntoView({ block: 'center' })
    minuteOptionRefs.current[minute]?.scrollIntoView({ block: 'center' })
  }, [open, hour, minute])

  const commitInputValue = () => {
    const normalized = normalizeCompleteTime(inputValue)
    if (normalized) {
      onChange(normalized)
      setInputValue(normalized)
      return
    }
    setInputValue(`${hour}:${minute}`)
  }

  return (
    <div ref={rootRef} className="relative mt-1">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        placeholder="HH:mm"
        maxLength={5}
        disabled={disabled}
        value={inputValue}
        onFocus={() => {
          setIsFocused(true)
          const full = `${hour}:${minute}`
          setInputValue(full)
          requestAnimationFrame(() => {
            inputRef.current?.setSelectionRange(0, 2)
          })
        }}
        onClick={(e) => {
          const input = e.currentTarget
          const caret = input.selectionStart ?? 0
          selectTimeSegment(input, caret)
        }}
        onChange={(e) => {
          const nextValue = e.target.value
          if (!/^[\d:]{0,5}$/.test(nextValue)) return
          setInputValue(nextValue)
          const normalized = normalizeCompleteTime(nextValue)
          if (normalized) {
            onChange(normalized)
          }
        }}
        onBlur={() => {
          setIsFocused(false)
          commitInputValue()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commitInputValue()
            inputRef.current?.blur()
            return
          }

          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            const input = e.currentTarget
            const caret = input.selectionStart ?? 0
            if (e.key === 'ArrowLeft') {
              input.setSelectionRange(0, 2)
            } else if (caret < 3) {
              input.setSelectionRange(3, 5)
            } else {
              input.setSelectionRange(0, 2)
            }
            e.preventDefault()
          }
        }}
        className={`${className} relative appearance-none rounded-none bg-transparent pr-8 text-left disabled:cursor-not-allowed disabled:text-slate-400`}
      />
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled}
        className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Abrir seletor de horário"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Clock className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-0.5 w-[126px] rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
            <div
              ref={hourContainerRef}
              className="max-h-36 overflow-y-auto rounded-md border border-slate-100 bg-slate-50 p-1"
            >
              {HOUR_OPTIONS.map((hourOption) => (
                <button
                  key={hourOption}
                  type="button"
                  ref={(el) => {
                    hourOptionRefs.current[hourOption] = el
                  }}
                  onClick={() => {
                    const nextValue = `${hourOption}:${minute}`
                    onChange(nextValue)
                    setInputValue(nextValue)
                  }}
                  className={`mb-1 block w-full rounded-md px-2 py-1 text-center text-sm last:mb-0 ${
                    hourOption === hour
                      ? 'bg-blue-600 font-semibold text-white'
                      : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {hourOption}
                </button>
              ))}
            </div>

            <span className="pt-12 text-sm font-medium text-slate-500">:</span>

            <div
              ref={minuteContainerRef}
              className="max-h-36 overflow-y-auto rounded-md border border-slate-100 bg-slate-50 p-1"
            >
              {MINUTE_OPTIONS.map((minuteOption) => (
                <button
                  key={minuteOption}
                  type="button"
                  ref={(el) => {
                    minuteOptionRefs.current[minuteOption] = el
                  }}
                  onClick={() => {
                    const nextValue = `${hour}:${minuteOption}`
                    onChange(nextValue)
                    setInputValue(nextValue)
                  }}
                  className={`mb-1 block w-full rounded-md px-2 py-1 text-center text-sm last:mb-0 ${
                    minuteOption === minute
                      ? 'bg-blue-600 font-semibold text-white'
                      : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {minuteOption}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
