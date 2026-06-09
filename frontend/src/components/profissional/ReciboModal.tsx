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

  /**
   * Imprime o recibo via janela popup separada (mais confiável que
   * window.print() + @media print, que brigava com o overlay fixed do modal
   * e gerava página em branco).
   *
   * Estratégia:
   * 1. Pega o HTML do elemento #recibo-print
   * 2. Abre nova janela
   * 3. Injeta HTML + estilos Tailwind essenciais (cores, espaçamento, layout)
   * 4. Aguarda load → chama window.print() na nova janela
   * 5. Fecha automaticamente depois
   */
  const handlePrint = () => {
    const conteudo = document.getElementById('recibo-print')
    if (!conteudo) {
      console.error('Recibo: container #recibo-print não encontrado')
      return
    }
    const win = window.open('', '_blank', 'width=720,height=900')
    if (!win) {
      alert('Pop-up bloqueado pelo navegador. Permita pop-ups pra imprimir.')
      return
    }
    // CSS mínimo equivalente às classes Tailwind usadas — independente de carregar bundle
    const css = `
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { margin: 0; padding: 24px; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #0f172a; background: white; }
      h1 { font-size: 22px; font-weight: 900; letter-spacing: -0.02em; margin: 0; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .border-b { border-bottom: 1px solid #e2e8f0; }
      .border-t { border-top: 1px solid #cbd5e1; }
      .pb-4 { padding-bottom: 16px; } .pt-2 { padding-top: 8px; } .pt-3 { padding-top: 12px; } .pt-4 { padding-top: 16px; }
      .mt-1 { margin-top: 4px; } .mt-2 { margin-top: 8px; } .mb-1 { margin-bottom: 4px; } .mb-2 { margin-bottom: 8px; }
      .space-y-5 > * + * { margin-top: 20px; }
      .space-y-2 > * + * { margin-top: 8px; }
      .space-y-1 > * + * { margin-top: 4px; }
      .grid { display: grid; }
      .grid-cols-2 { grid-template-columns: 1fr 1fr; }
      .gap-4 { gap: 16px; }
      .flex { display: flex; }
      .items-center { align-items: center; } .items-baseline { align-items: baseline; }
      .justify-between { justify-content: space-between; }
      .gap-3 { gap: 12px; } .flex-1 { flex: 1; min-width: 0; }
      .p-3 { padding: 12px; }
      .rounded-xl { border-radius: 12px; }
      .bg-slate-50 { background: #f8fafc; }
      .bg-emerald-50 { background: #ecfdf5; }
      .bg-emerald-600 { background: #059669; color: white; }
      .border { border: 1px solid #e2e8f0; }
      .border-emerald-200 { border-color: #a7f3d0; }
      .border-slate-100 { border-color: #f1f5f9; }
      .text-violet-700 { color: #6d28d9; }
      .text-emerald-700 { color: #047857; }
      .text-emerald-800 { color: #065f46; }
      .text-emerald-900 { color: #064e3b; }
      .text-slate-400 { color: #94a3b8; }
      .text-slate-500 { color: #64748b; }
      .text-slate-600 { color: #475569; }
      .text-slate-700 { color: #334155; }
      .uppercase { text-transform: uppercase; }
      .tracking-wider { letter-spacing: 0.08em; } .tracking-widest { letter-spacing: 0.12em; }
      .font-bold { font-weight: 700; }
      .font-semibold { font-weight: 600; }
      .font-black { font-weight: 900; }
      .text-xs { font-size: 12px; line-height: 16px; }
      .text-sm { font-size: 14px; line-height: 20px; }
      .text-base { font-size: 16px; line-height: 24px; }
      .text-xl { font-size: 20px; line-height: 28px; }
      .tabular-nums { font-variant-numeric: tabular-nums; }
      ul { list-style: none; padding: 0; margin: 0; }
      .border-dashed { border-style: dashed; }
      .last-pb-0:last-child { padding-bottom: 0; border: 0; }
      .px-3 { padding-left: 12px; padding-right: 12px; }
      .py-1 { padding-top: 4px; padding-bottom: 4px; }
      .rounded-full { border-radius: 9999px; }
      .inline-flex { display: inline-flex; }
      .text-orange-700 { color: #c2410c; }
      img, svg { max-width: 100%; }
    `
    win.document.open()
    win.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Recibo de atendimento</title>
<style>${css}</style>
</head>
<body>
${conteudo.innerHTML}
<script>
  window.addEventListener('load', function() {
    setTimeout(function() {
      window.print();
      setTimeout(function() { window.close(); }, 300);
    }, 100);
  });
</script>
</body>
</html>`)
    win.document.close()
  }

  const formatMoeda = (n: number) =>
    n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <>
      {/* Impressão usa janela popup separada (handlePrint), sem @media print no
          documento principal — abordagem mais confiável e evita briga com o
          overlay fixed do modal (que ficou em branco na 1ª implementação). */}

      <div
        className="fixed inset-0 z-[200] bg-slate-900/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
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
          <footer className="flex flex-col sm:flex-row gap-2 p-4 sm:p-5 border-t border-slate-100">
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
