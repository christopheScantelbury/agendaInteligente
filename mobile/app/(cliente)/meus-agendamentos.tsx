import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native'
import { Link, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { clienteAuthService } from '../../src/services/clienteAuthService'
import { colors, fontSize, radii, spacing } from '../../src/theme'

function statusColor(status: string) {
  switch (status) {
    case 'CONFIRMADO':
    case 'EM_ANDAMENTO': return colors.info
    case 'CANCELADO': return colors.error
    case 'NO_SHOW': return colors.warning
    case 'CONCLUIDO':
    case 'FINALIZADO': return colors.success
    default: return colors.textSecondary
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'AGENDADO': return 'Agendado'
    case 'CONFIRMADO': return 'Confirmado'
    case 'EM_ANDAMENTO': return 'Em andamento'
    case 'CANCELADO': return 'Cancelado'
    case 'NO_SHOW': return 'Não compareceu'
    case 'CONCLUIDO':
    case 'FINALIZADO': return 'Concluído'
    default: return status
  }
}

export default function MeusAgendamentos() {
  const router = useRouter()
  const [lista, setLista] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    void carregar()
  }, [])

  async function carregar() {
    setCarregando(true)
    try {
      const ags = await clienteAuthService.meusAgendamentos()
      setLista(ags.sort((a, b) => new Date(b.dataHoraInicio).getTime() - new Date(a.dataHoraInicio).getTime()))
    } finally {
      setCarregando(false)
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable style={styles.voltar} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
          <Text style={styles.voltarText}>Voltar</Text>
        </Pressable>
        <Text style={styles.titulo}>Meus horários</Text>

        {carregando ? (
          <ActivityIndicator color={colors.violet} style={{ marginTop: spacing.xl }} />
        ) : lista.length === 0 ? (
          <View style={styles.vazio}>
            <Ionicons name="calendar-outline" size={32} color={colors.violet} />
            <Text style={styles.vazioText}>Você não tem agendamentos.</Text>
          </View>
        ) : (
          lista.map((a) => (
            <View key={a.id} style={styles.card}>
              <View style={[styles.statusBar, { backgroundColor: statusColor(a.status) }]} />
              <View style={{ flex: 1, padding: spacing.md }}>
                <Text style={styles.cardDataHora}>
                  {new Date(a.dataHoraInicio).toLocaleString('pt-BR', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
                <Text style={styles.cardServico} numberOfLines={1}>
                  {(a.servicos ?? []).map((s: any) => s.servico?.nome).filter(Boolean).join(', ') || 'Atendimento'}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor(a.status) + '33' }]}>
                  <Text style={[styles.statusBadgeText, { color: statusColor(a.status) }]}>{statusLabel(a.status)}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.tabBar}>
        <Link href="/(cliente)/home" asChild>
          <Pressable style={styles.tab}>
            <Ionicons name="home-outline" size={22} color={colors.textMuted} />
            <Text style={styles.tabLabel}>Início</Text>
          </Pressable>
        </Link>
        <Pressable style={[styles.tab, { borderTopWidth: 2, borderTopColor: colors.violet }]}>
          <Ionicons name="calendar" size={22} color={colors.violet} />
          <Text style={[styles.tabLabel, { color: colors.violet }]}>Meus horários</Text>
        </Pressable>
        <Link href="/(cliente)/perfil" asChild>
          <Pressable style={styles.tab}>
            <Ionicons name="person-outline" size={22} color={colors.textMuted} />
            <Text style={styles.tabLabel}>Perfil</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: 100 },
  voltar: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  voltarText: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  titulo: { fontSize: fontSize['2xl'], fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  vazio: { backgroundColor: colors.bgWhite, padding: spacing.xl, borderRadius: radii.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  vazioText: { color: colors.text, fontSize: fontSize.sm, marginTop: spacing.sm },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.bgWhite,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusBar: { width: 4 },
  cardDataHora: { fontSize: fontSize.xs, color: colors.textMuted },
  cardServico: { fontSize: fontSize.base, fontWeight: '600', color: colors.text, marginTop: spacing.xs },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.sm, marginTop: spacing.sm },
  statusBadgeText: { fontSize: fontSize.xs, fontWeight: '600' },
  tabBar: { flexDirection: 'row', backgroundColor: colors.bgWhite, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: 20, position: 'absolute', bottom: 0, left: 0, right: 0 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md },
  tabLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2, fontWeight: '500' },
})
