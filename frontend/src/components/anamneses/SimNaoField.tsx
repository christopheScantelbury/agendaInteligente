interface SimNaoFieldProps {
  label: string
  value: boolean | null | undefined
  obsValue?: string
  onChange: (value: boolean) => void
  onObsChange?: (obs: string) => void
  showObs?: boolean
}

export default function SimNaoField({
  label,
  value,
  obsValue,
  onChange,
  onObsChange,
  showObs = true,
}: SimNaoFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
        <span className="text-sm font-medium text-gray-700 flex-1">{label}</span>
        <div className="flex gap-4">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name={label}
              checked={value === true}
              onChange={() => onChange(true)}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Sim</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name={label}
              checked={value === false}
              onChange={() => onChange(false)}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Não</span>
          </label>
        </div>
      </div>
      {showObs && value === true && onObsChange && (
        <input
          type="text"
          value={obsValue || ''}
          onChange={(e) => onObsChange(e.target.value)}
          placeholder="Observação..."
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
        />
      )}
    </div>
  )
}
