import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, ArrowLeft, GripVertical } from 'lucide-react'
import { anamneseService, AnamneseTemplate, PerguntaTemplate } from '../../services/anamneseService'
import { authService } from '../../services/authService'
import Modal from '../../components/Modal'
import Button from '../../components/Button'
import FormField from '../../components/FormField'
import ConfirmDialog from '../../components/ConfirmDialog'
import { useNotification } from '../../contexts/NotificationContext'
import { getApiErrorMessage } from '../../utils/apiError'

const slugify = (text: string) =>
  text.toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

export default function AnamneseTemplatesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const usuario = authService.getUsuario()
  const perfil = (usuario?.perfil ?? '').toUpperCase()
  const podeEditar = perfil === 'ADMIN' || perfil === 'ADMINISTRADOR' || perfil === 'GERENTE'

  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<AnamneseTemplate | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: number | null }>({ open: false, id: null })

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['anamnese-templates'],
    queryFn: anamneseService.listarTemplates,
    enabled: podeEditar,
  })

  if (!podeEditar) {
    setTimeout(() => navigate('/'), 0)
    return <div className="p-8 text-center text-sm text-gray-500">Acesso negado.</div>
  }

  const inativarMutation = useMutation({
    mutationFn: (id: number) => anamneseService.inativarTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anamnese-templates'] })
      showNotification('success', 'Template inativado')
      setConfirmDelete({ open: false, id: null })
    },
    onError: (e) => showNotification('error', getApiErrorMessage(e, 'Erro ao inativar')),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/anamneses')} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Templates de Anamnese</h1>
            <p className="text-sm text-gray-500">Modelos de questionário usados ao cadastrar uma anamnese</p>
          </div>
        </div>
        <Button onClick={() => { setEditando(null); setShowForm(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Novo template
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Nome</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Descrição</th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase">Perguntas</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">Carregando...</td></tr>
            ) : templates.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">Nenhum template cadastrado</td></tr>
            ) : templates.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{t.nome}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{t.descricao ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-center">{t.perguntas?.length ?? 0}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => { setEditando(t); setShowForm(true) }}
                      className="text-blue-600 hover:text-blue-800 p-1" title="Editar">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button onClick={() => setConfirmDelete({ open: true, id: t.id })}
                      className="text-red-600 hover:text-red-800 p-1" title="Inativar">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)}
        title={editando ? 'Editar template' : 'Novo template'}>
        <TemplateForm
          template={editando}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['anamnese-templates'] })
            setShowForm(false)
            showNotification('success', editando ? 'Template atualizado' : 'Template criado')
          }}
        />
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete.open}
        title="Inativar template"
        message="Confirma a inativação? O template não aparecerá mais na criação de anamneses."
        confirmText="Inativar"
        variant="danger"
        onConfirm={() => confirmDelete.id && inativarMutation.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete({ open: false, id: null })}
      />
    </div>
  )
}

function TemplateForm({
  template,
  onClose,
  onSuccess,
}: {
  template: AnamneseTemplate | null
  onClose: () => void
  onSuccess: () => void
}) {
  const { showNotification } = useNotification()
  const [nome, setNome] = useState(template?.nome ?? '')
  const [descricao, setDescricao] = useState(template?.descricao ?? '')
  const [perguntas, setPerguntas] = useState<PerguntaTemplate[]>(template?.perguntas ?? [])

  useEffect(() => {
    setNome(template?.nome ?? '')
    setDescricao(template?.descricao ?? '')
    setPerguntas(template?.perguntas ?? [])
  }, [template?.id])

  const saveMutation = useMutation({
    mutationFn: (data: AnamneseTemplate) =>
      template?.id
        ? anamneseService.atualizarTemplate(template.id, data)
        : anamneseService.criarTemplate(data),
    onSuccess,
    onError: (e) => showNotification('error', getApiErrorMessage(e, 'Erro ao salvar template')),
  })

  const adicionarPergunta = () => {
    setPerguntas([...perguntas, {
      id: `pergunta_${Date.now()}`,
      label: '',
      tipo: 'sim_nao',
      comObservacao: true,
    }])
  }

  const removerPergunta = (idx: number) => {
    setPerguntas(perguntas.filter((_, i) => i !== idx))
  }

  const atualizarPergunta = (idx: number, patch: Partial<PerguntaTemplate>) => {
    setPerguntas(perguntas.map((p, i) => {
      if (i !== idx) return p
      const novo = { ...p, ...patch }
      // Regenera id se label mudou e id ainda é auto-gerado
      if (patch.label !== undefined && p.id.startsWith('pergunta_')) {
        novo.id = slugify(patch.label) || p.id
      }
      // Se tipo mudou para algo que não é sim_nao, limpa comObservacao para evitar inconsistência no payload
      if (patch.tipo && patch.tipo !== 'sim_nao') {
        novo.comObservacao = undefined
      }
      return novo
    }))
  }

  const moverPergunta = (idx: number, dir: -1 | 1) => {
    const novo = [...perguntas]
    const target = idx + dir
    if (target < 0 || target >= novo.length) return
    ;[novo[idx], novo[target]] = [novo[target], novo[idx]]
    setPerguntas(novo)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return showNotification('error', 'Nome é obrigatório')
    if (perguntas.length === 0) return showNotification('error', 'Adicione pelo menos uma pergunta')
    const indicesVazias = perguntas.map((p, i) => !p.label.trim() ? i + 1 : null).filter(Boolean)
    if (indicesVazias.length > 0) {
      return showNotification('error', `Preencha o texto da${indicesVazias.length > 1 ? 's' : ''} pergunta${indicesVazias.length > 1 ? 's' : ''} ${indicesVazias.join(', ')}`)
    }

    saveMutation.mutate({
      id: template?.id ?? 0,
      nome: nome.trim(),
      descricao: descricao.trim() || undefined,
      ativo: true,
      perguntas,
    } as AnamneseTemplate)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <FormField label="Nome do template" required>
        <input required type="text" value={nome} onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: Anamnese facial completa"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500" />
      </FormField>

      <FormField label="Descrição">
        <textarea rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)}
          placeholder="Para que serve este modelo de questionário"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500" />
      </FormField>

      <div className="border rounded-lg p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">
            Perguntas do questionário
            {perguntas.length > 0 && <span className="ml-2 text-xs text-gray-500">({perguntas.length})</span>}
          </h3>
          <Button type="button" variant="secondary" onClick={adicionarPergunta}>
            <Plus className="h-3 w-3 mr-1" /> Adicionar pergunta
          </Button>
        </div>

        {perguntas.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            Nenhuma pergunta. Clique em <strong>Adicionar pergunta</strong> para começar.
          </p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {perguntas.map((p, idx) => (
              <div key={idx} className="bg-white border rounded p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex flex-col gap-0.5 mt-1">
                    <button type="button" onClick={() => moverPergunta(idx, -1)} disabled={idx === 0}
                      className="text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Subir">▲</button>
                    <GripVertical className="h-3 w-3 text-gray-300" />
                    <button type="button" onClick={() => moverPergunta(idx, 1)} disabled={idx === perguntas.length - 1}
                      className="text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Descer">▼</button>
                  </div>
                  <div className="flex-1 space-y-2">
                    <input type="text" value={p.label}
                      onChange={(e) => atualizarPergunta(idx, { label: e.target.value })}
                      placeholder={`Pergunta ${idx + 1} (ex: Usa rímel?)`}
                      className={`block w-full text-sm rounded-md shadow-sm focus:border-violet-500 focus:ring-violet-500 ${
                        !p.label.trim() ? 'border-red-300' : 'border-gray-300'
                      }`} />
                    {!p.label.trim() && (
                      <p className="text-xs text-red-600">Texto da pergunta é obrigatório</p>
                    )}
                    <div className="flex flex-wrap gap-3 items-center text-xs">
                      <label className="flex items-center gap-1">
                        Tipo:
                        <select value={p.tipo}
                          onChange={(e) => atualizarPergunta(idx, { tipo: e.target.value as PerguntaTemplate['tipo'] })}
                          className="rounded border-gray-300 text-xs focus:border-violet-500 focus:ring-violet-500">
                          <option value="sim_nao">Sim/Não</option>
                          <option value="texto">Texto livre</option>
                          <option value="numero">Número</option>
                        </select>
                      </label>
                      {p.tipo === 'sim_nao' && (
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="checkbox" checked={!!p.comObservacao}
                            onChange={(e) => atualizarPergunta(idx, { comObservacao: e.target.checked })}
                            className="rounded border-gray-300 text-violet-600" />
                          Com campo de observação
                        </label>
                      )}
                    </div>
                  </div>
                  <button type="button" onClick={() => removerPergunta(idx)}
                    className="text-red-500 hover:text-red-700 p-1" title="Remover">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" isLoading={saveMutation.isPending}>Salvar</Button>
      </div>
    </form>
  )
}
