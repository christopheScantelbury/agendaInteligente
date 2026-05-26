import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  MapPin,
  Scissors,
  Search,
  Sparkles,
} from 'lucide-react'
import { clientePublicoService, HorarioDisponivel } from '../services/clientePublicoService'
import { Events, track } from '../lib/analytics'
import { unidadeService, Unidade } from '../services/unidadeService'
import { servicoService, Servico } from '../services/servicoService'
import { inteligenciaService, HorarioPopular } from '../services/inteligenciaService'
import { useNotification } from '../contexts/NotificationContext'
import DateSlotPicker from '../components/DateSlotPicker'

type Step = 1 | 2 | 3
type FormaPagamento = 'PIX' | 'CARTAO' | 'NO_LOCAL'

type Slot = HorarioDisponivel

const STEP_TITLES: Record<Step, { title: string; subtitle: string }> = {
  1: { title: 'Qual serviço você quer?', subtitle: 'Escolha o serviço para continuar' },
  2: { title: 'Quando você prefere?', subtitle: 'Selecione data e horário disponíveis' },
  3: { title: 'Quase lá!', subtitle: 'Confirme os detalhes do seu agendamento' },
}

const FORMAS_PAGAMENTO: { id: FormaPagamento; label: string; desc: string }[] = [
  { id: 'NO_LOCAL', label: 'Pagar no local', desc: 'Dinheiro, cartão ou Pix com o profissional' },
  { id: 'PIX', label: 'Pix', desc: 'Combinar com o estabelecimento' },
  { id: 'CARTAO', label: 'Cartão', desc: 'Combinar com o estabelecimento' },
]

export default function AgendarCliente() {
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const [searchParams] = useSearchParams()
  const modoGuest = searchParams.get('guest') === '1' && !clientePublicoService.isAuthenticated()

  // Dados do visitante (modo guest)
  const [guestNome, setGuestNome] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestTelefone, setGuestTelefone] = useState('')
  const [guestCpf, setGuestCpf] = useState('')

  const [step, setStep] = useState<Step>(1)
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [selectedUnidade, setSelectedUnidade] = useState<Unidade | null>(null)
  const [selectedServico, setSelectedServico] = useState<Servico | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([])
  const [horariosPopulares, setHorariosPopulares] = useState<HorarioPopular[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [busca, setBusca] = useState('')
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('NO_LOCAL')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!clientePublicoService.isAuthenticated() && !modoGuest) {
      navigate('/cliente/login')
      return
    }
    track(Events.CLIENTE_AGENDAMENTO_INICIADO, { guest: modoGuest })
    void carregarDados()
  }, [navigate, modoGuest])

  useEffect(() => {
    if (step === 2 && selectedUnidade && selectedServico) {
      void buscarHorarios(selectedDate)
      if (horariosPopulares.length === 0) {
        inteligenciaService
          .horariosPopulares(selectedUnidade.id!)
          .then(setHorariosPopulares)
          .catch(() => {})
      }
    }
  }, [step, selectedDate, selectedUnidade?.id, selectedServico?.id])

  async function carregarDados() {
    try {
      const [unidadesData, servicosData] = await Promise.all([
        unidadeService.listar(),
        servicoService.listar(),
      ])
      setUnidades(unidadesData)
      setServicos(servicosData)
      if (unidadesData.length === 1) {
        setSelectedUnidade(unidadesData[0])
      }
    } catch {
      showNotification('error', 'Erro ao carregar dados')
    }
  }

  async function buscarHorarios(date: Date) {
    if (!selectedUnidade || !selectedServico) return
    setLoadingSlots(true)
    setAvailableSlots([])
    setSelectedSlot(null)
    try {
      const dateStr = date.toISOString().split('T')[0]
      const horariosData = await clientePublicoService.buscarHorariosDisponiveis(
        selectedUnidade.id!,
        selectedServico.id!,
        dateStr,
        dateStr
      )
      setAvailableSlots(horariosData)
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingSlots(false)
    }
  }

  async function verificarDisponibilidadeESubmeter() {
    if (!selectedSlot || !selectedUnidade || !selectedServico) return

    // Validação extra do form guest
    if (modoGuest) {
      if (!guestNome.trim() || !guestEmail.trim() || !guestTelefone.trim()) {
        showNotification('error', 'Preencha nome, email e telefone para continuar.')
        return
      }
    }

    setSubmitting(true)
    try {
      // Re-checa disponibilidade antes de submeter (evita race condition)
      const dateStr = selectedSlot.dataHoraInicio.split('T')[0]
      const horariosAtuais = await clientePublicoService.buscarHorariosDisponiveis(
        selectedUnidade.id!,
        selectedServico.id!,
        dateStr,
        dateStr
      )
      const aindaDisponivel = horariosAtuais.some(
        (s) =>
          s.dataHoraInicio === selectedSlot.dataHoraInicio &&
          s.atendenteId === selectedSlot.atendenteId
      )
      if (!aindaDisponivel) {
        showNotification('error', 'Esse horário foi ocupado enquanto você decidia. Escolha outro.')
        setAvailableSlots(horariosAtuais)
        setSelectedSlot(null)
        setStep(2)
        return
      }

      const servicos = [
        {
          servicoId: selectedServico.id!,
          quantidade: 1,
          valor: selectedServico.valor,
        },
      ]

      if (modoGuest) {
        await clientePublicoService.agendarComoVisitante({
          nome: guestNome.trim(),
          email: guestEmail.trim(),
          telefone: guestTelefone.replace(/\D/g, ''),
          cpfCnpj: guestCpf.replace(/\D/g, '') || undefined,
          unidadeId: selectedUnidade.id!,
          atendenteId: selectedSlot.atendenteId,
          dataHoraInicio: selectedSlot.dataHoraInicio,
          formaPagamentoPreferida: formaPagamento,
          servicos,
        })
      } else {
        const cliente = clientePublicoService.getCliente()
        if (!cliente) throw new Error('Cliente não encontrado')
        await clientePublicoService.criarAgendamento({
          clienteId: cliente.clienteId,
          unidadeId: selectedUnidade.id!,
          atendenteId: selectedSlot.atendenteId,
          dataHoraInicio: selectedSlot.dataHoraInicio,
          formaPagamentoPreferida: formaPagamento,
          servicos,
        })
      }

      track(Events.CLIENTE_AGENDAMENTO_CONCLUIDO, {
        servicoId: selectedServico.id,
        unidadeId: selectedUnidade.id,
        formaPagamento,
        valor: selectedServico.valor,
        guest: modoGuest,
      })
      showNotification('success', 'Agendamento realizado com sucesso!')
      setTimeout(() => navigate('/cliente'), 800)
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Erro ao realizar agendamento'
      showNotification('error', errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const servicosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    let lista = servicos
    if (selectedUnidade && unidades.length > 1) {
      lista = lista.filter((s) => !s.unidadeId || s.unidadeId === selectedUnidade.id)
    }
    if (termo) {
      lista = lista.filter(
        (s) =>
          s.nome.toLowerCase().includes(termo) ||
          (s.descricao?.toLowerCase().includes(termo) ?? false)
      )
    }
    return lista
  }, [servicos, selectedUnidade, unidades.length, busca])

  function handleBack() {
    if (step === 1) {
      navigate('/cliente')
      return
    }
    setStep((step - 1) as Step)
  }

  function handleServicoSelect(servico: Servico) {
    setSelectedServico(servico)
    track(Events.CLIENTE_AGENDAMENTO_PASSO2, { servicoId: servico.id })
    setStep(2)
  }

  function handleSlotSelect(slot: Slot) {
    setSelectedSlot(slot)
    track(Events.CLIENTE_AGENDAMENTO_PASSO3, { dataHoraInicio: slot.dataHoraInicio })
    setStep(3)
  }

  return (
    <div className="px-4 py-4 max-w-md mx-auto">
      <ProgressHeader step={step} onBack={handleBack} />

      <header className="mt-3 mb-5">
        <h1 className="text-xl font-bold text-slate-900">{STEP_TITLES[step].title}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{STEP_TITLES[step].subtitle}</p>
      </header>

      {step === 1 && (
        <Step1Servico
          unidades={unidades}
          selectedUnidade={selectedUnidade}
          onUnidadeChange={setSelectedUnidade}
          busca={busca}
          onBuscaChange={setBusca}
          servicos={servicosFiltrados}
          onServicoSelect={handleServicoSelect}
        />
      )}

      {step === 2 && selectedUnidade && selectedServico && (
        <Step2Horario
          unidade={selectedUnidade}
          servico={selectedServico}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          slots={availableSlots}
          loading={loadingSlots}
          selectedSlot={selectedSlot}
          horariosPopulares={horariosPopulares}
          onSlotSelect={handleSlotSelect}
        />
      )}

      {step === 3 && selectedUnidade && selectedServico && selectedSlot && (
        <Step3Confirmar
          unidade={selectedUnidade}
          servico={selectedServico}
          slot={selectedSlot}
          formaPagamento={formaPagamento}
          onFormaPagamentoChange={setFormaPagamento}
          submitting={submitting}
          onConfirm={verificarDisponibilidadeESubmeter}
          onAlterarHorario={() => setStep(2)}
          modoGuest={modoGuest}
          guestNome={guestNome}
          setGuestNome={setGuestNome}
          guestEmail={guestEmail}
          setGuestEmail={setGuestEmail}
          guestTelefone={guestTelefone}
          setGuestTelefone={setGuestTelefone}
          guestCpf={guestCpf}
          setGuestCpf={setGuestCpf}
        />
      )}
    </div>
  )
}

function ProgressHeader({ step, onBack }: { step: Step; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        aria-label="Voltar"
        className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div className="flex-1 flex gap-1.5" aria-label={`Passo ${step} de 3`}>
        {([1, 2, 3] as Step[]).map((s) => (
          <div
            key={s}
            className={`flex-1 h-1.5 rounded-full transition-colors ${
              s <= step ? 'bg-violet-600' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-gray-500 font-medium tabular-nums">{step}/3</span>
    </div>
  )
}

function Step1Servico({
  unidades,
  selectedUnidade,
  onUnidadeChange,
  busca,
  onBuscaChange,
  servicos,
  onServicoSelect,
}: {
  unidades: Unidade[]
  selectedUnidade: Unidade | null
  onUnidadeChange: (u: Unidade) => void
  busca: string
  onBuscaChange: (s: string) => void
  servicos: Servico[]
  onServicoSelect: (s: Servico) => void
}) {
  return (
    <div className="space-y-3">
      {unidades.length > 1 && (
        <div>
          <label htmlFor="unidade" className="block text-xs font-medium text-gray-700 mb-1.5">
            Unidade
          </label>
          <select
            id="unidade"
            value={selectedUnidade?.id ?? ''}
            onChange={(e) => {
              const u = unidades.find((x) => x.id === Number(e.target.value))
              if (u) onUnidadeChange(u)
            }}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm focus:border-violet-400 focus:ring-2 focus:ring-violet-100 focus:outline-none"
          >
            <option value="" disabled>
              Selecione...
            </option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="search"
          placeholder="Buscar serviço"
          value={busca}
          onChange={(e) => onBuscaChange(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 py-3 text-sm focus:border-violet-400 focus:ring-2 focus:ring-violet-100 focus:outline-none"
        />
      </div>

      {servicos.length === 0 ? (
        <div className="text-center py-10 text-sm text-gray-500">
          {selectedUnidade ? 'Nenhum serviço encontrado.' : 'Selecione uma unidade primeiro.'}
        </div>
      ) : (
        <ul className="space-y-2">
          {servicos.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onServicoSelect(s)}
                className="
                  w-full flex items-center gap-3 p-3
                  bg-white border border-gray-200 rounded-xl
                  hover:border-violet-300 hover:shadow-sm transition
                  text-left
                "
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-100 to-violet-50 flex items-center justify-center flex-shrink-0">
                  <Scissors className="h-5 w-5 text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{s.nome}</p>
                  {s.descricao && (
                    <p className="text-xs text-gray-500 line-clamp-1">{s.descricao}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    <span className="text-gray-600 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {s.duracaoMinutos} min
                    </span>
                    <span className="font-semibold text-green-700">
                      R$ {s.valor.toFixed(2)}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Step2Horario({
  unidade,
  servico,
  selectedDate,
  onDateSelect,
  slots,
  loading,
  selectedSlot,
  horariosPopulares,
  onSlotSelect,
}: {
  unidade: Unidade
  servico: Servico
  selectedDate: Date
  onDateSelect: (d: Date) => void
  slots: Slot[]
  loading: boolean
  selectedSlot: Slot | null
  horariosPopulares: HorarioPopular[]
  onSlotSelect: (s: Slot) => void
}) {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-3 text-sm">
        <p className="font-semibold text-slate-900 truncate">{servico.nome}</p>
        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
          <MapPin className="h-3 w-3" /> {unidade.nome}
        </p>
      </div>

      <DateSlotPicker
        selectedDate={selectedDate}
        onDateSelect={onDateSelect}
        slots={slots}
        loading={loading}
        selectedSlot={selectedSlot}
        horariosPopulares={horariosPopulares}
        onSlotSelect={onSlotSelect}
      />
    </div>
  )
}

function Step3Confirmar({
  unidade,
  servico,
  slot,
  formaPagamento,
  onFormaPagamentoChange,
  submitting,
  onConfirm,
  onAlterarHorario,
  modoGuest,
  guestNome,
  setGuestNome,
  guestEmail,
  setGuestEmail,
  guestTelefone,
  setGuestTelefone,
  guestCpf,
  setGuestCpf,
}: {
  unidade: Unidade
  servico: Servico
  slot: Slot
  formaPagamento: FormaPagamento
  onFormaPagamentoChange: (f: FormaPagamento) => void
  submitting: boolean
  onConfirm: () => void
  onAlterarHorario: () => void
  modoGuest: boolean
  guestNome: string
  setGuestNome: (v: string) => void
  guestEmail: string
  setGuestEmail: (v: string) => void
  guestTelefone: string
  setGuestTelefone: (v: string) => void
  guestCpf: string
  setGuestCpf: (v: string) => void
}) {
  return (
    <div className="space-y-4">
      {modoGuest && (
        <section className="bg-violet-50 border border-violet-200 rounded-2xl p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-violet-900">Seus dados</p>
            <p className="text-xs text-violet-700 mt-0.5">
              Sem criar conta. Você poderá salvar uma senha depois pra acompanhar seus horários.
            </p>
          </div>
          <input
            type="text"
            value={guestNome}
            onChange={(e) => setGuestNome(e.target.value)}
            placeholder="Nome completo *"
            required
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          <input
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            placeholder="E-mail *"
            required
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          <input
            type="tel"
            value={guestTelefone}
            onChange={(e) => setGuestTelefone(e.target.value)}
            placeholder="Telefone (WhatsApp) *"
            inputMode="numeric"
            required
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          <input
            type="text"
            value={guestCpf}
            onChange={(e) => setGuestCpf(e.target.value)}
            placeholder="CPF (opcional)"
            inputMode="numeric"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </section>
      )}

      <section className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
        <Row label="Serviço" value={servico.nome} sub={`${servico.duracaoMinutos} min`} />
        <Row
          label="Data e hora"
          value={format(parseISO(slot.dataHoraInicio), "EEEE, dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
        />
        {slot.atendenteNome && <Row label="Profissional" value={slot.atendenteNome} />}
        <Row label="Local" value={unidade.nome} sub={unidade.endereco ?? undefined} />
        <Row label="Valor" value={`R$ ${servico.valor.toFixed(2)}`} bold />
      </section>

      <section aria-labelledby="pagamento-titulo">
        <h2 id="pagamento-titulo" className="text-sm font-semibold text-gray-700 mb-2">
          Forma de pagamento
        </h2>
        <fieldset className="space-y-2">
          <legend className="sr-only">Forma de pagamento</legend>
          {FORMAS_PAGAMENTO.map((f) => {
            const ativo = f.id === formaPagamento
            return (
              <label
                key={f.id}
                className={`
                  flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition
                  ${ativo ? 'border-violet-500 bg-violet-50' : 'border-gray-200 bg-white hover:border-gray-300'}
                `}
              >
                <input
                  type="radio"
                  name="formaPagamento"
                  value={f.id}
                  checked={ativo}
                  onChange={() => onFormaPagamentoChange(f.id)}
                  className="mt-0.5 text-violet-600 focus:ring-violet-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{f.label}</p>
                  <p className="text-xs text-gray-500">{f.desc}</p>
                </div>
              </label>
            )
          })}
        </fieldset>
      </section>

      <button
        type="button"
        onClick={onAlterarHorario}
        disabled={submitting}
        className="block w-full text-sm text-gray-600 hover:text-gray-900 underline-offset-4 hover:underline disabled:opacity-50"
      >
        Trocar horário
      </button>

      <button
        type="button"
        onClick={onConfirm}
        disabled={submitting}
        className="
          flex items-center justify-center gap-2 w-full
          bg-violet-600 hover:bg-violet-700 active:bg-violet-800
          text-white font-semibold text-base
          rounded-2xl py-4 shadow-sm
          transition-colors disabled:opacity-70 disabled:cursor-not-allowed
          min-h-[56px]
        "
      >
        {submitting ? (
          'Confirmando...'
        ) : (
          <>
            Confirmar agendamento <CheckCircle2 className="h-5 w-5" />
          </>
        )}
      </button>

      <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
        <Sparkles className="h-3 w-3" /> Agendado via AgendaInteligente
      </p>
    </div>
  )
}

function Row({ label, value, sub, bold }: { label: string; value: string; sub?: string; bold?: boolean }) {
  return (
    <div className="px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-sm text-slate-900 ${bold ? 'font-bold' : 'font-medium'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}
