import { useEffect, useState, useMemo } from 'react'
import {
  View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import {
  clienteAuthService,
  UnidadePublica,
  ServicoPublico,
  HorarioDisponivel,
} from '../../src/services/clienteAuthService'
import { colors, fontSize, radii, spacing } from '../../src/theme'

type Passo = 1 | 2 | 3

function formatMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDataHora(iso: string) {
  const d = new Date(iso)
  return {
    data: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', weekday: 'short' }),
    hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  }
}

function diasFuturos(qtd: number): { inicio: string; fim: string } {
  const hoje = new Date()
  const fim = new Date(hoje)
  fim.setDate(hoje.getDate() + qtd)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { inicio: iso(hoje), fim: iso(fim) }
}

export default function Agendar() {
  const router = useRouter()
  const [passo, setPasso] = useState<Passo>(1)

  // Dados das listas
  const [unidades, setUnidades] = useState<UnidadePublica[]>([])
  const [servicos, setServicos] = useState<ServicoPublico[]>([])
  const [horarios, setHorarios] = useState<HorarioDisponivel[]>([])

  // Seleções
  const [unidadeSel, setUnidadeSel] = useState<UnidadePublica | null>(null)
  const [servicoSel, setServicoSel] = useState<ServicoPublico | null>(null)
  const [horarioSel, setHorarioSel] = useState<HorarioDisponivel | null>(null)
  const [observacoes, setObservacoes] = useState('')

  const [loading, setLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Carrega unidades ao montar
  useEffect(() => {
    let mounted = true
    setLoading(true)
    clienteAuthService.listarUnidades()
      .then((u) => mounted && setUnidades(u))
      .catch(() => mounted && Alert.alert('Erro', 'Não foi possível carregar as unidades. Tente novamente.'))
      .finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [])

  // Quando seleciona unidade, carrega serviços
  useEffect(() => {
    if (!unidadeSel) { setServicos([]); return }
    setLoading(true)
    clienteAuthService.listarServicos(unidadeSel.id)
      .then(setServicos)
      .catch(() => Alert.alert('Erro', 'Não foi possível carregar os serviços.'))
      .finally(() => setLoading(false))
  }, [unidadeSel])

  // Quando seleciona serviço + unidade, carrega horários (próximos 7 dias)
  useEffect(() => {
    if (!unidadeSel || !servicoSel) { setHorarios([]); return }
    setLoading(true)
    const { inicio, fim } = diasFuturos(7)
    clienteAuthService.buscarHorariosDisponiveis(unidadeSel.id, servicoSel.id, inicio, fim)
      .then((h) => setHorarios(h.filter((x) => x.disponivel)))
      .catch(() => Alert.alert('Erro', 'Não foi possível carregar os horários.'))
      .finally(() => setLoading(false))
  }, [unidadeSel, servicoSel])

  // Horários agrupados por dia
  const horariosPorDia = useMemo(() => {
    const grupos = new Map<string, HorarioDisponivel[]>()
    horarios.forEach((h) => {
      const dia = h.dataHora.slice(0, 10)
      if (!grupos.has(dia)) grupos.set(dia, [])
      grupos.get(dia)!.push(h)
    })
    return Array.from(grupos.entries())
  }, [horarios])

  async function confirmar() {
    if (!unidadeSel || !servicoSel || !horarioSel) return
    setSalvando(true)
    try {
      const cliente = await clienteAuthService.getCliente()
      if (!cliente) throw new Error('Sessão inválida')
      const dataInicio = horarioSel.dataHora
      const fim = new Date(new Date(dataInicio).getTime() + servicoSel.duracaoMinutos * 60 * 1000)
      await clienteAuthService.criarAgendamento({
        clienteId: cliente.clienteId,
        unidadeId: unidadeSel.id,
        atendenteId: horarioSel.atendenteId,
        dataHoraInicio: dataInicio,
        dataHoraFim: fim.toISOString(),
        observacoes: observacoes || undefined,
        servicos: [{ servicoId: servicoSel.id, quantidade: 1 }],
      })
      Alert.alert('Sucesso', 'Agendamento criado!', [
        { text: 'OK', onPress: () => router.replace('/(cliente)/meus-agendamentos') },
      ])
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Erro ao criar agendamento'
      Alert.alert('Erro', msg)
    } finally {
      setSalvando(false)
    }
  }

  const podeAvancar = (passo === 1 && !!servicoSel) || (passo === 2 && !!horarioSel)

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => passo === 1 ? router.back() : setPasso((passo - 1) as Passo)}
          style={styles.voltar}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.tituloHeader}>Novo agendamento</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Indicador de passos */}
      <View style={styles.passos}>
        {[1, 2, 3].map((n) => (
          <View key={n} style={styles.passoItem}>
            <View style={[
              styles.passoCirculo,
              passo === n && styles.passoAtivo,
              passo > n && styles.passoCompleto,
            ]}>
              {passo > n
                ? <Ionicons name="checkmark" size={14} color="#fff" />
                : <Text style={[styles.passoNum, passo === n && { color: '#fff' }]}>{n}</Text>}
            </View>
            <Text style={[styles.passoLabel, passo === n && styles.passoLabelAtivo]}>
              {n === 1 ? 'Serviço' : n === 2 ? 'Horário' : 'Confirmar'}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}>
        {loading && (
          <ActivityIndicator color={colors.violet} style={{ marginVertical: spacing.xl }} />
        )}

        {/* PASSO 1 — Selecionar unidade + serviço */}
        {passo === 1 && (
          <>
            <Text style={styles.secaoTitulo}>Escolha a unidade</Text>
            {unidades.map((u) => (
              <Pressable key={u.id}
                style={[styles.card, unidadeSel?.id === u.id && styles.cardSel]}
                onPress={() => { setUnidadeSel(u); setServicoSel(null); setHorarioSel(null) }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardNome}>{u.nome}</Text>
                  {u.empresaNome && <Text style={styles.cardSub}>{u.empresaNome}</Text>}
                  {(u.bairro || u.cidade) && (
                    <Text style={styles.cardSub}>
                      {[u.bairro, u.cidade, u.uf].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </View>
                {unidadeSel?.id === u.id && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.violet} />
                )}
              </Pressable>
            ))}

            {unidadeSel && (
              <>
                <Text style={[styles.secaoTitulo, { marginTop: spacing.xl }]}>Escolha o serviço</Text>
                {servicos.length === 0 && !loading && (
                  <Text style={styles.vazio}>Nenhum serviço cadastrado nesta unidade.</Text>
                )}
                {servicos.map((s) => (
                  <Pressable key={s.id}
                    style={[styles.card, servicoSel?.id === s.id && styles.cardSel]}
                    onPress={() => setServicoSel(s)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardNome}>{s.nome}</Text>
                      {s.descricao && <Text style={styles.cardSub} numberOfLines={2}>{s.descricao}</Text>}
                      <Text style={styles.cardSub}>
                        {formatMoeda(Number(s.valor))} · {s.duracaoMinutos}min
                      </Text>
                    </View>
                    {servicoSel?.id === s.id && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.violet} />
                    )}
                  </Pressable>
                ))}
              </>
            )}
          </>
        )}

        {/* PASSO 2 — Escolher horário */}
        {passo === 2 && unidadeSel && servicoSel && (
          <>
            <Text style={styles.secaoTitulo}>Horários disponíveis (próximos 7 dias)</Text>
            {horariosPorDia.length === 0 && !loading && (
              <Text style={styles.vazio}>Nenhum horário disponível nos próximos 7 dias.</Text>
            )}
            {horariosPorDia.map(([dia, slots]) => {
              const cabec = formatDataHora(slots[0].dataHora).data
              return (
                <View key={dia} style={{ marginBottom: spacing.lg }}>
                  <Text style={styles.diaTitulo}>{cabec}</Text>
                  <View style={styles.horariosGrid}>
                    {slots.map((h, i) => {
                      const hora = formatDataHora(h.dataHora).hora
                      const ativo = horarioSel?.dataHora === h.dataHora && horarioSel?.atendenteId === h.atendenteId
                      return (
                        <Pressable key={`${dia}-${i}`}
                          style={[styles.horarioBtn, ativo && styles.horarioBtnAtivo]}
                          onPress={() => setHorarioSel(h)}>
                          <Text style={[styles.horarioTxt, ativo && { color: '#fff' }]}>{hora}</Text>
                          {h.atendenteNome && (
                            <Text style={[styles.horarioSub, ativo && { color: '#fff' }]} numberOfLines={1}>
                              {h.atendenteNome}
                            </Text>
                          )}
                        </Pressable>
                      )
                    })}
                  </View>
                </View>
              )
            })}
          </>
        )}

        {/* PASSO 3 — Confirmar */}
        {passo === 3 && unidadeSel && servicoSel && horarioSel && (
          <>
            <Text style={styles.secaoTitulo}>Confirme seu agendamento</Text>
            <View style={styles.resumo}>
              <ResumoLinha icon="business-outline" label="Unidade" valor={unidadeSel.nome} />
              <ResumoLinha icon="cut-outline" label="Serviço" valor={servicoSel.nome} />
              <ResumoLinha icon="calendar-outline" label="Data"
                valor={`${formatDataHora(horarioSel.dataHora).data} · ${formatDataHora(horarioSel.dataHora).hora}`} />
              {horarioSel.atendenteNome && (
                <ResumoLinha icon="person-outline" label="Profissional" valor={horarioSel.atendenteNome} />
              )}
              <ResumoLinha icon="time-outline" label="Duração" valor={`${servicoSel.duracaoMinutos} min`} />
              <ResumoLinha icon="cash-outline" label="Valor" valor={formatMoeda(Number(servicoSel.valor))} destaque />
            </View>
          </>
        )}
      </ScrollView>

      {/* Footer com botão de ação */}
      <View style={styles.footer}>
        {passo < 3 ? (
          <Pressable
            style={[styles.btnPrimario, !podeAvancar && styles.btnDisabled]}
            disabled={!podeAvancar}
            onPress={() => setPasso((passo + 1) as Passo)}>
            <Text style={styles.btnPrimarioTxt}>Continuar</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.btnPrimario, salvando && styles.btnDisabled]}
            disabled={salvando}
            onPress={confirmar}>
            <Text style={styles.btnPrimarioTxt}>
              {salvando ? 'Agendando...' : 'Confirmar agendamento'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

function ResumoLinha({ icon, label, valor, destaque }: {
  icon: any; label: string; valor: string; destaque?: boolean
}) {
  return (
    <View style={styles.resumoLinha}>
      <Ionicons name={icon} size={18} color={colors.textSecondary} />
      <Text style={styles.resumoLabel}>{label}</Text>
      <Text style={[styles.resumoValor, destaque && styles.resumoValorDestaque]}>{valor}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.lg, paddingTop: spacing.xl + 8, backgroundColor: colors.bgWhite,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  voltar: { padding: spacing.xs },
  tituloHeader: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },

  passos: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.md,
    backgroundColor: colors.bgWhite, borderBottomWidth: 1, borderBottomColor: colors.border },
  passoItem: { alignItems: 'center', gap: 4 },
  passoCirculo: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  passoAtivo: { backgroundColor: colors.violet },
  passoCompleto: { backgroundColor: colors.success ?? '#10B981' },
  passoNum: { color: colors.textSecondary, fontWeight: '700', fontSize: 12 },
  passoLabel: { fontSize: 11, color: colors.textSecondary },
  passoLabelAtivo: { color: colors.violet, fontWeight: '600' },

  secaoTitulo: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgWhite,
    borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 2, borderColor: 'transparent',
  },
  cardSel: { borderColor: colors.violet, backgroundColor: '#F5F3FF' },
  cardNome: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  cardSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  vazio: { textAlign: 'center', color: colors.textSecondary, padding: spacing.lg, fontSize: 13 },

  diaTitulo: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: spacing.sm,
    textTransform: 'capitalize' },
  horariosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  horarioBtn: {
    backgroundColor: colors.bgWhite, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border,
    minWidth: 80, alignItems: 'center',
  },
  horarioBtnAtivo: { backgroundColor: colors.violet, borderColor: colors.violet },
  horarioTxt: { fontSize: 13, fontWeight: '600', color: colors.text },
  horarioSub: { fontSize: 10, color: colors.textSecondary, marginTop: 2, maxWidth: 80 },

  resumo: { backgroundColor: colors.bgWhite, borderRadius: radii.md, padding: spacing.lg },
  resumoLinha: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border },
  resumoLabel: { fontSize: 13, color: colors.textSecondary, flex: 0, width: 90 },
  resumoValor: { fontSize: 13, color: colors.text, fontWeight: '500', flex: 1 },
  resumoValorDestaque: { fontSize: fontSize.base, color: colors.violet, fontWeight: '700' },

  footer: { padding: spacing.lg, backgroundColor: colors.bgWhite, borderTopWidth: 1,
    borderTopColor: colors.border },
  btnPrimario: { backgroundColor: colors.violet, padding: spacing.md, borderRadius: radii.md,
    alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnPrimarioTxt: { color: '#fff', fontWeight: '700', fontSize: fontSize.sm },
})
