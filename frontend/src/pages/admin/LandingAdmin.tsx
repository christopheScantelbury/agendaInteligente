import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LayoutDashboard, ArrowLeft, Save, Loader2, Plus, Trash2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { landingConfigService, LandingContent } from '../../services/landingConfigService'
import { authService } from '../../services/authService'
import { useNotification } from '../../contexts/NotificationContext'
import { getApiErrorMessage } from '../../utils/apiError'

/**
 * Editor da Landing Page. Apenas ADMIN GLOBAL.
 * Labels em PT-BR claro, com exemplos e ajuda contextual por seção.
 */
export default function LandingAdmin() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const usuario = authService.getUsuario()
  const perfil = (usuario?.perfil ?? '').toUpperCase()
  const isAdminGlobal = perfil === 'ADMIN'

  useEffect(() => {
    if (!isAdminGlobal) navigate('/')
  }, [isAdminGlobal, navigate])

  const { data, isLoading } = useQuery({
    queryKey: ['landing-config'],
    queryFn: landingConfigService.get,
    enabled: isAdminGlobal,
  })

  const [form, setForm] = useState<LandingContent | null>(null)

  useEffect(() => {
    if (data && !form) setForm(data)
  }, [data, form])

  const saveMutation = useMutation({
    mutationFn: () => landingConfigService.atualizar(form!),
    onSuccess: (saved) => {
      setForm(saved)
      // Invalida em todas as abas/queries — landing pega atualizado no próximo focus
      queryClient.invalidateQueries({ queryKey: ['landing-config'] })
      showNotification('success', 'Site atualizado — vai aparecer na home em até 30s ou no próximo carregamento')
    },
    onError: (e) => showNotification('error', getApiErrorMessage(e, 'Erro ao salvar')),
  })

  if (!isAdminGlobal) return null
  if (isLoading || !form) {
    return (
      <div className="text-center py-16 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
      </div>
    )
  }

  const dirty = JSON.stringify(form) !== JSON.stringify(data)

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
      <header className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-100 text-slate-600" aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="h-12 w-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0">
          <LayoutDashboard className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">Página inicial do site</h1>
          <p className="text-sm text-slate-500">Edite os textos, números e tabelas que aparecem para quem visita www.agendainteligente.com.br</p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-violet-600 hover:text-violet-700 font-medium"
        >
          Ver site <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </header>

      <div className="bg-violet-50 border border-violet-200 rounded-2xl p-3 text-xs text-violet-900">
        💡 <strong>Dica:</strong> as mudanças levam até 30 segundos pra aparecer no site público após salvar. Clique em <em>"Ver site"</em> no canto superior pra abrir em nova aba e validar.
      </div>

      {/* TOPO DA PÁGINA */}
      <Section
        titulo="Topo da página"
        descricao="Primeira coisa que o visitante vê. Título grande em duas linhas, texto explicativo e dois botões."
      >
        <Field label="Título — primeira linha (preto)">
          <Input value={form.hero?.tituloLinha1 ?? ''} onChange={(v) => setForm({ ...form, hero: { ...form.hero, tituloLinha1: v } })} placeholder="Ex: O único agendamento" />
        </Field>
        <Field label="Título — segunda linha (em destaque colorido)">
          <Input value={form.hero?.tituloLinha2 ?? ''} onChange={(v) => setForm({ ...form, hero: { ...form.hero, tituloLinha2: v } })} placeholder="Ex: que emite a NFS-e" />
        </Field>
        <Field label="Texto explicativo abaixo do título">
          <TextArea value={form.hero?.subtitulo ?? ''} onChange={(v) => setForm({ ...form, hero: { ...form.hero, subtitulo: v } })} placeholder="Ex: Plataforma completa de agendamento, financeiro e nota fiscal — tudo em um lugar." />
        </Field>
        <div className="border-t border-slate-100 pt-4 mt-4">
          <p className="text-xs font-semibold text-slate-600 mb-3">Botão principal (cor violeta, mais chamativo)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Texto que aparece no botão">
              <Input value={form.hero?.ctaPrimario ?? ''} onChange={(v) => setForm({ ...form, hero: { ...form.hero, ctaPrimario: v } })} placeholder="Ex: Começar grátis" />
            </Field>
            <Field label="Pra onde o botão leva (link)">
              <Input value={form.hero?.ctaPrimarioLink ?? ''} onChange={(v) => setForm({ ...form, hero: { ...form.hero, ctaPrimarioLink: v } })} placeholder="Ex: /cadastro" />
            </Field>
          </div>
        </div>
        <div className="border-t border-slate-100 pt-4 mt-4">
          <p className="text-xs font-semibold text-slate-600 mb-3">Botão secundário (cor branca, ao lado do principal)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Texto que aparece no botão">
              <Input value={form.hero?.ctaSecundario ?? ''} onChange={(v) => setForm({ ...form, hero: { ...form.hero, ctaSecundario: v } })} placeholder="Ex: Ver demonstração" />
            </Field>
            <Field label="Pra onde o botão leva (link)">
              <Input value={form.hero?.ctaSecundarioLink ?? ''} onChange={(v) => setForm({ ...form, hero: { ...form.hero, ctaSecundarioLink: v } })} placeholder="Ex: /login" />
            </Field>
          </div>
        </div>
      </Section>

      {/* FAIXA DE NÚMEROS */}
      <Section
        titulo="Faixa de números (estatísticas)"
        descricao="A faixa preta com 4 números chamativos. Recomendado: 4 estatísticas curtas que reforçam a credibilidade."
      >
        <ArrayEditor
          items={form.stats ?? []}
          onChange={(stats) => setForm({ ...form, stats })}
          template={() => ({ valor: '', label: '' })}
          itemName="número"
          renderItem={(item, update) => (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
              <Field label="Número (em destaque)">
                <Input value={item.valor} onChange={(v) => update({ ...item, valor: v })} placeholder="Ex: 5k+" />
              </Field>
              <Field label="Descrição do número">
                <Input value={item.label} onChange={(v) => update({ ...item, label: v })} placeholder="Ex: agendamentos/dia" />
              </Field>
            </div>
          )}
        />
      </Section>

      {/* DESTAQUES */}
      <Section
        titulo="Destaques principais"
        descricao="Cards coloridos mostrando os 3 maiores diferenciais do produto. Cada card tem um ícone, título e descrição curta."
      >
        <ArrayEditor
          items={form.destaques ?? []}
          onChange={(destaques) => setForm({ ...form, destaques })}
          template={() => ({ icone: 'Calendar', titulo: '', descricao: '' })}
          itemName="destaque"
          renderItem={(item, update) => (
            <div className="flex-1 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Field label="Ícone">
                  <IconePicker valor={item.icone} onChange={(v) => update({ ...item, icone: v })} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Título do destaque">
                    <Input value={item.titulo} onChange={(v) => update({ ...item, titulo: v })} placeholder="Ex: Agendamento online" />
                  </Field>
                </div>
              </div>
              <Field label="Descrição (1-2 frases curtas)">
                <TextArea value={item.descricao} onChange={(v) => update({ ...item, descricao: v })} placeholder="Ex: Link público pra cliente marcar direto..." />
              </Field>
            </div>
          )}
        />
      </Section>

      {/* COMPARATIVO */}
      <Section
        titulo="Comparativo com concorrentes"
        descricao="Tabela mostrando como o Agenda Inteligente se compara aos concorrentes do mercado. Marque ✓ no que tem, ✕ no que não tem, ⚠ se parcial."
      >
        <Field label="Título acima da tabela">
          <Input value={form.comparativo?.titulo ?? ''} onChange={(v) => setForm({ ...form, comparativo: { ...form.comparativo, titulo: v } })} placeholder="Ex: Por que escolher o Agenda Inteligente" />
        </Field>
        <Field label="Texto explicativo abaixo do título">
          <Input value={form.comparativo?.subtitulo ?? ''} onChange={(v) => setForm({ ...form, comparativo: { ...form.comparativo, subtitulo: v } })} placeholder="Ex: Comparativo direto com soluções do mercado" />
        </Field>
        <div className="border-t border-slate-100 pt-4 mt-4">
          <p className="text-xs font-semibold text-slate-600 mb-1">Linhas da tabela (1 por concorrente)</p>
          <p className="text-xs text-slate-500 mb-3">Cada linha tem 5 colunas: <strong>Agendamento online</strong>, <strong>Múltiplas unidades</strong>, <strong>NF-e nativa</strong>, <strong>Lembretes</strong>, <strong>Preço</strong>. Marque o tipo (verde/amarelo/cinza/neutro) pra dar cor automática.</p>
          <ArrayEditor
            items={form.comparativo?.concorrentes ?? []}
            onChange={(concorrentes) => setForm({ ...form, comparativo: { ...form.comparativo, concorrentes } })}
            template={() => ({ nome: '', destaque: false, cols: ['', '', '', '', ''], tipos: ['neutral', 'neutral', 'neutral', 'neutral', 'neutral'] as Array<'has' | 'no' | 'partial' | 'neutral'> })}
            itemName="concorrente"
            renderItem={(item, update) => (
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                  <div className="sm:col-span-3">
                    <Field label="Nome do concorrente (use ★ no início se for nossa linha)">
                      <Input value={item.nome} onChange={(v) => update({ ...item, nome: v })} placeholder="Ex: Trinks   |   ★ AgendaInteligente" />
                    </Field>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-700 pb-2">
                    <input type="checkbox" checked={item.destaque ?? false} onChange={(e) => update({ ...item, destaque: e.target.checked })} className="rounded border-slate-300 text-violet-600" />
                    Esta é nossa linha (destaque violet)
                  </label>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-2">Para cada uma das 5 colunas: texto + cor</p>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    {(['Agendamento', 'Múltiplas unidades', 'NF-e nativa', 'Lembretes', 'Preço'] as const).map((nomeCol, ci) => (
                      <div key={ci} className="bg-white p-2 rounded-lg border border-slate-200">
                        <p className="text-[10px] text-slate-500 font-semibold mb-1">{nomeCol}</p>
                        <input
                          type="text"
                          value={item.cols[ci]}
                          onChange={(e) => {
                            const newCols = [...item.cols]
                            newCols[ci] = e.target.value
                            update({ ...item, cols: newCols })
                          }}
                          placeholder="✓ / ⚠ / ✕"
                          className="block w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:border-violet-400"
                        />
                        <select
                          value={item.tipos[ci]}
                          onChange={(e) => {
                            const newTipos = [...item.tipos]
                            newTipos[ci] = e.target.value as 'has' | 'no' | 'partial' | 'neutral'
                            update({ ...item, tipos: newTipos })
                          }}
                          className="block w-full mt-1 rounded border border-slate-200 bg-white px-1 py-1 text-[10px] focus:outline-none focus:border-violet-400"
                        >
                          <option value="has">✓ Tem (verde)</option>
                          <option value="partial">⚠ Parcial (amarelo)</option>
                          <option value="no">✕ Não tem (cinza)</option>
                          <option value="neutral">— Neutro (sem cor)</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          />
        </div>
      </Section>

      {/* CHAMADA FINAL */}
      <Section
        titulo="Chamada final (rodapé)"
        descricao="Último apelo pro visitante se cadastrar antes do rodapé. Aparece em fundo preto."
      >
        <Field label="Pergunta/título principal">
          <Input value={form.footerCta?.titulo ?? ''} onChange={(v) => setForm({ ...form, footerCta: { ...form.footerCta, titulo: v } })} placeholder="Ex: Pronto para emitir sua primeira NFS-e?" />
        </Field>
        <Field label="Texto explicativo">
          <Input value={form.footerCta?.subtitulo ?? ''} onChange={(v) => setForm({ ...form, footerCta: { ...form.footerCta, subtitulo: v } })} placeholder="Ex: 14 dias grátis. Sem cartão. Configuração em 5 minutos." />
        </Field>
        <Field label="Texto do botão">
          <Input value={form.footerCta?.cta ?? ''} onChange={(v) => setForm({ ...form, footerCta: { ...form.footerCta, cta: v } })} placeholder="Ex: Cadastrar agora" />
        </Field>
      </Section>

      <div className="sticky bottom-3 sm:bottom-4 z-10 flex justify-end">
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={!dirty || saveMutation.isPending}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-violet-300"
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar alterações
        </button>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Componentes locais

function Section({ titulo, descricao, children }: {
  titulo: string
  descricao?: string
  children: React.ReactNode
}) {
  const [aberta, setAberta] = useState(true)
  return (
    <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setAberta((a) => !a)}
        className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-slate-50 transition"
      >
        <div>
          <h2 className="text-base font-bold text-slate-900">{titulo}</h2>
          {descricao && <p className="text-xs text-slate-500 mt-0.5">{descricao}</p>}
        </div>
        {aberta ? <ChevronUp className="h-5 w-5 text-slate-400 flex-shrink-0" /> : <ChevronDown className="h-5 w-5 text-slate-400 flex-shrink-0" />}
      </button>
      {aberta && (
        <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-3 border-t border-slate-100">
          {children}
        </div>
      )}
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
    />
  )
}

function TextArea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      rows={2}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
    />
  )
}

const ICONES_SUGERIDOS = [
  'Calendar', 'Receipt', 'DollarSign', 'Users', 'BarChart2', 'Bell',
  'CheckCircle', 'Shield', 'Star', 'Zap', 'Clock', 'TrendingUp',
  'Smartphone', 'CreditCard', 'Award', 'Sparkles',
]

function IconePicker({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  return (
    <select
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
    >
      {ICONES_SUGERIDOS.map((i) => (
        <option key={i} value={i}>{i}</option>
      ))}
      {!ICONES_SUGERIDOS.includes(valor) && <option value={valor}>{valor} (personalizado)</option>}
    </select>
  )
}

function ArrayEditor<T>({
  items,
  onChange,
  template,
  renderItem,
  itemName,
}: {
  items: T[]
  onChange: (items: T[]) => void
  template: () => T
  renderItem: (item: T, update: (next: T) => void) => React.ReactNode
  itemName: string
}) {
  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-start gap-2 p-3 rounded-xl border border-slate-100 bg-slate-50">
          {renderItem(item, (next) => {
            const arr = [...items]
            arr[idx] = next
            onChange(arr)
          })}
          <button
            type="button"
            onClick={() => onChange(items.filter((_, i) => i !== idx))}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0"
            title={`Remover ${itemName}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, template()])}
        className="w-full py-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 text-sm hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 transition flex items-center justify-center gap-1"
      >
        <Plus className="h-4 w-4" />
        Adicionar {itemName}
      </button>
    </div>
  )
}
