import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Users,
  Plus,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Clock,
  ExternalLink,
  Mail,
} from 'lucide-react'
import { conviteService } from '../../services/conviteService'
import { useNotification } from '../../contexts/NotificationContext'
import ConfigPageHeader from '../../components/configuracoes/ConfigPageHeader'
import ProximaEtapaCard from '../../components/configuracoes/ProximaEtapaCard'
import IntegerInput from '../../components/forms/IntegerInput'

const HOJE = new Date()
const pad = (n: number) => n.toString().padStart(2, '0')

/** Calcula a data daqui a N dias, em horário local (sem UTC drift). */
function dataEmDias(dias: number): Date {
  const d = new Date(HOJE)
  d.setDate(d.getDate() + dias)
  return d
}

/** Backend `dataExpiracaoLink` é LocalDateTime → "YYYY-MM-DDTHH:mm:ss" (sem TZ).
 * 23:59:59 pra link valer o dia inteiro. */
function emDiasDateTime(dias: number): string {
  const d = dataEmDias(dias)
  d.setHours(23, 59, 59, 0)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** Backend `dataExpiracaoAcesso` é LocalDate → "YYYY-MM-DD". */
function emDiasDate(dias: number): string {
  const d = dataEmDias(dias)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatarData(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

export default function EquipeConfig() {
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const queryClient = useQueryClient()

  const { data: convites = [], isLoading, error } = useQuery({
    queryKey: ['configuracoes', 'convites-acesso'],
    queryFn: () => conviteService.listarConvitesAcesso(),
  })

  const [tokenCopiado, setTokenCopiado] = useState<number | null>(null)
  const [criou, setCriou] = useState(false)
  const [form, setForm] = useState<{
    maxUnidades: number | undefined
    diasExpiracaoLink: number | undefined
    diasExpiracaoAcesso: number | undefined
  }>({
    maxUnidades: 1,
    diasExpiracaoLink: 7,
    diasExpiracaoAcesso: 365,
  })

  const criarMutation = useMutation({
    mutationFn: () =>
      conviteService.criarConviteAcesso({
        maxUnidades: form.maxUnidades ?? 1,
        dataExpiracaoLink: emDiasDateTime(form.diasExpiracaoLink ?? 7),
        dataExpiracaoAcesso: emDiasDate(form.diasExpiracaoAcesso ?? 365),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes', 'convites-acesso'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'gerente', 'checklist'] })
      setCriou(true)
      showNotification('success', 'Convite criado! Compartilhe o link com a pessoa.')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Não foi possível criar o convite.'
      showNotification('error', msg)
    },
  })

  const copiar = async (id: number, link: string) => {
    try {
      await navigator.clipboard.writeText(link)
      setTokenCopiado(id)
      setTimeout(() => setTokenCopiado(null), 2000)
    } catch {
      showNotification('error', 'Não foi possível copiar')
    }
  }

  const ativosNaoUsados = convites.filter((c: any) => !c.usadoEm)
  const usados = convites.filter((c: any) => c.usadoEm)

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <ConfigPageHeader />
      <header>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="h-6 w-6 text-violet-600" />
          Equipe
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Convide atendentes e profissionais para acessarem o sistema. Cada convite gera um
          link único que a pessoa usa para se cadastrar.
        </p>
      </header>

      {/* Form de criação */}
      <section className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-1.5">
          <Plus className="h-4 w-4 text-violet-600" /> Criar convite de acesso
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label htmlFor="maxUnidades" className="block text-xs font-medium text-slate-700 mb-1.5">
              Máx. unidades
            </label>
            <IntegerInput
              id="maxUnidades"
              min={1}
              max={10}
              value={form.maxUnidades}
              onChange={(v) => setForm({ ...form, maxUnidades: v })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>
          <div>
            <label htmlFor="diasLink" className="block text-xs font-medium text-slate-700 mb-1.5">
              Link expira em (dias)
            </label>
            <IntegerInput
              id="diasLink"
              min={1}
              max={30}
              value={form.diasExpiracaoLink}
              onChange={(v) => setForm({ ...form, diasExpiracaoLink: v })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>
          <div>
            <label htmlFor="diasAcesso" className="block text-xs font-medium text-slate-700 mb-1.5">
              Acesso válido (dias)
            </label>
            <IntegerInput
              id="diasAcesso"
              min={30}
              max={3650}
              value={form.diasExpiracaoAcesso}
              onChange={(v) => setForm({ ...form, diasExpiracaoAcesso: v })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => criarMutation.mutate()}
          disabled={criarMutation.isPending}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition shadow-sm"
        >
          {criarMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          <Mail className="h-4 w-4" />
          Gerar link de convite
        </button>
      </section>

      {/* Convites ativos */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-700">
            Convites ativos {ativosNaoUsados.length > 0 && <span className="text-slate-400">· {ativosNaoUsados.length}</span>}
          </h2>
          <button
            type="button"
            onClick={() => navigate('/convites-acesso')}
            className="text-xs font-medium text-violet-700 hover:text-violet-900 inline-flex items-center gap-1"
          >
            Ver todos <ExternalLink className="h-3 w-3" />
          </button>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center gap-2 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-900">Não foi possível carregar os convites.</p>
          </div>
        ) : ativosNaoUsados.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-8 text-center">
            <Mail className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Nenhum convite ativo no momento.</p>
            <p className="text-xs text-slate-400 mt-1">Crie um acima e compartilhe o link.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {ativosNaoUsados.slice(0, 5).map((c: any) => (
              <li
                key={c.id}
                className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-2"
              >
                <code className="flex-1 text-xs text-slate-700 font-mono truncate">{c.link}</code>
                <span className="text-[10px] text-slate-500 whitespace-nowrap flex items-center gap-0.5">
                  <Clock className="h-3 w-3" /> {formatarData(c.dataExpiracaoLink)}
                </span>
                <button
                  type="button"
                  onClick={() => copiar(c.id, c.link)}
                  className="flex-shrink-0 p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition"
                  aria-label="Copiar link"
                  title={tokenCopiado === c.id ? 'Copiado!' : 'Copiar link'}
                >
                  {tokenCopiado === c.id ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </li>
            ))}
            {ativosNaoUsados.length > 5 && (
              <li className="text-center text-xs text-slate-500 py-2">
                + {ativosNaoUsados.length - 5} convites ativos.{' '}
                <button
                  onClick={() => navigate('/convites-acesso')}
                  className="text-violet-700 font-medium hover:underline"
                >
                  Ver todos
                </button>
              </li>
            )}
          </ul>
        )}
      </section>

      {/* Convites já usados */}
      {usados.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 mb-2">
            Já utilizados · {usados.length}
          </h2>
          <ul className="space-y-1.5">
            {usados.slice(0, 3).map((c: any) => (
              <li
                key={c.id}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-2 text-xs"
              >
                <Check className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                <span className="text-slate-500 truncate flex-1">
                  Usado em {formatarData(c.usadoEm)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Dica final */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600">
        💡 A pessoa se cadastra como <strong>profissional da sua empresa</strong> e escolhe
        em quais unidades vai atender. Depois você consegue ajustar comissão e serviços em{' '}
        <button
          onClick={() => navigate('/profissionais')}
          className="text-violet-700 font-medium hover:underline"
        >
          Profissionais
        </button>.
      </div>

      {criou && <ProximaEtapaCard tarefaAtualId="equipe" />}
    </div>
  )
}
