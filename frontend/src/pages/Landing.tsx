import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { landingConfigService, LandingContent } from '../services/landingConfigService'
import { planoService, formatLimite } from '../services/planoService'

// ─── Logo mark SVG ───────────────────────────────────────────────────────────
function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect width="32" height="32" rx="9" fill="#7C3AED" />
      <rect x="6" y="6" width="20" height="20" rx="3" fill="white" />
      <rect x="10" y="4" width="4" height="5" rx="1.5" fill="#DDD6FE" />
      <rect x="18" y="4" width="4" height="5" rx="1.5" fill="#DDD6FE" />
      <line x1="10" y1="16" x2="22" y2="16" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="19.5" x2="18" y2="19.5" stroke="#C4B5FD" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="22" cy="22" r="4" fill="#10B981" />
      <path d="M20.5 22l1 1 2.5-2.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Mockup: agenda day view ──────────────────────────────────────────────────
function AgendaMockup() {
  const slots = [
    { time: '08:00', client: 'Marina Silva', service: 'Corte + Escova', variant: 'violet', duration: 2 },
    { time: '09:00', client: '', service: '', variant: 'empty', duration: 1 },
    { time: '10:00', client: 'João Pereira', service: 'Coloração', variant: 'emerald', duration: 3 },
    { time: '11:00', client: '', service: '', variant: 'empty', duration: 1 },
    { time: '13:00', client: 'Ana Costa', service: 'Manicure', variant: 'orange', duration: 1 },
    { time: '14:00', client: 'Lúcia Ramos', service: 'Hidratação', variant: 'violet', duration: 2 },
  ]

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
      {/* App top bar */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LogoMark size={22} />
          <span className="font-black text-slate-900 text-sm tracking-tight">Agenda<span className="text-violet-600">Inteligente</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-slate-400 font-medium">Hoje · Qui 08</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
        {[
          { label: 'Agendamentos', value: '14', delta: '+3 vs ontem' },
          { label: 'Faturamento', value: 'R$1.840', delta: 'projeção do dia' },
          { label: 'NF-e emitidas', value: '9', delta: 'via NotaFácil ✓' },
        ].map((s) => (
          <div key={s.label} className="px-3 py-2.5">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{s.label}</div>
            <div className="text-base font-black text-slate-900 leading-none mb-0.5">{s.value}</div>
            <div className="text-[10px] text-emerald-500 font-medium">{s.delta}</div>
          </div>
        ))}
      </div>

      {/* Time slots */}
      <div className="px-4 py-3 space-y-1.5">
        {slots.map((slot, i) => {
          if (slot.variant === 'empty') {
            return (
              <div key={i} className="flex items-center gap-3 opacity-40">
                <span className="text-[10px] font-mono text-slate-400 w-10 flex-shrink-0">{slot.time}</span>
                <div className="flex-1 h-8 border border-dashed border-slate-200 rounded-lg" />
              </div>
            )
          }
          const colors: Record<string, string> = {
            violet: 'bg-violet-50 border-l-violet-500',
            emerald: 'bg-emerald-50 border-l-emerald-500',
            orange: 'bg-orange-50 border-l-orange-400',
          }
          const textColors: Record<string, string> = {
            violet: 'text-violet-900',
            emerald: 'text-emerald-900',
            orange: 'text-orange-900',
          }
          const subColors: Record<string, string> = {
            violet: 'text-violet-500',
            emerald: 'text-emerald-500',
            orange: 'text-orange-400',
          }
          return (
            <div key={i} className="flex items-start gap-3">
              <span className="text-[10px] font-mono text-slate-400 w-10 flex-shrink-0 pt-2">{slot.time}</span>
              <div className={`flex-1 border-l-[3px] rounded-r-lg px-3 py-2 ${colors[slot.variant]}`}>
                <div className={`text-xs font-bold leading-tight ${textColors[slot.variant]}`}>{slot.client}</div>
                <div className={`text-[10px] font-medium ${subColors[slot.variant]}`}>{slot.service}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* NF-e badge */}
      <div className="mx-4 mb-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
        <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <span className="text-[11px] font-bold text-emerald-800">NF-e emitida automaticamente</span>
          <span className="text-[10px] text-emerald-600 ml-1">via NotaFácil · João Pereira · R$320</span>
        </div>
      </div>
    </div>
  )
}

// ─── Pricing card ─────────────────────────────────────────────────────────────
function PricingCard({
  tier, price, period, features, noFeatures, featured, cta, ctaLink,
}: {
  tier: string; price: string; period: string; features: string[]; noFeatures?: string[]; featured?: boolean; cta: string; ctaLink: string;
}) {
  return (
    <div className={`relative rounded-2xl p-7 border flex flex-col ${featured
      ? 'border-violet-400 shadow-brand-lg bg-white ring-4 ring-violet-50'
      : 'border-slate-200 bg-white shadow-sm'}`}>
      {featured && (
        <div className="absolute -top-px left-1/2 -translate-x-1/2 bg-violet-600 text-white text-[11px] font-bold px-4 py-1 rounded-b-xl">
          Mais popular
        </div>
      )}
      <div className={`text-xs font-bold uppercase tracking-widest mb-2 ${featured ? 'text-violet-600 mt-4' : 'text-slate-500 mt-1'}`}>{tier}</div>
      <div className="flex items-baseline gap-0.5 mb-1">
        <span className="text-lg font-semibold text-slate-500">R$</span>
        <span className="text-4xl font-black text-slate-900 tracking-tight">{price}</span>
      </div>
      <div className="text-xs text-slate-400 mb-6">{period}</div>
      <Link
        to={ctaLink}
        className={`block text-center py-2.5 px-4 rounded-xl text-sm font-bold transition-all mb-6 ${featured
          ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-brand'
          : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
      >
        {cta}
      </Link>
      <div className="space-y-2 flex-1">
        {features.map((f) => (
          <div key={f} className="flex items-start gap-2 text-sm text-slate-600">
            <span className="text-emerald-500 font-bold mt-0.5 flex-shrink-0">✓</span>
            {f}
          </div>
        ))}
        {noFeatures?.map((f) => (
          <div key={f} className="flex items-start gap-2 text-sm text-slate-300">
            <span className="mt-0.5 flex-shrink-0">–</span>
            {f}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main landing page ────────────────────────────────────────────────────────
/**
 * Acessor seguro com fallback hardcoded.
 * `cfg?.hero?.tituloLinha1 ?? FALLBACK` — backend pode ter campos ausentes
 * sem quebrar a renderização.
 */
function pick<T>(v: T | undefined | null, fallback: T): T {
  return v != null && v !== ('' as any) ? v : fallback
}

export default function Landing() {
  // Conteúdo configurável (admin global edita em /plataforma/landing).
  // useQuery devolve undefined no primeiro render — fallbacks hardcoded mantêm
  // a renderização funcional pra SEO/no-JS/backend down.
  // staleTime curto (30s) garante que edições do admin aparecem rapidamente sem refresh manual.
  const { data: cfg } = useQuery<LandingContent>({
    queryKey: ['landing-config'],
    queryFn: landingConfigService.get,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    retry: 1,
  })

  // Planos vêm do backend (também editáveis em /plataforma/planos).
  const { data: planos = [] } = useQuery({
    queryKey: ['planos'],
    queryFn: planoService.listar,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  })
  const planosPagos = planos.filter((p) => p.nome !== 'TRIAL').sort((a, b) => a.ordem - b.ordem)
  const planoTrial = planos.find((p) => p.nome === 'TRIAL')

  // Texto do rodapé do pricing: reflete a configuração atual do Trial.
  // Se Trial = 0 BRL → "Trial gratuito de X dias"
  // Se Trial > 0 BRL → "Trial de X dias por R$ Y"
  // Default 14 dias quando duracaoTrialDias não vier configurado.
  const duracaoTrial = planoTrial?.duracaoTrialDias ?? 14
  const precoTrial = Number(planoTrial?.precoMensalBrl ?? 0)
  const textoTrial = precoTrial > 0
    ? `Trial de ${duracaoTrial} dias por ${precoTrial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
    : `Trial gratuito de ${duracaoTrial} dias`
  const subtextoTrial = precoTrial > 0 ? 'Cancele quando quiser' : 'Sem cartão de crédito · Cancele quando quiser'

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoMark size={30} />
            <span className="font-black text-lg text-slate-900 tracking-tight">
              Agenda<span className="text-violet-600">Inteligente</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-1">
            {['Funcionalidades', 'Preços'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
              >
                {item}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="hidden md:block px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Entrar
            </Link>
            <Link
              to="/cadastro"
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl transition-all shadow-brand"
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Left: copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-200 px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-violet-700 font-mono tracking-wide">
                NFS-e Nacional obrigatória em 2025–2026
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 leading-[1.08] tracking-tight mb-6">
              {pick(cfg?.hero?.tituloLinha1, 'O único agendamento')}<br />
              <span className="text-violet-600">{pick(cfg?.hero?.tituloLinha2, 'que emite a NFS-e')}</span>
            </h1>

            <p className="text-lg text-slate-500 leading-relaxed mb-8 max-w-md">
              {pick(cfg?.hero?.subtitulo, 'Agenda online, gestão de equipe, lembretes automáticos e emissão de nota fiscal — tudo em um lugar. Sem contabilista, sem planilha, sem dor de cabeça.')}
            </p>

            <div className="flex flex-wrap gap-3 mb-10">
              <Link
                to={pick(cfg?.hero?.ctaPrimarioLink, '/cadastro')}
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-base transition-all shadow-brand hover:shadow-brand-lg hover:-translate-y-0.5"
              >
                {pick(cfg?.hero?.ctaPrimario, 'Começar 14 dias grátis')}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link
                to={pick(cfg?.hero?.ctaSecundarioLink, '/login')}
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-base border border-slate-200 transition-all"
              >
                {pick(cfg?.hero?.ctaSecundario, 'Ver demonstração')}
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
              {['Sem cartão de crédito', '14 dias grátis', 'Cancele quando quiser'].map((item, i) => (
                <div key={item} className="flex items-center gap-1.5">
                  {i > 0 && <span className="hidden sm:block text-slate-200">·</span>}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7l3 3 6-6" stroke="#10B981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Right: mockup */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-200/40 to-emerald-200/20 rounded-3xl -m-4 blur-2xl" />
            <div className="relative">
              <AgendaMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP (configurável em /plataforma/landing) ── */}
      <section className="bg-slate-900">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 text-center">
          {pick(cfg?.stats, [
            { valor: 'R$ 3,8bi', label: 'Mercado de agendamento no Brasil' },
            { valor: '18M+', label: 'Profissionais com atendimento recorrente' },
            { valor: '62%', label: 'Ainda usa WhatsApp ou agenda em papel' },
            { valor: '0', label: 'Concorrentes com NF-e nativa' },
          ]).map((s, idx) => (
            <div key={`${s.valor}-${idx}`}>
              <div className="text-3xl font-black text-white tracking-tight mb-1">{s.valor}</div>
              <div className="text-sm font-semibold text-slate-300 leading-snug">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── POR QUE AGORA ── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <div className="text-xs font-bold text-violet-600 font-mono tracking-widest uppercase mb-3">Por que agora?</div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">O mercado chegou ao ponto de inflexão</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            {
              icon: '🏛',
              title: 'NFS-e Nacional obrigatória (2025–2026)',
              desc: 'A Receita Federal tornou obrigatória a NFS-e Nacional para todos os prestadores de serviço. Quem nunca emitiu nota agora precisa de uma solução — e nós somos os únicos que integram isso ao agendamento.',
              color: 'violet',
            },
            {
              icon: '📱',
              title: 'Clientes exigem agendamento online',
              desc: '78% dos clientes preferem agendar sem telefonar. Quem não oferece link de agendamento online perde cliente para quem oferece. O mercado chegou ao ponto de inflexão em 2024–2026.',
              color: 'emerald',
            },
            {
              icon: '🤖',
              title: 'IA aplicada ao dia a dia',
              desc: 'Previsão de no-show, insights semanais gerados via IA (Groq), sugestão de respostas a reclamações e análise de clientes em risco de churn — inteligência prática, sem complexidade.',
              color: 'violet',
            },
            {
              icon: '🔗',
              title: 'Nenhum concorrente tem NF-e nativa',
              desc: 'Trinks, Doctoralia, EasyFit — todos exigem um sistema separado para emitir notas. Nossa integração com NotaFácil elimina esse atrito de uma vez por todas.',
              color: 'emerald',
            },
          ].map((item) => (
            <div key={item.title} className={`p-6 rounded-2xl border ${item.color === 'violet' ? 'bg-violet-50 border-violet-100' : 'bg-emerald-50 border-emerald-100'}`}>
              <div className="text-2xl mb-3">{item.icon}</div>
              <h3 className={`text-base font-bold mb-2 ${item.color === 'violet' ? 'text-violet-900' : 'text-emerald-900'}`}>{item.title}</h3>
              <p className={`text-sm leading-relaxed ${item.color === 'violet' ? 'text-violet-700' : 'text-emerald-700'}`}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FUNCIONALIDADES ── */}
      <section id="funcionalidades" className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-xs font-bold text-violet-600 font-mono tracking-widest uppercase mb-3">Funcionalidades</div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-4">Tudo que você precisa em um lugar</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Sem planilha, sem ligação para confirmar, sem sistema separado de nota fiscal. Uma plataforma que conecta agenda, lembretes e obrigações fiscais.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="18" rx="3" stroke="#7C3AED" strokeWidth="1.8" />
                    <path d="M8 2v4M16 2v4M3 10h18" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round" />
                    <circle cx="8" cy="15" r="1.5" fill="#7C3AED" />
                    <circle cx="12" cy="15" r="1.5" fill="#7C3AED" />
                    <circle cx="16" cy="15" r="1.5" fill="#C4B5FD" />
                  </svg>
                ),
                title: 'Agenda online inteligente',
                desc: 'Link público de agendamento, calendário por profissional, horários disponíveis em tempo real. O cliente agenda sem telefonar.',
                badge: 'Viral',
                badgeColor: 'bg-violet-100 text-violet-700',
              },
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M9 14l2 2 4-4" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M21 12c0-4.97-4.03-9-9-9S3 7.03 3 12s4.03 9 9 9" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M16 16l2 2 4-4" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ),
                title: 'NF-e automática via NotaFácil',
                desc: 'Integração proprietária com NotaFácil: emite NFS-e automaticamente ao finalizar o atendimento. Nenhum concorrente oferece isso.',
                badge: 'Exclusivo',
                badgeColor: 'bg-emerald-100 text-emerald-700',
              },
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M3 9l9-6 9 6v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="#F97316" strokeWidth="1.8" />
                    <path d="M9 22V12h6v10" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                ),
                title: 'Multi-unidade',
                desc: 'Gerencie múltiplos salões, clínicas ou academias em uma conta. Dashboard consolidado com faturamento real por unidade.',
                badge: 'Empresarial',
                badgeColor: 'bg-orange-100 text-orange-600',
              },
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="5" width="20" height="14" rx="3" stroke="#7C3AED" strokeWidth="1.8" />
                    <path d="M2 10h20" stroke="#7C3AED" strokeWidth="1.8" />
                    <circle cx="7" cy="16" r="1" fill="#7C3AED" />
                  </svg>
                ),
                title: 'Controle financeiro',
                desc: 'Registre pagamentos, acompanhe recebimentos e gere relatórios de faturamento por profissional. Sem planilha, sem papel.',
                badge: 'Profissional',
                badgeColor: 'bg-violet-100 text-violet-700',
              },
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M8 9h8M8 13h4" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                ),
                title: 'Lembretes automáticos',
                desc: 'Email de confirmação e lembrete automático 24h antes do atendimento. Menos faltas, menos ligações desnecessárias.',
                badge: 'Todos os planos',
                badgeColor: 'bg-emerald-100 text-emerald-700',
              },
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M18 20V10M12 20V4M6 20v-6" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ),
                title: 'Relatórios avançados',
                desc: 'Faturamento por profissional, taxa de retorno, serviços mais vendidos, horários de pico. Dados para decidir, não palpitar.',
                badge: 'Profissional+',
                badgeColor: 'bg-orange-100 text-orange-600',
              },
            ].map((f) => (
              <div key={f.title} className="p-6 rounded-2xl border border-slate-200 hover:border-violet-200 hover:shadow-md transition-all group">
                <div className="w-11 h-11 bg-slate-50 group-hover:bg-violet-50 rounded-xl flex items-center justify-center mb-4 transition-colors">
                  {f.icon}
                </div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-base font-bold text-slate-900 leading-snug">{f.title}</h3>
                  <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${f.badgeColor}`}>{f.badge}</span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPETITOR TABLE ── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <div className="text-xs font-bold text-violet-600 font-mono tracking-widest uppercase mb-3">Comparativo</div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-4">Por que não os outros?</h2>
          <p className="text-slate-500">Nenhum concorrente emite NF-e nativamente. Esse é o moat.</p>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="text-left px-5 py-4 text-sm font-semibold rounded-tl-xl">Produto</th>
                {['Agendamento online', 'Multi-unidade', 'NF-e nativa', 'Lembretes', 'Preço/mês'].map((h, i, arr) => (
                  <th key={h} className={`px-4 py-4 text-xs font-semibold text-center ${i === arr.length - 1 ? 'rounded-tr-xl' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pick(cfg?.comparativo?.concorrentes, [
                { nome: '★ AgendaInteligente', destaque: true, cols: ['✓ Completo', '✓ Sim', '✓ Nativa', '✓ Email', 'R$49–199'], tipos: ['has', 'has', 'has', 'has', 'has'] as Array<'has' | 'no' | 'partial' | 'neutral'> },
                { nome: 'Trinks', destaque: false, cols: ['✓', '⚠ Limitado', '✕', '✓', 'R$89–299'], tipos: ['has', 'partial', 'no', 'has', 'neutral'] as Array<'has' | 'no' | 'partial' | 'neutral'> },
                { nome: 'Doctoralia', destaque: false, cols: ['✓', '⚠', '✕', '⚠', 'R$149–449'], tipos: ['has', 'partial', 'no', 'partial', 'neutral'] as Array<'has' | 'no' | 'partial' | 'neutral'> },
                { nome: 'EasyFit', destaque: false, cols: ['✓', '✓', '✕', '⚠', 'R$199–599'], tipos: ['has', 'has', 'no', 'partial', 'neutral'] as Array<'has' | 'no' | 'partial' | 'neutral'> },
                { nome: 'Calendly', destaque: false, cols: ['✓', '✕', '✕', '✕', 'US$8–16'], tipos: ['has', 'no', 'no', 'no', 'neutral'] as Array<'has' | 'no' | 'partial' | 'neutral'> },
              ]).map((row, rowIdx) => (
                <tr key={`${row.nome}-${rowIdx}`} className={row.destaque ? 'bg-violet-50' : 'hover:bg-slate-50'}>
                  <td className={`px-5 py-4 text-sm font-bold border-b border-slate-100 ${row.destaque ? 'text-violet-700' : 'text-slate-700'}`}>
                    {row.nome}
                  </td>
                  {row.cols.map((cell, i) => {
                    const type = row.tipos[i]
                    const cls = type === 'has'
                      ? 'text-emerald-500 font-bold'
                      : type === 'no'
                        ? 'text-slate-300'
                        : type === 'partial'
                          ? 'text-amber-500 font-semibold'
                          : 'text-slate-500'
                    return (
                      <td key={i} className={`px-4 py-4 text-xs text-center border-b border-slate-100 ${cls}`}>
                        {cell}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── PRICING ──
          Valores alinhados com migration V74 (#138). Fonte de verdade:
          `src/main/resources/db/migration/V74__create_planos.sql` + GET /api/planos.
          Se mexer aqui, mexer LÁ também — preços e limites devem ser idênticos. */}
      <section id="preços" className="bg-slate-50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-xs font-bold text-violet-600 font-mono tracking-widest uppercase mb-3">Preços</div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-4">Simples. Justo. Sem surpresa.</h2>
            <p className="text-slate-500">NFS-e nativa em todos os planos — você emite nota direto do atendimento, sem abrir outro sistema.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Pricing 100% dinâmico — vem de GET /api/planos (editor em /plataforma/planos).
                Pula Trial — Trial é só padrão de cadastro, não vai pra landing. */}
            {planosPagos.length > 0 ? (
              planosPagos.map((p, idx) => {
                const featured = idx === 1 // do meio destacado (convenção UX: Pro)
                const features: string[] = [
                  `${formatLimite(p.limiteUnidades)} ${p.limiteUnidades === 1 ? 'unidade' : 'unidades'} · ${formatLimite(p.limiteProfissionais)} profissionais`,
                  `${formatLimite(p.limiteAgendamentosMes)} agendamentos/mês`,
                  `${p.limiteNfseMes.toLocaleString('pt-BR')} NFS-e/mês inclusas`,
                  p.descricao ?? 'Suporte por email',
                ]
                return (
                  <PricingCard
                    key={p.id}
                    tier={p.nomePublico}
                    price={String(Math.round(Number(p.precoMensalBrl)))}
                    period="por mês · cancele quando quiser"
                    cta={featured ? 'Assinar agora' : 'Começar grátis'}
                    ctaLink="/cadastro"
                    featured={featured}
                    features={features}
                  />
                )
              })
            ) : (
              // Fallback hardcoded (carregamento inicial / backend down / sem JS)
              <>
                <PricingCard tier="Starter" price="49" period="por mês · ideal pra quem está começando" cta="Começar grátis" ctaLink="/cadastro" features={['1 unidade · até 3 profissionais', 'Até 200 agendamentos/mês', '20 NFS-e/mês inclusas']} />
                <PricingCard tier="Pro" price="99" period="por mês · pra negócios em crescimento" cta="Assinar agora" ctaLink="/cadastro" featured features={['Tudo do Starter', 'Até 3 unidades · 10 profissionais', '800 agendamentos/mês', '100 NFS-e/mês']} />
                <PricingCard tier="Business" price="199" period="por mês · pra redes e operações grandes" cta="Falar com vendas" ctaLink="/cadastro" features={['Tudo do Pro', 'Unidades/profissionais ilimitados', '500 NFS-e/mês']} />
              </>
            )}
          </div>
          <p className="text-center text-sm text-slate-400 mt-6">
            Todos os planos começam com <strong className="text-slate-600">{textoTrial}</strong> · {subtextoTrial}
          </p>
          <p className="text-center text-xs text-slate-400 mt-2">
            Excedente NFS-e: R$ 1,50 (Starter) · R$ 1,20 (Pro) · R$ 1,00 (Business) por nota
          </p>
        </div>
      </section>

      {/* ── INTEGRAÇÕES ── */}
      <section id="integrações" className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <div className="text-xs font-bold text-violet-600 font-mono tracking-widest uppercase mb-3">Integração</div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">NF-e Nacional via NotaFácil</h2>
          <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">Emissão automática de NFS-e ao finalizar o atendimento — sem abrir outro sistema, sem processo manual.</p>
        </div>
        <div className="flex justify-center">
          <a
            href="https://www.emitirnotafacil.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-6 py-4 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: '#00E8FF' }} />
            <div>
              <div className="text-sm font-bold text-slate-900">NotaFácil</div>
              <div className="text-xs text-slate-400">Emissão de NFS-e Nacional</div>
            </div>
          </a>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="bg-slate-900 py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <div className="w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-brand-lg">
            <LogoMark size={36} />
          </div>
          <h2 className="text-3xl font-black text-white mb-4 tracking-tight">
            {pick(cfg?.footerCta?.titulo, 'Pronto para parar de perder clientes para a concorrência?')}
          </h2>
          <p className="text-slate-400 text-lg mb-8">
            {pick(cfg?.footerCta?.subtitulo, '14 dias grátis. Sem cartão. Configuração em 5 minutos.')}
          </p>
          <Link
            to="/cadastro"
            className="inline-flex items-center gap-2 px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-base transition-all shadow-brand hover:shadow-brand-lg hover:-translate-y-0.5"
          >
            {pick(cfg?.footerCta?.cta, 'Criar conta gratuita')}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <p className="text-slate-600 text-sm mt-4">
            Já tem conta?{' '}
            <Link to="/login" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
              Entrar
            </Link>
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-slate-950 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <LogoMark size={22} />
            <span className="text-sm font-bold text-slate-300">
              Agenda<span className="text-violet-400">Inteligente</span>
            </span>
          </div>
          <div className="flex items-center gap-6">
            {['Termos', 'Privacidade', 'Suporte'].map((l) => (
              <a key={l} href="#" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                {l}
              </a>
            ))}
          </div>
          <div className="text-xs text-slate-600 font-mono">
            © 2026 AgendaInteligente
          </div>
        </div>
      </footer>
    </div>
  )
}
