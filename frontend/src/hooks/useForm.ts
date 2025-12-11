import { useState, useCallback } from 'react'

interface UseFormOptions<T> {
  initialValues: T
  onSubmit: (values: T) => Promise<void> | void
  validate?: (values: T) => Partial<Record<keyof T, string>>
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  onSubmit,
  validate,
}: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({})

  const setValue = useCallback((name: keyof T, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }))
    // Limpa erro quando o campo é alterado
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }, [errors])

  const setFieldTouched = useCallback((name: keyof T) => {
    setTouched((prev) => ({ ...prev, [name]: true }))
  }, [])

  const handleChange = useCallback(
    (name: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value
      setValue(name, value)
    },
    [setValue]
  )

  const handleBlur = useCallback(
    (name: keyof T) => () => {
      setFieldTouched(name)
      if (validate) {
        const validationErrors = validate(values)
        if (validationErrors[name]) {
          setErrors((prev) => ({ ...prev, [name]: validationErrors[name] }))
        }
      }
    },
    [setFieldTouched, validate, values]
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setIsSubmitting(true)
      setErrors({})

      try {
        if (validate) {
          const validationErrors = validate(values)
          if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors)
            setIsSubmitting(false)
            return
          }
        }

        await onSubmit(values)
      } catch (error: any) {
        console.error('Erro ao submeter formulário:', error)
        setErrors({ submit: error.message || 'Erro ao processar formulário' } as any)
      } finally {
        setIsSubmitting(false)
      }
    },
    [values, onSubmit, validate]
  )

  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
    setIsSubmitting(false)
  }, [initialValues])

  return {
    values,
    errors,
    isSubmitting,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    setValue,
    setFieldTouched,
    reset,
  }
}

