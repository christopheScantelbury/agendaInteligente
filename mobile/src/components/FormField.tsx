import React from 'react'
import { View, Text, StyleSheet, TextStyle, ViewStyle } from 'react-native'

interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
  hint?: string
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  error,
  children,
  hint,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      {children}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
      {error && <Text style={styles.error} role="alert">{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  required: {
    color: '#dc2626',
  },
  hint: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  error: {
    marginTop: 4,
    fontSize: 12,
    color: '#dc2626',
  },
})

export default FormField
