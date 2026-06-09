import { useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Printer, X, FileText } from 'lucide-react'
import { Agendamento } from '../../services/agendamentoService'

/**
 * Recibo de atendimento finalizado.
 *
 * Modal mostrando todos os dados do atendimento + botão de imprimir.
 * O CSS @media print esconde tudo exceto o conteúdo do recibo (#recibo-print).
 *
 * z-[200] — mesma camada do ConfirmDialog (acima de BottomSheet/Modal).
 *
 * NOTA: NÃO substitui NF-e. Pra emissão fiscal, use /configuracoes/nfse.
 */
interface Props {
  agendamento: Agendamento | null
  onClose: () => void
}

const FORMAS_PAGAMENTO: Record<string, string> = {
  PIX: 'Pix',
  DINHEIRO: 'Dinheiro',
  CARTAO_CREDITO: 'Cartão de crédito',
  CARTAO_DEBITO: 'Cartão de débito',
  BOLETO: 'Boleto',
}

export default function ReciboModal({ agendamento, onClose }: Props) {
  // Bloqueia scroll do body quando aberto
  useEffect(() => {
    if (!agendamento) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [agendamento])

  if (!agendamento) return null

  const cliente = agendamento.cliente ?? {}
  const atendente = agendamento.atendente ?? {}
  const unidade = agendamento.unidade ?? {}
  const dataAgendamento = parseISO(agendamento.dataHoraInicio)

  const valorFinal = Number(agendamento.valorFinal ?? agendamento.valorTotal ?? 0)
  const valorTotal = Number(agendamento.valorTotal ?? valorFinal)
  // Sentinela: subtotal != cobrado mostra "desconto" / "acréscimo" automático
  const ajuste = valorFinal - valorTotal

  const formaPagamento = String(agendamento.formaPagamentoPreferida ?? '').toUpperCase()
  const formaPagamentoLabel = FORMAS_PAGAMENTO[formaPagamento] ?? formaPagamento ?? '—'

  const servicos = Array.isArray(agendamento.servicos) ? agendamento.servicos : []

  const numeroRecibo = String(agendamento.id ?? '').padStart(6, '0')

  const handlePrint = () => {
    window.print()
  }

  const formatMoeda = (n: number) =>
    n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <>
      {/* CSS print — esconde tudo exceto #recibo-print durante impressão */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #recibo-print, #recibo-print * { visibility: visible; }
          #recibo-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 24px;
            background: white;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div
        className="fixed inset-0 z-[200] bg-slate-900/50 flex items-end sm:items-center justify-center p-0 sm:p-4 no-print"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden shadow-xl">
          {/* Header */}
          <header className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Recibo de atendimento</h2>
                <p className="text-xs text-slate-500">Nº {numeroRecibo}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 transition"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          {/* Conteúdo (também usado pra impressão) */}
          <div id="recibo-print" className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-slate-900">
            {/* Cabeçalho do recibo impresso */}
            <div className="text-center pb-4 border-b border-slate-200">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                {unidade.nome ?? 'Atendimento'}
              </h1>
              {unidade.endereco && (
                <p className="text-xs text-slate-500 mt-1">
                  {unidade.endereco}
                  {unidade.numero ? `, ${unidade.numero}` : ''}
                  {unidade.bairro ? ` · ${unidade.bairro}` : ''}
                </p>
              )}
              {unidade.cnpj && (
                <p className="text-xs text-slate-500 mt-0.5">CNPJ {unidade.cnpj}</p>
              )}
              <p className="text-[11px] uppercase tracking-widest text-violet-600 font-bold mt-2">
                Recibo de atendimento — Nº {numeroRecibo}
              </p>
            </div>

            {/* Cliente + Profissional */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Cliente</p>
                <p className="font-semibold text-sm">{cliente.nome ?? '—'}</p>
                {cliente.cpfCnpj && (
                  <p className="text-xs text-slate-500 mt-0.5">CPF/CNPJ {cliente.cpfCnpj}</p>
                )}
                {cliente.telefone && (
                  <p className="text-xs text-slate-500 mt-0.5">Tel {cliente.telefone}</p>
                )}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Profissional</p>
                <p className="font-semibold text-sm">
                  {atendente.nomeUsuario ?? atendente.usuario?.nome ?? atendente.nome ?? '—'}
                </p>
              </div>
            </div>

            {/* Data/hora */}
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Atendido em</p>
              <p className="font-semibold text-sm capitalize">
                {format(dataAgendamento, "EEEE, dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>

            {/* Serviços */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">Serviços</p>
              {servicos.length === 0 ? (
                <p className="text-sm text-slate-500 italic">Nenhum serviço discriminado</p>
              ) : (
                <ul className="space-y-2">
                  {servicos.map((s: any, idx) => {
                    const valorUnit = Number(s.valor ?? 0)
                    const qtd = Number(s.quantidade ?? 1)
                    const total = Number(s.valorTotal ?? valorUnit * qtd)
                    const nome = s.nomeServico ?? s.servico?.nome ?? s.descricao ?? `Serviço ${idx + 1}`
                    return (
                      <li
                        key={idx}
                        className="flex justify-between items-baseline gap-3 border-b border-dashed border-slate-200 pb-2 last:border-0 last:pb-0"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{nome}</p>
                          {qtd > 1 && (
                            <p className="text-xs text-slate-500">
                              {qtd}× {formatMoeda(valorUnit)}
                            </p>
                          )}
                        </div>
                        <p className="text-sm font-semibold tabular-nums">{formatMoeda(total)}</p>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Totais */}
            <div className="border-t border-slate-200 pt-3 space-y-1">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatMoeda(valorTotal)}</span>
              </div>
              {Math.abs(ajuste) > 0.005 && (
                <div className={`flex justify-between text-sm ${ajuste < 0 ? 'text-emerald-700' : 'text-orange-700'}`}>
                  <span>{ajuste < 0 ? 'Desconto' : 'Acréscimo'}</span>
                  <span className="tabular-nums">
                    {ajuste < 0 ? '−' : '+'} {formatMoeda(Math.abs(ajuste))}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-black mt-2 pt-2 border-t border-slate-300">
                <span>Total pago</span>
                <span className="text-violet-700 tabular-nums">{formatMoeda(valorFinal)}</span>
              </div>
            </div>

            {/* Forma de pagamento + status */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-emerald-700 font-semibold">Pagamento</p>
                <p className="text-sm font-semibold text-emerald-900">{formaPagamentoLabel}</p>
              </div>
              <span className="inline-flex items-center rounded-full bg-emerald-600 text-white px-3 py-1 text-xs font-bold uppercase tracking-wider">
                ✓ Pago
              </span>
            </div>

            {/* Rodapé legal */}
            <div className="text-center pt-4 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Este recibo é um comprovante interno de atendimento e <strong>não substitui Nota Fiscal de Serviço</strong>.
                <br />
                Emitido por <strong>Agenda Inteligente</strong> em{' '}
                {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.
              </p>
            </div>
          </div>

          {/* Ações (não aparecem na impressão) */}
          <footer className="flex flex-col sm:flex-row gap-2 p-4 sm:p-5 border-t border-slate-100 no-print">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition w-full sm:w-auto"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition inline-flex items-center justify-center gap-2 w-full sm:flex-1 sm:w-auto shadow-sm shadow-violet-200"
            >
              <Printer className="h-4 w-4" />
              Imprimir recibo
            </button>
          </footer>
        </div>
      </div>
    </>
  )
}
