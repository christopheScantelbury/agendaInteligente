import { useMemo, useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import FormField from '../components/FormField'
import Button from '../components/Button'
import { authService } from '../services/authService'
import { usuarioService, Usuario } from '../services/usuarioService'
import { empresaService, Empresa } from '../services/empresaService'
import { useNotification } from '../contexts/NotificationContext'
import { maskPhone, maskCEP, maskCNPJ, maskEmail } from '../utils/masks'

export default function Configuracoes() {
  const { showNotification } = useNotification()
  const queryClient = useQueryClient()
  const usuarioToken = authService.getUsuario()
  const perfilNorm = (usuarioToken?.perfil ?? '').toUpperCase().replace('-', '_')
  const isAdminUnico = perfilNorm === 'ADMINISTRADOR'

  const [conta, setConta] = useState<Usuario>({
    nome: '',
    email: '',
    telefone: '',
    areaAtuacao: '',
  })
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')

  const [empresaForm, setEmpresaForm] = useState<Empresa>({
    nome: '',
    razaoSocial: '',
    cnpj: '',
    email: '',
    telefone: '',
    endereco: '',
    numero: '',
    bairro: '',
    cep: '',
    cidade: '',
    uf: '',
    ativo: true,
    logo: undefined,
    corApp: '#2563EB',
  })
  const [empresaId, setEmpresaId] = useState<number | undefined>(undefined)
  const [logoPreview, setLogoPreview] = useState<string | undefined>(undefined)

  const { data: usuarioAtual, isLoading: loadingUsuario } = useQuery({
    queryKey: ['usuario', usuarioToken?.usuarioId],
    queryFn: () => usuarioService.buscarPorId(usuarioToken!.usuarioId),
    enabled: !!usuarioToken?.usuarioId && isAdminUnico,
  })

  const { data: empresas = [], isLoading: loadingEmpresas } = useQuery({
    queryKey: ['empresas'],
    queryFn: empresaService.listarTodos,
    enabled: isAdminUnico,
  })

  useEffect(() => {
    if (!usuarioAtual) return
    setConta({
      id: usuarioAtual.id,
      nome: usuarioAtual.nome ?? '',
      email: usuarioAtual.email ?? '',
      telefone: usuarioAtual.telefone ?? '',
      areaAtuacao: usuarioAtual.areaAtuacao ?? '',
    })
  }, [usuarioAtual])

  useEffect(() => {
    if (!empresas.length) return
    const empresa = empresas[0]
    setEmpresaId(empresa.id)
    setEmpresaForm({
      ...empresa,
      ativo: empresa.ativo ?? true,
      corApp: empresa.corApp || '#2563EB',
    })
    setLogoPreview(empresa.logo)
  }, [empresas])

  const salvarContaMutation = useMutation({
    mutationFn: (payload: Usuario) => usuarioService.atualizar(payload.id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuario', usuarioToken?.usuarioId] })
      showNotification('success', 'Dados da conta atualizados com sucesso.')
    },
    onError: (error: any) => {
      showNotification('error', error.response?.data?.message || 'Erro ao atualizar dados da conta.')
    },
  })

  const alterarSenhaMutation = useMutation({
    mutationFn: () => usuarioService.alterarSenha(usuarioToken!.usuarioId, senha),
    onSuccess: () => {
      setSenha('')
      setConfirmarSenha('')
      showNotification('success', 'Senha alterada com sucesso.')
    },
    onError: (error: any) => {
      showNotification('error', error.response?.data?.message || 'Erro ao alterar senha.')
    },
  })

  const salvarEmpresaMutation = useMutation({
    mutationFn: (payload: Empresa) => {
      if (empresaId) return empresaService.atualizar(empresaId, payload)
      return empresaService.criar(payload)
    },
    onSuccess: (empresa) => {
      setEmpresaId(empresa.id)
      queryClient.invalidateQueries({ queryKey: ['empresas'] })
      showNotification('success', 'Dados da empresa salvos com sucesso.')
    },
    onError: (error: any) => {
      showNotification('error', error.response?.data?.message || 'Erro ao salvar dados da empresa.')
    },
  })

  const loading = loadingUsuario || loadingEmpresas

  const podeSalvarConta = useMemo(() => !!conta.id && !!conta.nome && !!conta.email, [conta.id, conta.nome, conta.email])

  const handleSalvarConta = (e: React.FormEvent) => {
    e.preventDefault()
    if (!conta.id || !usuarioAtual) return
    salvarContaMutation.mutate({
      ...usuarioAtual,
      id: conta.id,
      nome: conta.nome,
      email: conta.email,
      telefone: conta.telefone,
      areaAtuacao: conta.areaAtuacao,
    })
  }

  const handleAlterarSenha = (e: React.FormEvent) => {
    e.preventDefault()
    if (!senha || senha.length < 6) {
      showNotification('error', 'A senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (senha !== confirmarSenha) {
      showNotification('error', 'As senhas não coincidem.')
      return
    }
    alterarSenhaMutation.mutate()
  }

  const handleSalvarEmpresa = (e: React.FormEvent) => {
    e.preventDefault()
    if (!empresaForm.nome?.trim()) {
      showNotification('error', 'Nome da empresa é obrigatório.')
      return
    }
    salvarEmpresaMutation.mutate(empresaForm)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setLogoPreview(base64)
      setEmpresaForm((prev) => ({ ...prev, logo: base64 }))
    }
    reader.readAsDataURL(file)
  }

  if (!isAdminUnico) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 font-semibold">Acesso negado</p>
        <p className="text-gray-600 mt-2">Esta tela é exclusiva para perfil ADMINISTRADOR.</p>
      </div>
    )
  }

  if (loading) return <div className="text-center py-8">Carregando...</div>

  return (
    <div className="space-y-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Configurações</h1>

      <section className="bg-white rounded-lg shadow p-6 space-y-6">
        <h2 className="text-xl font-semibold text-gray-900">1. Conta</h2>
        <form className="space-y-4" onSubmit={handleSalvarConta}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Nome" required>
              <input
                type="text"
                required
                value={conta.nome || ''}
                onChange={(e) => setConta((prev) => ({ ...prev, nome: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </FormField>
            <FormField label="Email" required>
              <input
                type="email"
                required
                value={conta.email || ''}
                onChange={(e) => setConta((prev) => ({ ...prev, email: maskEmail(e.target.value) }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </FormField>
            <FormField label="Área de atuação">
              <input
                type="text"
                value={conta.areaAtuacao || ''}
                onChange={(e) => setConta((prev) => ({ ...prev, areaAtuacao: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </FormField>
            <FormField label="Telefone">
              <input
                type="text"
                value={conta.telefone || ''}
                onChange={(e) => setConta((prev) => ({ ...prev, telefone: maskPhone(e.target.value) }))}
                maxLength={15}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </FormField>
          </div>
          <Button type="submit" disabled={!podeSalvarConta || salvarContaMutation.isPending}>
            {salvarContaMutation.isPending ? 'Salvando...' : 'Salvar Dados da Conta'}
          </Button>
        </form>

        <form className="space-y-4 border-t pt-6" onSubmit={handleAlterarSenha}>
          <h3 className="text-lg font-medium text-gray-900">Alterar senha</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Nova senha" required>
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </FormField>
            <FormField label="Confirmar nova senha" required>
              <input
                type="password"
                required
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </FormField>
          </div>
          <Button type="submit" disabled={alterarSenhaMutation.isPending}>
            {alterarSenhaMutation.isPending ? 'Alterando...' : 'Alterar Senha'}
          </Button>
        </form>
      </section>

      <section className="bg-white rounded-lg shadow p-6 space-y-6">
        <h2 className="text-xl font-semibold text-gray-900">2. Empresa</h2>
        <form className="space-y-4" onSubmit={handleSalvarEmpresa}>
          <FormField label="Nome da Empresa" required>
            <input
              type="text"
              required
              value={empresaForm.nome || ''}
              onChange={(e) => setEmpresaForm((prev) => ({ ...prev, nome: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </FormField>

          <FormField label="Razão Social">
            <input
              type="text"
              value={empresaForm.razaoSocial || ''}
              onChange={(e) => setEmpresaForm((prev) => ({ ...prev, razaoSocial: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="CNPJ">
              <input
                type="text"
                value={empresaForm.cnpj || ''}
                onChange={(e) => setEmpresaForm((prev) => ({ ...prev, cnpj: maskCNPJ(e.target.value) }))}
                maxLength={18}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </FormField>
            <FormField label="Telefone">
              <input
                type="text"
                value={empresaForm.telefone || ''}
                onChange={(e) => setEmpresaForm((prev) => ({ ...prev, telefone: maskPhone(e.target.value) }))}
                maxLength={15}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </FormField>
          </div>

          <FormField label="Email">
            <input
              type="email"
              value={empresaForm.email || ''}
              onChange={(e) => setEmpresaForm((prev) => ({ ...prev, email: maskEmail(e.target.value) }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Endereço">
              <input
                type="text"
                value={empresaForm.endereco || ''}
                onChange={(e) => setEmpresaForm((prev) => ({ ...prev, endereco: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </FormField>
            <FormField label="Número">
              <input
                type="text"
                value={empresaForm.numero || ''}
                onChange={(e) => setEmpresaForm((prev) => ({ ...prev, numero: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </FormField>
            <FormField label="Bairro">
              <input
                type="text"
                value={empresaForm.bairro || ''}
                onChange={(e) => setEmpresaForm((prev) => ({ ...prev, bairro: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </FormField>
            <FormField label="CEP">
              <input
                type="text"
                value={empresaForm.cep || ''}
                onChange={(e) => setEmpresaForm((prev) => ({ ...prev, cep: maskCEP(e.target.value) }))}
                maxLength={9}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </FormField>
            <FormField label="Cidade">
              <input
                type="text"
                value={empresaForm.cidade || ''}
                onChange={(e) => setEmpresaForm((prev) => ({ ...prev, cidade: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </FormField>
            <FormField label="UF">
              <input
                type="text"
                value={empresaForm.uf || ''}
                onChange={(e) => setEmpresaForm((prev) => ({ ...prev, uf: e.target.value.toUpperCase().slice(0, 2) }))}
                maxLength={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </FormField>
          </div>

          <FormField label="Logo">
            <div className="space-y-2">
              <input type="file" accept="image/*" onChange={handleImageChange} />
              {logoPreview && (
                <img src={logoPreview} alt="Logo da empresa" className="h-16 w-16 object-contain rounded border border-gray-200" />
              )}
            </div>
          </FormField>

          <FormField label="Cor do App">
            <input
              type="color"
              value={empresaForm.corApp || '#2563EB'}
              onChange={(e) => setEmpresaForm((prev) => ({ ...prev, corApp: e.target.value }))}
              className="h-10 w-24 rounded border border-gray-300 p-1"
            />
          </FormField>

          <Button type="submit" disabled={salvarEmpresaMutation.isPending}>
            {salvarEmpresaMutation.isPending ? 'Salvando...' : 'Salvar Dados da Empresa'}
          </Button>
        </form>
      </section>
    </div>
  )
}
