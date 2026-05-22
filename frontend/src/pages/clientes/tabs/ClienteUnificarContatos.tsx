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

  function handleUnificar(grupoIdx: number) {
    showNotification('info', 'Funcionalidade em breve')
  }

  if (isLoading) {
    return <div className="text-center py-8 text-gray-400">Carregando...</div>
  }

  if (grupos.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-4xl mb-3">✓</div>
        <p className="text-lg font-medium text-gray-300">Nenhuma duplicata encontrada</p>
        <p className="text-sm mt-1">Todos os clientes parecem únicos.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm">
        {grupos.length} grupo{grupos.length !== 1 ? 's' : ''} de possíveis duplicatas encontrado{grupos.length !== 1 ? 's' : ''}.
        Selecione o cliente principal em cada grupo e clique em Unificar.
      </p>

      {grupos.map((grupo, idx) => (
        <div key={idx} className="bg-gray-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Similaridade por {grupo.motivoSimilaridade === 'nome' ? 'nome' : 'telefone'}
            </span>
            <button
              onClick={() => handleUnificar(idx)}
              className="px-3 py-1 bg-purple-700 hover:bg-purple-600 text-white text-xs rounded-md transition-colors"
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
                  className={`p-3 rounded-md border cursor-pointer transition-all ${
                    isPrincipal
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-gray-700 hover:border-gray-500 bg-gray-900/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5 flex-1">
                      <div className="text-white font-medium text-sm">{cliente.nome}</div>
                      {cliente.telefone && (
                        <div className="text-gray-400 text-xs">Tel: {cliente.telefone}</div>
                      )}
                      {cliente.email && (
                        <div className="text-gray-400 text-xs">{cliente.email}</div>
                      )}
                      {cliente.cpfCnpj && (
                        <div className="text-gray-400 text-xs">CPF/CNPJ: {cliente.cpfCnpj}</div>
                      )}
                    </div>
                    <div className={`ml-2 w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                      isPrincipal ? 'border-blue-400 bg-blue-400' : 'border-gray-500'
                    }`} />
                  </div>
                  {isPrincipal && (
                    <div className="mt-2 text-blue-400 text-xs font-medium">Principal</div>
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
