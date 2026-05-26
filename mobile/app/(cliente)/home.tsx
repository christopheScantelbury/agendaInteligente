import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native'
import { Link, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { clienteAuthService, ClienteTokenResponse } from '../../src/services/clienteAuthService'
import { colors, fontSize, radii, spacing } from '../../src/theme'

const STATUS_INATIVO = new Set(['CANCELADO', 'CONCLUIDO', 'FINALIZADO', 'NO_SHOW'])

function formatDate(iso: string) {
  const d = new Date(iso)
  const dia = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${dia} · ${hora}`
}

export default function HomeCliente() {
  const router = useRouter()
  const [cliente, setCliente] = useState<ClienteTokenResponse | null>(null)
  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    void carregar()
  }, [])

  async function carregar() {
    setCarregando(true)
    try {
      const c = await clienteAuthService.getCliente()
      setCliente(c)
      const ags = await clienteAuthService.meusAgendamentos()
      setAgendamentos(ags)
    } catch (e) {
      setAgendamentos([])
    } finally {
      setCarregando(false)
      setRefreshing(false)
    }
  }

  const proximo = useMemo(() => {
    const agora = new Date()
    return [...agendamentos]
      .filter((a) => new Date(a.dataHoraInicio) > agora && !STATUS_INATIVO.has(a.status))
      .sort((a, b) => new Date(a.dataHoraInicio).getTime() - new Date(b.dataHoraInicio).getTime())[0]
  }, [agendamentos])

  const primeiroNome = cliente?.nome?.split(' ')[0] ?? ''

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void carregar() }} tintColor={colors.violet} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.olaText}>Olá,</Text>
            <Text style={styles.nomeText}>{primeiroNome}</Text>
          </View>
          <Pressable
            onPress={async () => { await clienteAuthService.logout(); router.replace('/(cliente)/login') }}
            style={styles.logoutBtn}
          >
            <Ionicons name="log-out-outline" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        <Text style={styles.secaoTitulo}>Próximo horário</Text>
        {carregando ? (
          <ActivityIndicator color={colors.violet} style={{ marginVertical: spacing.xl }} />
        ) : proximo ? (
          <View style={styles.proximoCard}>
            <Text style={styles.proximoTitulo}>
              {(proximo.servicos ?? []).map((s: any) => s.servico?.nome).filter(Boolean).join(', ') || 'Atendimento'}
            </Text>
            <Text style={styles.proximoData}>{formatDate(proximo.dataHoraInicio)}</Text>
            {proximo.atendente && (
              <Text style={styles.proximoMeta}>
                <Ionicons name="person" size={12} /> {proximo.atendente?.usuario?.nome ?? proximo.atendente?.nome}
              </Text>
            )}
            {proximo.unidade?.nome && (
              <Text style={styles.proximoMeta}>
                <Ionicons name="location" size={12} /> {proximo.unidade.nome}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.vazioCard}>
            <Ionicons name="calendar-outline" size={32} color={colors.violet} />
            <Text style={styles.vazioText}>Você ainda não tem horários marcados.</Text>
            <Text style={styles.vazioHint}>Use o botão abaixo para agendar.</Text>
          </View>
        )}

        <Link href="/(cliente)/agendar" asChild>
          <Pressable style={styles.botaoCta}>
            <Ionicons name="add" size={22} color="white" />
            <Text style={styles.botaoCtaText}>Marcar novo horário</Text>
          </Pressable>
        </Link>
      </ScrollView>

      {/* Bottom Tabs (manual — Stack mode) */}
      <View style={styles.tabBar}>
        <Pressable style={[styles.tab, { borderTopWidth: 2, borderTopColor: colors.violet }]}>
          <Ionicons name="home" size={22} color={colors.violet} />
          <Text style={[styles.tabLabel, { color: colors.violet }]}>Início</Text>
        </Pressable>
        <Link href="/(cliente)/meus-agendamentos" asChild>
          <Pressable style={styles.tab}>
            <Ionicons name="calendar-outline" size={22} color={colors.textMuted} />
            <Text style={styles.tabLabel}>Meus horários</Text>
          </Pressable>
        </Link>
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  olaText: { fontSize: fontSize.sm, color: colors.textMuted },
  nomeText: { fontSize: fontSize['2xl'], fontWeight: '700', color: colors.text },
  logoutBtn: { padding: spacing.sm },
  secaoTitulo: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.sm },
  proximoCard: {
    backgroundColor: colors.violet,
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginBottom: spacing.xl,
  },
  proximoTitulo: { color: 'white', fontSize: fontSize.lg, fontWeight: '700' },
  proximoData: { color: '#E9D5FF', fontSize: fontSize.sm, marginTop: spacing.xs },
  proximoMeta: { color: '#E9D5FF', fontSize: fontSize.sm, marginTop: spacing.xs },
  vazioCard: {
    backgroundColor: colors.bgWhite,
    padding: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  vazioText: { color: colors.text, fontSize: fontSize.sm, marginTop: spacing.sm, textAlign: 'center' },
  vazioHint: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: spacing.xs },
  botaoCta: {
    backgroundColor: colors.violet,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  botaoCtaText: { color: 'white', fontSize: fontSize.base, fontWeight: '700' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.bgWhite,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md },
  tabLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2, fontWeight: '500' },
})
