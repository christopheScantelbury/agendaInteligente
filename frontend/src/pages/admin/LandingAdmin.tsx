import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { LayoutDashboard, ArrowLeft, Save, Loader2, Plus, Trash2, ExternalLink } from 'lucide-react'
import { landingConfigService, LandingContent } from '../../services/landingConfigService'
import { authService } from '../../services/authService'
import { useNotification } from '../../contexts/NotificationContext'
import { getApiErrorMessage } from '../../utils/apiError'

/**
 * Editor da Landing Page. Apenas ADMIN GLOBAL.
 * Editor estruturado por seção (não JSON puro) pra reduzir risco de schema quebrado.
 */
export default function LandingAdmin() {
  const navigate = useNavigate()
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
      showNotification('success', 'Landing atualizada — vai aparecer na próxima visita à home')
    },
    onError: (e) => showNotification('error', getApiErrorMessage(e, 'Erro ao salvar landing')),
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
          <h1 className="text-2xl font-bold text-slate-900">Landing Page</h1>
          <p className="text-sm text-slate-500">Edite hero, stats, destaques e comparativo da home.</p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-violet-600 hover:text-violet-700 font-medium"
        >
          Ver landing <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </header>

      {/* HERO */}
      <Section titulo="Hero (acima da dobra)">
        <Input label="Título — linha 1" value={form.hero?.tituloLinha1 ?? ''} onChange={(v) => setForm({ ...form, hero: { ...form.hero, tituloLinha1: v } })} />
        <Input label="Título — linha 2 (cor violet)" value={form.hero?.tituloLinha2 ?? ''} onChange={(v) => setForm({ ...form, hero: { ...form.hero, tituloLinha2: v } })} />
        <TextArea label="Subtítulo" value={form.hero?.subtitulo ?? ''} onChange={(v) => setForm({ ...form, hero: { ...form.hero, subtitulo: v } })} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="CTA primário (texto)" value={form.hero?.ctaPrimario ?? ''} onChange={(v) => setForm({ ...form, hero: { ...form.hero, ctaPrimario: v } })} />
          <Input label="CTA primário (link)" value={form.hero?.ctaPrimarioLink ?? ''} onChange={(v) => setForm({ ...form, hero: { ...form.hero, ctaPrimarioLink: v } })} />
          <Input label="CTA secundário (texto)" value={form.hero?.ctaSecundario ?? ''} onChange={(v) => setForm({ ...form, hero: { ...form.hero, ctaSecundario: v } })} />
          <Input label="CTA secundário (link)" value={form.hero?.ctaSecundarioLink ?? ''} onChange={(v) => setForm({ ...form, hero: { ...form.hero, ctaSecundarioLink: v } })} />
        </div>
      </Section>

      {/* STATS */}
      <Section titulo="Stats Strip (4 métricas)">
        <ArrayEditor
          items={form.stats ?? []}
          onChange={(stats) => setForm({ ...form, stats })}
          template={() => ({ valor: '', label: '' })}
          renderItem={(item, update) => (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
              <Input label="Valor" value={item.valor} onChange={(v) => update({ ...item, valor: v })} />
              <Input label="Label" value={item.label} onChange={(v) => update({ ...item, label: v })} />
            </div>
          )}
        />
      </Section>

      {/* DESTAQUES */}
      <Section titulo="Destaques (cards de feature)">
        <ArrayEditor
          items={form.destaques ?? []}
          onChange={(destaques) => setForm({ ...form, destaques })}
          template={() => ({ icone: 'Calendar', titulo: '', descricao: '' })}
          renderItem={(item, update) => (
            <div className="flex-1 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input label="Ícone (lucide)" value={item.icone} onChange={(v) => update({ ...item, icone: v })} />
                <div className="sm:col-span-2">
                  <Input label="Título" value={item.titulo} onChange={(v) => update({ ...item, titulo: v })} />
                </div>
              </div>
              <TextArea label="Descrição" value={item.descricao} onChange={(v) => update({ ...item, descricao: v })} />
            </div>
          )}
        />
      </Section>

      {/* COMPARATIVO */}
      <Section titulo="Comparativo competitivo">
        <Input label="Título" value={form.comparativo?.titulo ?? ''} onChange={(v) => setForm({ ...form, comparativo: { ...form.comparativo, titulo: v } })} />
        <Input label="Subtítulo" value={form.comparativo?.subtitulo ?? ''} onChange={(v) => setForm({ ...form, comparativo: { ...form.comparativo, subtitulo: v } })} />
        <p className="text-xs text-slate-500 mt-3">Linhas da tabela (concorrentes + nós). 5 colunas: Agendamento / Multi-unidade / NF-e / Lembretes / Preço.</p>
        <ArrayEditor
          items={form.comparativo?.concorrentes ?? []}
          onChange={(concorrentes) => setForm({ ...form, comparativo: { ...form.comparativo, concorrentes } })}
          template={() => ({ nome: '', destaque: false, cols: ['', '', '', '', ''], tipos: ['neutral', 'neutral', 'neutral', 'neutral', 'neutral'] as Array<'has' | 'no' | 'partial' | 'neutral'> })}
          renderItem={(item, update) => (
            <div className="flex-1 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                <div className="sm:col-span-3">
                  <Input label="Nome" value={item.nome} onChange={(v) => update({ ...item, nome: v })} />
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-700 pb-2">
                  <input type="checkbox" checked={item.destaque ?? false} onChange={(e) => update({ ...item, destaque: e.target.checked })} className="rounded border-slate-300 text-violet-600" />
                  Destaque (nossa linha)
                </label>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {item.cols.map((col, ci) => (
                  <div key={ci}>
                    <div className="text-[10px] text-slate-400 mb-1 truncate">
                      {['Agend', 'Multi', 'NF-e', 'Lembr', 'Preço'][ci]}
                    </div>
                    <input
                      type="text"
                      value={col}
                      onChange={(e) => {
                        const newCols = [...item.cols]
                        newCols[ci] = e.target.value
                        update({ ...item, cols: newCols })
                      }}
                      className="block w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:border-violet-400"
                    />
                    <select
                      value={item.tipos[ci]}
                      onChange={(e) => {
                        const newTipos = [...item.tipos]
                        newTipos[ci] = e.target.value as 'has' | 'no' | 'partial' | 'neutral'
                        update({ ...item, tipos: newTipos })
                      }}
                      className="block w-full mt-1 rounded-lg border border-slate-200 bg-white px-1 py-1 text-[10px] focus:outline-none focus:border-violet-400"
                    >
                      <option value="has">✓ has</option>
                      <option value="partial">⚠ partial</option>
                      <option value="no">✕ no</option>
                      <option value="neutral">neutral</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        />
      </Section>

      {/* FOOTER CTA */}
      <Section titulo="Footer CTA (chamada final)">
        <Input label="Título" value={form.footerCta?.titulo ?? ''} onChange={(v) => setForm({ ...form, footerCta: { ...form.footerCta, titulo: v } })} />
        <Input label="Subtítulo" value={form.footerCta?.subtitulo ?? ''} onChange={(v) => setForm({ ...form, footerCta: { ...form.footerCta, subtitulo: v } })} />
        <Input label="Texto do botão" value={form.footerCta?.cta ?? ''} onChange={(v) => setForm({ ...form, footerCta: { ...form.footerCta, cta: v } })} />
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
// Helpers locais

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-3">
      <h2 className="text-base font-bold text-slate-900">{titulo}</h2>
      {children}
    </section>
  )
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
      />
    </div>
  )
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <textarea
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
      />
    </div>
  )
}

function ArrayEditor<T>({
  items,
  onChange,
  template,
  renderItem,
}: {
  items: T[]
  onChange: (items: T[]) => void
  template: () => T
  renderItem: (item: T, update: (next: T) => void) => React.ReactNode
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
            title="Remover"
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
        Adicionar item
      </button>
    </div>
  )
}
