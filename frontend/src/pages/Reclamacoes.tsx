import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { reclamacaoService, Reclamacao } from '../services/reclamacaoService'
import { unidadeService } from '../services/unidadeService'
import { useQuery } from '@tanstack/react-query'
import Button from '../components/Button'
import FormField from '../components/FormField'
import { useNotification } from '../contexts/NotificationContext'
import { AlertCircle } from 'lucide-react'

export default function Reclamacoes() {
  const { showNotification } = useNotification()
  const [formData, setFormData] = useState<Reclamacao>({
    mensagem: '',
    unidadeId: undefined,
  })

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades', 'ativas'],
    queryFn: unidadeService.listar,
  })

  const criarMutation = useMutation({
    mutationFn: reclamacaoService.criar,
    onSuccess: () => {
      showNotification('success', 'Reclamação enviada com sucesso! Obrigado pelo seu feedback.')
      setFormData({ mensagem: '', unidadeId: undefined })
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao enviar reclamação'
      showNotification('error', errorMessage)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.mensagem.trim()) {
      showNotification('warning', 'Por favor, digite sua reclamação')
      return
    }
    criarMutation.mutate(formData)
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-red-100 rounded-full">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reclamações Anônimas</h1>
            <p className="text-sm text-gray-500">Sua identidade será mantida em sigilo</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <FormField label="Unidade (opcional)">
            <select
              value={formData.unidadeId || ''}
              onChange={(e) => setFormData({ ...formData, unidadeId: e.target.value ? Number(e.target.value) : undefined })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Selecione uma unidade (opcional)</option>
              {unidades.map((unidade) => (
                <option key={unidade.id} value={unidade.id}>
                  {unidade.nome}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Sua Reclamação" required>
            <textarea
              required
              value={formData.mensagem}
              onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
              rows={8}
              placeholder="Descreva sua reclamação aqui. Seja específico e detalhado para que possamos melhorar nossos serviços."
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <p className="mt-2 text-sm text-gray-500">
              Sua reclamação será enviada de forma anônima. Nenhuma informação pessoal será coletada.
            </p>
          </FormField>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="submit" isLoading={criarMutation.isPending}>
              Enviar Reclamação
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
