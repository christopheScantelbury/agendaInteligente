import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { clienteService, Cliente } from '../../../services/clienteService'
import { authService } from '../../../services/authService'
import { useNotification } from '../../../contexts/NotificationContext'

export default function ClienteUnificarContatos() {
  const usuario = authService.getUsuario()
  const unidadeId = usuario?.unidadeId
  const { showNotification } = useNotification()

  const [principalMap, setPrincipalMap] = useState<Record<number, number>>({})

  const { data: grupos = [], isLoading } = useQuery({
    queryKey: ['clientes-duplicatas', unidadeId],
    queryFn: () => clienteService.buscarDuplicatas(unidadeId!),
    enabled: !!unidadeId,
  })

  function handleSelectPrincipal(grupoIdx: number, clienteId: number) {
    setPrincipalMap((prev) => ({ ...prev, [grupoIdx]: clienteId }))
  }

  function handleUnificar(_grupoIdx: number) {
    showNotification('info', 'Funcionalidade em breve')
  }

  if (isLoading) {
    return <div className="text-center py-8 text-slate-400">Carregando...</div>
  }

  if (grupos.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <div className="text-4xl mb-3">✓</div>
        <p className="text-lg font-medium text-slate-600">Nenhuma duplicata encontrada</p>
        <p className="text-sm mt-1">Todos os clientes parecem únicos.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-slate-500 text-sm">
        {grupos.length} grupo{grupos.length !== 1 ? 's' : ''} de possíveis duplicatas encontrado{grupos.length !== 1 ? 's' : ''}.
        Selecione o cliente principal em cada grupo e clique em Unificar.
      </p>

      {grupos.map((grupo, idx) => (
        <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Similaridade por {grupo.motivoSimilaridade === 'nome' ? 'nome' : 'telefone'}
            </span>
            <button
              onClick={() => handleUnificar(idx)}
              className="px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white text-xs rounded-lg transition-colors"
            >
              Unificar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {grupo.clientes.map((cliente: Cliente) => {
              const isPrincipal = principalMap[idx] === cliente.id
              return (
                <div
                  key={cliente.id}
                  onClick={() => handleSelectPrincipal(idx, cliente.id!)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isPrincipal
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5 flex-1">
                      <div className="text-slate-900 font-medium text-sm">{cliente.nome}</div>
                      {cliente.telefone && (
                        <div className="text-slate-500 text-xs">Tel: {cliente.telefone}</div>
                      )}
                      {cliente.email && (
                        <div className="text-slate-500 text-xs">{cliente.email}</div>
                      )}
                      {cliente.cpfCnpj && (
                        <div className="text-slate-500 text-xs">CPF/CNPJ: {cliente.cpfCnpj}</div>
                      )}
                    </div>
                    <div className={`ml-2 w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                      isPrincipal ? 'border-violet-600 bg-violet-600' : 'border-slate-300'
                    }`} />
                  </div>
                  {isPrincipal && (
                    <div className="mt-2 text-violet-700 text-xs font-medium">Principal</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
