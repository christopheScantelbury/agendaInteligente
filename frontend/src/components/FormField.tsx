import { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  htmlFor?: string
  required?: boolean
  error?: string
  children: ReactNode
  hint?: string
}

export default function FormField({
  label,
  htmlFor,
  required = false,
  error,
  children,
  hint,
}: FormFieldProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-1 text-sm text-gray-500">{hint}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

