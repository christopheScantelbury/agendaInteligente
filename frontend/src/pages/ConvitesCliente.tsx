import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { conviteService, ConviteClienteResposta, ConviteClienteCriar } from '../services/conviteService'
import { unidadeService } from '../services/unidadeService'
import { perfilService } from '../services/perfilService'
import { podeEditar } from '../utils/permissions'
import { Plus, Copy, Check, Link2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import FormField from '../components/FormField'
import DateTimeInput from '../components/forms/DateTimeInput'
import { useNotification } from '../contexts/NotificationContext'

function pad(n: number) { return String(n).padStart(2, '0') }
function isoDateTime(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function nowMinIso() {
  const d = new Date(); d.setSeconds(0, 0); d.setMinutes(d.getMinutes() + 1); return isoDateTime(d)
}
function defaultExp() {
  const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(23, 59, 0, 0); return isoDateTime(d)
}

export default function ConvitesCliente() {
  const { showNotification } = useNotification()
  const [showModal, setShowModal] = useState(false)
  const queryClient = useQueryClient()
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [form, setForm] = useState<ConviteClienteCriar>({
    unidadeId: 0,
    dataExpiracao: defaultExp(),
  })

  const { data: perfil } = useQuery({
    queryKey: ['perfil', 'meu'],
    queryFn: () => perfilService.buscarMeuPerfil(),
  })
  const podeCriar = podeEditar(perfil, '/convites-cliente')

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadeService.listar,
    enabled: showModal,
  })

  const { data: convites = [], isLoading, error: convitesError } = useQuery({
    queryKey: ['convites-cliente'],
    queryFn: conviteService.listarConvitesCliente,
    enabled: !!podeCriar || true,
    retry: false,
  })

  const criarMutation = useMutation({
    mutationFn: conviteService.criarConviteCliente,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['convites-cliente'] })
      showNotification('success', 'Link criado com sucesso!')
      setShowModal(false)
      setForm((f) => ({ ...f, dataExpiracao: '' }))
    },
    onError: (error: any) => {
      showNotification('error', error.response?.data?.message || 'Erro ao criar link')
    },
  })

  const copiarLink = (item: ConviteClienteResposta) => {
    navigator.clipboard.writeText(item.link)
    setCopiedId(item.id)
    showNotification('success', 'Link copiado!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const formatarData = (s: string) => (s ? new Date(s).toLocaleString('pt-BR') : '-')

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  if (convitesError) {
    const msg = (convitesError as any)?.response?.data?.message ?? 'Erro ao carregar links de cliente'
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <UserPlus className="h-6 w-6 text-violet-600" />
          Links para clientes
        </h1>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <p className="text-amber-800">{msg}</p>
          <p className="text-xs text-amber-700 mt-2">
            Caso seja inesperado, peça ao administrador para revisar permissões em <strong>Perfis</strong>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-violet-600" />
            Links de cadastro de clientes
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Compartilhe esses links para os clientes se cadastrarem na unidade.
          </p>
        </div>
        {podeCriar && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" />
            Novo link
          </Button>
        )}
      </header>

      {convites.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center mb-3">
            <Link2 className="h-5 w-5" />
          </div>
          <p className="text-sm text-slate-600">Nenhum link criado ainda.</p>
          {podeCriar && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:text-violet-900"
            >
              <Plus className="h-4 w-4" />
              Criar primeiro link
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {convites.map((item) => (
            <li
              key={item.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-sm transition"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center flex-shrink-0">
                  <Link2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900 truncate">{item.unidadeNome}</p>
                    {item.usadoEm && (
                      <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                        Usado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Expira em {formatarData(item.dataExpiracao)}
                  </p>
                  <p className="text-xs text-slate-400 truncate mt-1 font-mono">{item.link}</p>
                  {item.usadoEm && (
                    <p className="text-[11px] text-slate-500 mt-1">Usado em {formatarData(item.usadoEm)}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => copiarLink(item)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200 transition flex-shrink-0"
                >
                  {copiedId === item.id ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  Copiar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Novo link para cliente" size="md">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!form.unidadeId || !form.dataExpiracao) {
              showNotification('error', 'Selecione a unidade e a data de expiração.')
              return
            }
            criarMutation.mutate(form)
          }}
          className="space-y-4"
        >
          <FormField label="Unidade" required>
            <select
              value={form.unidadeId || ''}
              onChange={(e) => setForm({ ...form, unidadeId: parseInt(e.target.value, 10) })}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
            >
              <option value="">Selecione</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Link válido até" required>
            <DateTimeInput
              value={form.dataExpiracao}
              onChange={(v) => setForm({ ...form, dataExpiracao: v })}
              min={nowMinIso()}
              required
              className="mt-1"
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={criarMutation.isPending}>
              Gerar link
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
