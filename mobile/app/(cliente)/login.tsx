import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { Link, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { clienteAuthService } from '../../src/services/clienteAuthService'
import { colors, fontSize, radii, spacing } from '../../src/theme'

export default function LoginCliente() {
  const router = useRouter()
  const [emailOuCpf, setEmailOuCpf] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [carregando, setCarregando] = useState(false)

  async function entrar() {
    if (!emailOuCpf.trim() || !senha) {
      Alert.alert('Atenção', 'Preencha e-mail/CPF e senha')
      return
    }
    setCarregando(true)
    try {
      await clienteAuthService.login({ emailOuCpf: emailOuCpf.trim(), senha })
      router.replace('/(cliente)/home')
    } catch (err: any) {
      Alert.alert('Erro', err.response?.data?.message ?? 'E-mail/CPF ou senha inválidos')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>A</Text>
          </View>
          <Text style={styles.brandText}>
            Agenda<Text style={{ color: colors.violet }}>Inteligente</Text>
          </Text>
        </View>

        <Text style={styles.titulo}>Bem-vindo!</Text>
        <Text style={styles.subtitulo}>Marque seu horário em poucos toques</Text>

        <View style={styles.form}>
          <View>
            <Text style={styles.label}>E-mail ou CPF</Text>
            <TextInput
              value={emailOuCpf}
              onChangeText={setEmailOuCpf}
              placeholder="seu@email.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
          </View>

          <View>
            <Text style={styles.label}>Senha</Text>
            <View style={styles.inputComIcone}>
              <TextInput
                value={senha}
                onChangeText={setSenha}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!mostrarSenha}
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
              />
              <Pressable onPress={() => setMostrarSenha((v) => !v)} style={styles.eyeBtn}>
                <Ionicons name={mostrarSenha ? 'eye-off' : 'eye'} size={20} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>

          <Pressable style={[styles.botaoPrimario, carregando && { opacity: 0.7 }]} onPress={entrar} disabled={carregando}>
            <Text style={styles.botaoPrimarioText}>{carregando ? 'Entrando...' : 'Entrar'}</Text>
          </Pressable>

          <Link href="/(cliente)/cadastro" asChild>
            <Pressable style={styles.botaoSecundario}>
              <Text style={styles.botaoSecundarioText}>Criar conta grátis</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  brand: { alignItems: 'center', marginBottom: spacing['2xl'] },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    backgroundColor: colors.violet,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoText: { color: 'white', fontSize: 32, fontWeight: '900' },
  brandText: { fontSize: fontSize.lg, fontWeight: '900', color: colors.text },
  titulo: { fontSize: fontSize['2xl'], fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: spacing.xs },
  subtitulo: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
  form: { gap: spacing.md },
  label: { fontSize: fontSize.xs, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.bgWhite,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: colors.text,
  },
  inputComIcone: { flexDirection: 'row', alignItems: 'center' },
  eyeBtn: { padding: spacing.md, position: 'absolute', right: 0 },
  botaoPrimario: {
    backgroundColor: colors.violet,
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  botaoPrimarioText: { color: 'white', fontSize: fontSize.base, fontWeight: '700' },
  botaoSecundario: {
    borderWidth: 1,
    borderColor: colors.violet,
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  botaoSecundarioText: { color: colors.violet, fontSize: fontSize.base, fontWeight: '600' },
})
