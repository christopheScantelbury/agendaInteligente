import React from 'react'
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from 'react-native'

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  disabled?: boolean
  onPress?: () => void
  children: React.ReactNode
  style?: ViewStyle
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  onPress,
  children,
  style,
}) => {
  const variantStyles: Record<string, ViewStyle> = {
    primary: { backgroundColor: '#2563eb' },
    secondary: { backgroundColor: '#e5e7eb' },
    danger: { backgroundColor: '#dc2626' },
    ghost: { backgroundColor: 'transparent' },
    success: { backgroundColor: '#16a34a' },
  }

  const textVariantStyles: Record<string, TextStyle> = {
    primary: { color: '#ffffff' },
    secondary: { color: '#111827' },
    danger: { color: '#ffffff' },
    ghost: { color: '#374151' },
    success: { color: '#ffffff' },
  }

  const sizeStyles: Record<string, ViewStyle> = {
    sm: { paddingHorizontal: 12, paddingVertical: 6 },
    md: { paddingHorizontal: 16, paddingVertical: 8 },
    lg: { paddingHorizontal: 24, paddingVertical: 12 },
  }

  const textSizeStyles: Record<string, TextStyle> = {
    sm: { fontSize: 14 },
    md: { fontSize: 16 },
    lg: { fontSize: 18 },
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        variantStyles[variant],
        sizeStyles[size],
        (disabled || isLoading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.7}
    >
      {isLoading && <ActivityIndicator size="small" color={textVariantStyles[variant].color} style={styles.loader} />}
      <Text style={[styles.text, textVariantStyles[variant], textSizeStyles[size]]}>
        {children}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    fontWeight: '600',
  },
  loader: {
    marginRight: 8,
  },
  disabled: {
    opacity: 0.5,
  },
})

export default Button
