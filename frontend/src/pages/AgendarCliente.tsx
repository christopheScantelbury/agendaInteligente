import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { clientePublicoService } from '../services/clientePublicoService'
import { unidadeService, Unidade } from '../services/unidadeService'
import { servicoService, Servico } from '../services/servicoService'

export default function AgendarCliente() {
  const navigate = useNavigate()
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [unidadeId, setUnidadeId] = useState<number | ''>('')
  const [servicoId, setServicoId] = useState<number | ''>('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [horarios, setHorarios] = useState<any[]>([])
  const [horarioSelecionado, setHorarioSelecionado] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  useEffect(() => {
    if (!clientePublicoService.isAuthenticated()) {
      navigate('/cliente/login')
      return
    }

    carregarDados()
  }, [navigate])

  const carregarDados = async () => {
    try {
      const [unidadesData, servicosData] = await Promise.all([
        unidadeService.listar(),
        servicoService.listar(),
      ])
      setUnidades(unidadesData)
      setServicos(servicosData)

      // Definir período padrão (próximos 7 dias)
      const hoje = new Date()
      const proximaSemana = new Date(hoje)
      proximaSemana.setDate(hoje.getDate() + 7)

      setDataInicio(hoje.toISOString().split('T')[0])
      setDataFim(proximaSemana.toISOString().split('T')[0])
    } catch (error) {
      setErro('Erro ao carregar dados')
    }
  }

  const buscarHorarios = async () => {
    if (!unidadeId || !servicoId || !dataInicio || !dataFim) {
      setErro('Preencha todos os campos')
      return
    }

    setLoading(true)
    setErro('')
    setHorarios([])
    setHorarioSelecionado(null)

    try {
      const horariosData = await clientePublicoService.buscarHorariosDisponiveis(
        Number(unidadeId),
        Number(servicoId),
        dataInicio,
        dataFim
      )
      setHorarios(horariosData)
      if (horariosData.length === 0) {
        setErro('Nenhum horário disponível no período selecionado')
      }
    } catch (error: any) {
      setErro(error.response?.data?.message || 'Erro ao buscar horários')
    } finally {
      setLoading(false)
    }
  }

  const agendar = async () => {
    if (!horarioSelecionado) {
      setErro('Selecione um horário')
      return
    }

    setLoading(true)
    setErro('')
    setSucesso('')

    try {
      const cliente = clientePublicoService.getCliente()
      if (!cliente) {
        throw new Error('Cliente não encontrado')
      }

      const servico = servicos.find((s) => s.id === Number(servicoId))
      if (!servico) {
        throw new Error('Serviço não encontrado')
      }

      const agendamento = {
        clienteId: cliente.clienteId,
        unidadeId: horarioSelecionado.unidadeId,
        atendenteId: horarioSelecionado.atendenteId,
        dataHoraInicio: horarioSelecionado.dataHoraInicio,
        servicos: [
          {
            servicoId: Number(servicoId),
            quantidade: 1,
            valor: servico.valor,
          },
        ],
      }

      await clientePublicoService.criarAgendamento(agendamento)
      setSucesso('Agendamento realizado com sucesso!')
      setHorarioSelecionado(null)
      setTimeout(() => {
        navigate('/cliente/meus-agendamentos')
      }, 2000)
    } catch (error: any) {
      setErro(error.response?.data?.message || 'Erro ao realizar agendamento')
    } finally {
      setLoading(false)
    }
  }

  const formatarDataHora = (dataHora: string) => {
    const date = new Date(dataHora)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Agendar Horário</h1>

          {erro && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {erro}
            </div>
          )}

          {sucesso && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {sucesso}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unidade
              </label>
              <select
                value={unidadeId}
                onChange={(e) => setUnidadeId(e.target.value ? Number(e.target.value) : '')}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Selecione uma unidade</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Serviço
              </label>
              <select
                value={servicoId}
                onChange={(e) => setServicoId(e.target.value ? Number(e.target.value) : '')}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Selecione um serviço</option>
                {servicos.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome} - R$ {s.valor.toFixed(2)} ({s.duracaoMinutos} min)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Início
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Fim
              </label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                min={dataInicio || new Date().toISOString().split('T')[0]}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>

          <button
            onClick={buscarHorarios}
            disabled={loading || !unidadeId || !servicoId || !dataInicio || !dataFim}
            className="w-full md:w-auto px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Buscando...' : 'Buscar Horários Disponíveis'}
          </button>

          {horarios.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-4">Horários Disponíveis</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {horarios.map((horario, index) => (
                  <div
                    key={index}
                    onClick={() => setHorarioSelecionado(horario)}
                    className={`p-4 border rounded-md cursor-pointer transition ${
                      horarioSelecionado?.dataHoraInicio === horario.dataHoraInicio
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-300 hover:border-indigo-300'
                    }`}
                  >
                    <div className="font-medium">
                      {formatarDataHora(horario.dataHoraInicio)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {horario.atendenteNome} - {horario.unidadeNome}
                    </div>
                  </div>
                ))}
              </div>

              {horarioSelecionado && (
                <div className="mt-6">
                  <button
                    onClick={agendar}
                    disabled={loading}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Agendando...' : 'Confirmar Agendamento'}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={() => navigate('/cliente/meus-agendamentos')}
              className="text-indigo-600 hover:text-indigo-500"
            >
              Ver meus agendamentos
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

