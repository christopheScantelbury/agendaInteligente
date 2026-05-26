import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native'
import { Link, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { clienteAuthService, ClienteTokenResponse } from '../../src/services/clienteAuthService'
import { colors, fontSize, radii, spacing } from '../../src/theme'

export default function Perfil() {
  const router = useRouter()
  const [cliente, setCliente] = useState<ClienteTokenResponse | null>(null)

  useEffect(() => {
    void clienteAuthService.getCliente().then(setCliente)
  }, [])

  function confirmarSair() {
    Alert.alert('Sair', 'Deseja mesmo encerrar sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await clienteAuthService.logout()
          router.replace('/(cliente)/login')
        },
      },
    ])
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable style={styles.voltar} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
          <Text style={styles.voltarText}>Voltar</Text>
        </Pressable>

        <Text style={styles.titulo}>Meu perfil</Text>

        <View style={styles.card}>
          <Row icon="person-outline" label="Nome" value={cliente?.nome ?? '—'} />
          <Row icon="mail-outline" label="E-mail" value={cliente?.email ?? '—'} />
          <Row icon="finger-print-outline" label="ID" value={cliente?.clienteId?.toString() ?? '—'} />
        </View>

        <Text style={styles.secaoTitulo}>Conta</Text>
        <Pressable style={[styles.card, styles.acaoItem]} onPress={confirmarSair}>
          <View style={[styles.iconCircle, { backgroundColor: colors.errorBg }]}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.acaoLabel}>Sair</Text>
            <Text style={styles.acaoHint}>Encerrar sessão neste dispositivo</Text>
          </View>
        </Pressable>
      </ScrollView>

      <View style={styles.tabBar}>
        <Link href="/(cliente)/home" asChild>
          <Pressable style={styles.tab}>
            <Ionicons name="home-outline" size={22} color={colors.textMuted} />
            <Text style={styles.tabLabel}>Início</Text>
          </Pressable>
        </Link>
        <Link href="/(cliente)/meus-agendamentos" asChild>
          <Pressable style={styles.tab}>
            <Ionicons name="calendar-outline" size={22} color={colors.textMuted} />
            <Text style={styles.tabLabel}>Meus horários</Text>
          </Pressable>
        </Link>
        <Pressable style={[styles.tab, { borderTopWidth: 2, borderTopColor: colors.violet }]}>
          <Ionicons name="person" size={22} color={colors.violet} />
          <Text style={[styles.tabLabel, { color: colors.violet }]}>Perfil</Text>
        </Pressable>
      </View>
    </View>
  )
}

function Row({ icon, label, value }: any) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={colors.textMuted} style={{ marginRight: spacing.md }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: 100 },
  voltar: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  voltarText: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  titulo: { fontSize: fontSize['2xl'], fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  card: { backgroundColor: colors.bgWhite, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  rowLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  rowValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: '500', marginTop: 2 },
  secaoTitulo: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.sm },
  acaoItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  iconCircle: { width: 40, height: 40, borderRadius: radii.full, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  acaoLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  acaoHint: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  tabBar: { flexDirection: 'row', backgroundColor: colors.bgWhite, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: 20, position: 'absolute', bottom: 0, left: 0, right: 0 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md },
  tabLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2, fontWeight: '500' },
})
