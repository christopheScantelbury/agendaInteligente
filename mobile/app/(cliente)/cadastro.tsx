import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { clienteAuthService } from '../../src/services/clienteAuthService'
import { colors, fontSize, radii, spacing } from '../../src/theme'

export default function CadastroCliente() {
  const router = useRouter()
  const [form, setForm] = useState({
    nome: '',
    cpfCnpj: '',
    email: '',
    telefone: '',
    dataNascimento: '',
    senha: '',
    confirmar: '',
  })
  const [carregando, setCarregando] = useState(false)

  function set(k: keyof typeof form, v: string) {
    setForm((s) => ({ ...s, [k]: v }))
  }

  async function cadastrar() {
    if (!form.nome.trim() || !form.cpfCnpj.trim() || !form.email.trim() || !form.telefone.trim() || !form.dataNascimento || !form.senha) {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios.')
      return
    }
    if (form.senha.length < 6) {
      Alert.alert('Atenção', 'A senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (form.senha !== form.confirmar) {
      Alert.alert('Atenção', 'As senhas não coincidem.')
      return
    }
    setCarregando(true)
    try {
      await clienteAuthService.cadastrar({
        nome: form.nome.trim(),
        cpfCnpj: form.cpfCnpj.replace(/\D/g, ''),
        email: form.email.trim(),
        telefone: form.telefone.replace(/\D/g, ''),
        dataNascimento: form.dataNascimento,
        senha: form.senha,
      })
      // Login automático
      await clienteAuthService.login({ emailOuCpf: form.email.trim(), senha: form.senha })
      router.replace('/(cliente)/home')
    } catch (err: any) {
      Alert.alert('Erro', err.response?.data?.message ?? 'Não foi possível criar conta.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.voltar} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
          <Text style={styles.voltarText}>Voltar</Text>
        </Pressable>

        <Text style={styles.titulo}>Crie sua conta</Text>
        <Text style={styles.subtitulo}>É rápido — leva menos de 1 minuto</Text>

        <View style={styles.form}>
          <Field label="Nome completo *" value={form.nome} onChange={(v: string) => set('nome', v)} />
          <Field label="CPF *" value={form.cpfCnpj} onChange={(v: string) => set('cpfCnpj', v)} keyboardType="numeric" />
          <Field label="Data de nascimento *" value={form.dataNascimento} onChange={(v: string) => set('dataNascimento', v)} placeholder="AAAA-MM-DD" />
          <Field label="E-mail *" value={form.email} onChange={(v: string) => set('email', v)} keyboardType="email-address" autoCapitalize="none" />
          <Field label="Telefone (WhatsApp) *" value={form.telefone} onChange={(v: string) => set('telefone', v)} keyboardType="phone-pad" />
          <Field label="Senha *" value={form.senha} onChange={(v: string) => set('senha', v)} secureTextEntry hint="Mínimo 6 caracteres" />
          <Field label="Confirmar senha *" value={form.confirmar} onChange={(v: string) => set('confirmar', v)} secureTextEntry />

          <Pressable style={[styles.botaoPrimario, carregando && { opacity: 0.7 }]} onPress={cadastrar} disabled={carregando}>
            <Text style={styles.botaoPrimarioText}>{carregando ? 'Criando conta...' : 'Criar conta'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function Field({ label, hint, ...rest }: any) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        {...rest}
      />
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.xl, backgroundColor: colors.bg },
  voltar: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  voltarText: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  titulo: { fontSize: fontSize['2xl'], fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  subtitulo: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xl },
  form: { gap: spacing.md },
  label: { fontSize: fontSize.xs, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  hint: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xs },
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
  botaoPrimario: {
    backgroundColor: colors.violet,
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  botaoPrimarioText: { color: 'white', fontSize: fontSize.base, fontWeight: '700' },
})
