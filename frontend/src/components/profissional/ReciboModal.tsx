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
   * Gera HTML do recibo do ZERO com `style="..."` inline em CADA elemento.
   * Sem classes Tailwind, sem dependência de bundle, sem @media print.
   *
   * Por que abordagens anteriores falharam:
   * - @media print + visibility hidden: brigou com overlay fixed do modal
   * - window.open + classes Tailwind: popup não tem o CSS compilado → layout quebrado
   *
   * Esta versão tem CSS inline em TUDO. Funciona em qualquer browser, sem
   * depender de nada do app. Auto-suficiente.
   */
  function renderHtmlImpressao(): string {
    const fmtData = format(dataAgendamento, "EEEE, dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
    const fmtEmitido = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })

    const enderecoLinha = [unidade.endereco, unidade.numero ? `, ${unidade.numero}` : '', unidade.bairro ? ` · ${unidade.bairro}` : '']
      .filter(Boolean).join('')

    const itensServicos = servicos.length === 0
      ? `<p style="font-size:14px;color:#64748b;font-style:italic;margin:0;">Nenhum serviço discriminado</p>`
      : `<ul style="list-style:none;padding:0;margin:0;">${servicos.map((s: any, idx) => {
          const valorUnit = Number(s.valor ?? 0)
          const qtd = Number(s.quantidade ?? 1)
          const total = Number(s.valorTotal ?? valorUnit * qtd)
          const nome = (s.nomeServico ?? s.servico?.nome ?? s.descricao ?? `Serviço ${idx + 1}`) as string
          const isLast = idx === servicos.length - 1
          return `<li style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;${isLast ? '' : 'border-bottom:1px dashed #e2e8f0;padding-bottom:8px;margin-bottom:8px;'}">
            <div style="flex:1;min-width:0;">
              <p style="font-size:14px;font-weight:600;margin:0;">${escapeHtml(nome)}</p>
              ${qtd > 1 ? `<p style="font-size:12px;color:#64748b;margin:0;">${qtd}× ${formatMoeda(valorUnit)}</p>` : ''}
            </div>
            <p style="font-size:14px;font-weight:600;font-variant-numeric:tabular-nums;margin:0;">${formatMoeda(total)}</p>
          </li>`
        }).join('')}</ul>`

    const blocoAjuste = Math.abs(ajuste) > 0.005
      ? `<div style="display:flex;justify-content:space-between;font-size:14px;color:${ajuste < 0 ? '#047857' : '#c2410c'};">
          <span>${ajuste < 0 ? 'Desconto' : 'Acréscimo'}</span>
          <span style="font-variant-numeric:tabular-nums;">${ajuste < 0 ? '−' : '+'} ${formatMoeda(Math.abs(ajuste))}</span>
        </div>`
      : ''

    return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Recibo de atendimento</title>
<style>
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; padding: 24px; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #0f172a; background: white; }
  @page { margin: 16mm; }
</style>
</head>
<body>
  <div style="max-width:680px;margin:0 auto;">
    <!-- Cabeçalho -->
    <div style="text-align:center;padding-bottom:16px;border-bottom:1px solid #e2e8f0;">
      <h1 style="font-size:24px;font-weight:900;letter-spacing:-0.02em;margin:0;color:#0f172a;">${escapeHtml(unidade.nome ?? 'Atendimento')}</h1>
      ${enderecoLinha ? `<p style="font-size:12px;color:#64748b;margin:4px 0 0;">${escapeHtml(enderecoLinha)}</p>` : ''}
      ${unidade.cnpj ? `<p style="font-size:12px;color:#64748b;margin:2px 0 0;">CNPJ ${escapeHtml(unidade.cnpj)}</p>` : ''}
      <p style="font-size:11px;color:#6d28d9;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;margin:8px 0 0;">Recibo de atendimento — Nº ${numeroRecibo}</p>
    </div>

    <!-- Cliente + Profissional -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px;">
      <div>
        <p style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;font-weight:600;margin:0 0 4px;">Cliente</p>
        <p style="font-size:14px;font-weight:600;margin:0;">${escapeHtml(cliente.nome ?? '—')}</p>
        ${cliente.cpfCnpj ? `<p style="font-size:12px;color:#64748b;margin:2px 0 0;">CPF/CNPJ ${escapeHtml(cliente.cpfCnpj)}</p>` : ''}
        ${cliente.telefone ? `<p style="font-size:12px;color:#64748b;margin:2px 0 0;">Tel ${escapeHtml(cliente.telefone)}</p>` : ''}
      </div>
      <div>
        <p style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;font-weight:600;margin:0 0 4px;">Profissional</p>
        <p style="font-size:14px;font-weight:600;margin:0;">${escapeHtml(atendente.nomeUsuario ?? atendente.usuario?.nome ?? atendente.nome ?? '—')}</p>
      </div>
    </div>

    <!-- Data/hora -->
    <div style="background:#f8fafc;border-radius:12px;padding:12px;margin-top:20px;">
      <p style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;font-weight:600;margin:0 0 4px;">Atendido em</p>
      <p style="font-size:14px;font-weight:600;margin:0;text-transform:capitalize;">${fmtData}</p>
    </div>

    <!-- Serviços -->
    <div style="margin-top:20px;">
      <p style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;font-weight:600;margin:0 0 8px;">Serviços</p>
      ${itensServicos}
    </div>

    <!-- Totais -->
    <div style="border-top:1px solid #cbd5e1;padding-top:12px;margin-top:20px;">
      <div style="display:flex;justify-content:space-between;font-size:14px;color:#475569;">
        <span>Subtotal</span>
        <span style="font-variant-numeric:tabular-nums;">${formatMoeda(valorTotal)}</span>
      </div>
      ${blocoAjuste}
      <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:900;margin-top:8px;padding-top:8px;border-top:1px solid #cbd5e1;">
        <span>Total pago</span>
        <span style="color:#6d28d9;font-variant-numeric:tabular-nums;">${formatMoeda(valorFinal)}</span>
      </div>
    </div>

    <!-- Forma de pagamento + status -->
    <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:12px;display:flex;align-items:center;justify-content:space-between;margin-top:20px;">
      <div>
        <p style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#047857;font-weight:600;margin:0;">Pagamento</p>
        <p style="font-size:14px;font-weight:600;color:#064e3b;margin:2px 0 0;">${escapeHtml(formaPagamentoLabel)}</p>
      </div>
      <span style="display:inline-flex;align-items:center;background:#059669;color:#fff;padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">✓ Pago</span>
    </div>

    <!-- Rodapé legal -->
    <div style="text-align:center;padding-top:16px;border-top:1px solid #f1f5f9;margin-top:20px;">
      <p style="font-size:10px;color:#94a3b8;line-height:1.5;margin:0;">
        Este recibo é um comprovante interno de atendimento e <strong>não substitui Nota Fiscal de Serviço</strong>.<br>
        Emitido por <strong>Agenda Inteligente</strong> em ${fmtEmitido}.
      </p>
    </div>
  </div>
<script>
  window.addEventListener('load', function() {
    setTimeout(function() {
      window.print();
      setTimeout(function() { window.close(); }, 300);
    }, 200);
  });
</script>
</body>
</html>`
  }

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=720,height=900')
    if (!win) {
      alert('Pop-up bloqueado pelo navegador. Permita pop-ups pra imprimir.')
      return
    }
    win.document.open()
    win.document.write(renderHtmlImpressao())
    win.document.close()
  }

  // Util pra prevenir XSS — sanitiza strings antes de injetar no HTML
  function escapeHtml(s: any): string {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
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
