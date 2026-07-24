import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Eye, Pencil, ClipboardList, FileText } from 'lucide-react'
import { anamneseService } from '../../services/anamneseService'
import { agendamentoService } from '../../services/agendamentoService'
import { useNotification } from '../../contexts/NotificationContext'
import ConfirmDialog from '../../components/ConfirmDialog'
import Button from '../../components/Button'
import { useIsWebLayout } from '../../hooks/useIsWebLayout'

export default function AnamneseListPage() {
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const isWeb = useIsWebLayout()
  const queryClient = useQueryClient()

  const [searchTerm, setSearchTerm] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null,
  })

  const { data: anamneses = [], isLoading } = useQuery({
    queryKey: ['anamneses'],
    queryFn: () => anamneseService.listar({}),
  })

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos'],
    queryFn: agendamentoService.listar,
  })

  const deleteMutation = useMutation({
    mutationFn: anamneseService.excluir,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anamneses'] })
      showNotification('success', 'Ficha excluída com sucesso!')
      setConfirmDelete({ isOpen: false, id: null })
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Erro ao excluir ficha'
      showNotification('error', msg)
    },
  })

  const filtered = anamneses.filter((a) => {
    if (!searchTerm) return true
    return a.clienteNome?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const atendimentoPorCliente = useMemo(() => {
    const map = new Map<
      string,
      {
        primeiroAtendimento?: string
        ultimoAtendimento?: string
      }
    >()

    agendamentos
      .filter((agendamento) => agendamento.status === 'CONCLUIDO')
      .forEach((agendamento) => {
        const dataHora = agendamento.dataHoraInicio
        if (!dataHora) return

        const chaveId = agendamento.clienteId ? `id:${agendamento.clienteId}` : null
        const chaveNome = agendamento.cliente?.nome
          ? `nome:${agendamento.cliente.nome.toLowerCase().trim()}`
          : null
        const chaves = [chaveId, chaveNome].filter(Boolean) as string[]

        chaves.forEach((chave) => {
          const existente = map.get(chave)
          const dataAtual = new Date(dataHora)
          if (Number.isNaN(dataAtual.getTime())) return

          if (!existente) {
            map.set(chave, {
              primeiroAtendimento: dataHora,
              ultimoAtendimento: dataHora,
            })
            return
          }

          const primeiroAtual = existente.primeiroAtendimento ? new Date(existente.primeiroAtendimento) : null
          const ultimoAtual = existente.ultimoAtendimento ? new Date(existente.ultimoAtendimento) : null

          if (!primeiroAtual || dataAtual < primeiroAtual) {
            existente.primeiroAtendimento = dataHora
          }
          if (!ultimoAtual || dataAtual > ultimoAtual) {
            existente.ultimoAtendimento = dataHora
          }
        })
      })

    return map
  }, [agendamentos])

  const formatarData = (data?: string | null) => {
    if (!data) return '—'
    return new Date(data).toLocaleDateString('pt-BR')
  }

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  const pageClassName = `${isWeb ? 'max-w-[1920px] w-full p-6 xl:p-8' : 'max-w-3xl p-4 sm:p-6'} mx-auto space-y-6`

  return (
    <div className={pageClassName}>
      {isWeb ? (
        <>
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-6 w-6 text-violet-600" />
                Anamneses
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Fichas clínicas dos seus clientes.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="secondary" onClick={() => navigate('/anamneses/templates')}>
                <ClipboardList className="h-4 w-4" />
                Templates
              </Button>
              <Button onClick={() => navigate('/anamneses/nova')}>
                <Plus className="h-4 w-4" />
                Nova Ficha
              </Button>
            </div>
          </header>

          <div className="flex justify-start">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome de cliente..."
              className="block w-full sm:w-96 rounded-xl border border-slate-200 px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center mb-3">
                  <FileText className="h-5 w-5" />
                </div>
                <p className="text-sm text-slate-600">
                  {searchTerm ? 'Nenhuma ficha encontrada com os filtros aplicados.' : 'Nenhuma ficha cadastrada ainda.'}
                </p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full table-fixed border-collapse">
                  <colgroup>
                    <col className="w-[30%]" />
                    <col className="w-[20%]" />
                    <col className="w-[22%]" />
                    <col className="w-[20%]" />
                    <col className="w-[8%]" />
                  </colgroup>
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th scope="col" className="px-4 py-3 text-left">Nome</th>
                      <th scope="col" className="px-4 py-3 text-left">Primeiro agendamento</th>
                      <th scope="col" className="px-4 py-3 text-left">Nome ficha</th>
                      <th scope="col" className="px-4 py-3 text-left">Último agendamento</th>
                      <th scope="col" className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((a) => {
                      const chaveId = a.clienteId ? `id:${a.clienteId}` : null
                      const chaveNome = a.clienteNome ? `nome:${a.clienteNome.toLowerCase().trim()}` : null
                      const resumoCliente =
                        (chaveId ? atendimentoPorCliente.get(chaveId) : undefined) ??
                        (chaveNome ? atendimentoPorCliente.get(chaveNome) : undefined)

                      return (
                        <tr
                          key={a.id}
                          className="hover:bg-slate-50 transition align-middle"
                        >
                          <td className="px-4 py-4">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {a.clienteNome || 'Sem cliente'}
                            </p>
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-700 whitespace-nowrap">
                            {formatarData(resumoCliente?.primeiroAtendimento ?? a.primeiroAtendimento)}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-700 truncate">
                            {a.templateNome || 'Anamnese'}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-700 whitespace-nowrap">
                            {formatarData(resumoCliente?.ultimoAtendimento ?? a.ultimoAtendimento)}
                          </td>

                          <td className="px-4 py-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => navigate(`/anamneses/${a.id}`)}
                                className="p-2 rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-700 transition"
                                aria-label="Ver ficha"
                                title="Visualizar"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => navigate(`/anamneses/${a.id}?editar=1`)}
                                className="p-2 rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-700 transition"
                                aria-label="Editar ficha"
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setConfirmDelete({ isOpen: true, id: a.id })}
                                className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
                                aria-label="Excluir ficha"
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {filtered.length > 0 && (
              <p className="text-xs text-slate-500 text-center">
                Mostrando {filtered.length} de {anamneses.length} ficha{anamneses.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-6 w-6 text-violet-600" />
                Anamneses
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Fichas clínicas dos seus clientes.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="secondary" onClick={() => navigate('/anamneses/templates')}>
                <ClipboardList className="h-4 w-4" />
                Templates
              </Button>
              <Button onClick={() => navigate('/anamneses/nova')}>
                <Plus className="h-4 w-4" />
                Nova Ficha
              </Button>
            </div>
          </header>

          {/* Busca */}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome de cliente..."
            className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />

          {/* Lista como cards */}
          {filtered.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center mb-3">
                <FileText className="h-5 w-5" />
              </div>
              <p className="text-sm text-slate-600">
                {searchTerm ? 'Nenhuma ficha encontrada com os filtros aplicados.' : 'Nenhuma ficha cadastrada ainda.'}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {filtered.map((a) => {
                const inicial = (a.clienteNome || '?').charAt(0).toUpperCase()
                return (
                  <li
                    key={a.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-sm transition"
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar cliente */}
                      <div className="h-10 w-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {inicial}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{a.clienteNome}</p>
                        {a.servicoNome && (
                          <p className="text-xs text-slate-500 truncate mt-0.5">{a.servicoNome}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap">
                          {a.templateNome && <span>{a.templateNome}</span>}
                          {a.templateNome && a.data && <span>·</span>}
                          {a.data && (
                            <span>{new Date(a.data + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                          )}
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => navigate(`/anamneses/${a.id}`)}
                          className="p-2 rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-700 transition"
                          aria-label="Ver ficha"
                          title="Visualizar"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/anamneses/${a.id}?editar=1`)}
                          className="p-2 rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-700 transition"
                          aria-label="Editar ficha"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ isOpen: true, id: a.id })}
                          className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
                          aria-label="Excluir ficha"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {filtered.length > 0 && (
            <p className="text-xs text-slate-500 text-center">
              Mostrando {filtered.length} de {anamneses.length} ficha{anamneses.length !== 1 ? 's' : ''}
            </p>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir esta ficha? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (confirmDelete.id) deleteMutation.mutate(confirmDelete.id)
        }}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null })}
      />
    </div>
  )
}
