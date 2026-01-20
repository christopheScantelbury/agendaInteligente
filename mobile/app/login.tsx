import React, { useState } from 'react'
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { router } from 'expo-router'
import { authService } from '../src/services/authService'
import Button from '../src/components/Button'
import FormField from '../src/components/FormField'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  const handleSubmit = async () => {
    setErro('')
    setLoading(true)

    try {
      await authService.login({ email, senha })
      router.replace('/(tabs)')
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Erro ao fazer login'
      setErro(errorMessage)
      Alert.alert('Erro', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>Agenda Inteligente</Text>
          <Text style={styles.subtitle}>Faça login para continuar</Text>

          {erro && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{erro}</Text>
            </View>
          )}

          <FormField label="Email" required>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!loading}
            />
          </FormField>

          <FormField label="Senha" required>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Senha"
                value={senha}
                onChangeText={setSenha}
                secureTextEntry={!mostrarSenha}
                autoCapitalize="none"
                autoComplete="password"
                editable={!loading}
              />
              <Button
                variant="ghost"
                size="sm"
                onPress={() => setMostrarSenha(!mostrarSenha)}
                style={styles.eyeButton}
              >
                <Text>{mostrarSenha ? '👁️' : '👁️‍🗨️'}</Text>
              </Button>
            </View>
          </FormField>

          <Button
            onPress={handleSubmit}
            isLoading={loading}
            style={styles.submitButton}
          >
            Entrar
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  content: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: 32,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  eyeButton: {
    padding: 8,
    marginRight: 4,
  },
  submitButton: {
    marginTop: 24,
    width: '100%',
  },
})
