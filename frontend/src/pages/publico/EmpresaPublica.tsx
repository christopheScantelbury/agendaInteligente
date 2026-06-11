import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Loader2, MapPin, Calendar, ArrowRight, AlertCircle } from 'lucide-react'
import api from '../../services/api'

interface UnidadePublica {
  id: number
  nome: string
  endereco?: string
  bairro?: string
  cidade?: string
}

interface EmpresaPublicaData {
  empresaId: number
  nome: string
  categoria?: string
  logo?: string
  corApp?: string
  cidade?: string
  uf?: string
  unidades: UnidadePublica[]
}

export default function EmpresaPublica() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<EmpresaPublicaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    let cancelado = false
    setLoading(true)
    api
      .get<EmpresaPublicaData>(`/publico/clientes/empresas/${slug}`)
      .then((res) => {
        if (!cancelado) setData(res.data)
      })
      .catch((err) => {
        if (!cancelado) {
          if (err?.response?.status === 404) setErro('Página não encontrada')
          else setErro('Não foi possível carregar.')
        }
      })
      .finally(() => {
        if (!cancelado) setLoading(false)
      })
    return () => {
      cancelado = true
    }
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    )
  }

  if (erro || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-900 mb-1">{erro ?? 'Erro'}</h1>
          <p className="text-sm text-slate-600 mb-6">
            O link que você acessou não existe ou foi removido.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-700 text-sm font-semibold"
          >
            Ir para a página inicial
          </Link>
        </div>
      </div>
    )
  }

  // #160: corApp escopada via CSS var. NÃO vaza pro resto do app (sidebar, dash)
  // que continua com identidade violet do Agenda Inteligente.
  const cor = data.corApp || '#7C3AED'
  const corHover = ajustarBrilho(cor, -10)
  const corClara = ajustarBrilho(cor, 35)

  const themeStyle: React.CSSProperties = {
    ['--cor-marca' as any]: cor,
    ['--cor-marca-hover' as any]: corHover,
    ['--cor-marca-clara' as any]: corClara,
  }

  return (
    <div className="min-h-screen bg-slate-50" style={themeStyle}>
      {/* Header com gradient da cor da empresa */}
      <header
        className="px-4 py-10 sm:py-14 text-white"
        style={{ background: `linear-gradient(135deg, ${cor} 0%, ${ajustarBrilho(cor, -20)} 100%)` }}
      >
        <div className="max-w-2xl mx-auto flex flex-col items-center text-center gap-3">
          {data.logo ? (
            <img
              src={data.logo}
              alt={`Logo ${data.nome}`}
              className="h-20 w-20 rounded-2xl object-cover bg-white p-2"
            />
          ) : (
            <div className="h-20 w-20 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-black">
              {data.nome.charAt(0)}
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-extrabold">{data.nome}</h1>
          {(data.cidade || data.uf) && (
            <p className="text-sm text-white/90 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {[data.cidade, data.uf].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* CTA principal — usa a cor da empresa (#160) */}
        <button
          type="button"
          onClick={() => navigate(`/cliente/agendar?guest=1${slug ? `&slug=${slug}` : ''}`)}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl text-white text-base font-bold shadow-md transition"
          style={{
            backgroundColor: cor,
            boxShadow: `0 4px 12px ${corClara}55`,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = corHover)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = cor)}
        >
          <Calendar className="h-5 w-5" />
          Agendar horário
          <ArrowRight className="h-5 w-5" />
        </button>

        {/* Lista de unidades */}
        {data.unidades.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
              Nossas unidades
            </h2>
            <ul className="space-y-2">
              {data.unidades.map((u) => (
                <li
                  key={u.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3"
                >
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${corClara}40` }}
                  >
                    <MapPin className="h-5 w-5" style={{ color: cor }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{u.nome}</p>
                    {(u.endereco || u.bairro) && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {[u.endereco, u.bairro].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-center text-xs text-slate-400 pt-4">
          Powered by{' '}
          <Link to="/" className="font-semibold text-violet-600 hover:text-violet-700">
            AgendaInteligente
          </Link>
        </p>
      </main>
    </div>
  )
}

// Util simples para escurecer/clarear uma cor hex
function ajustarBrilho(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const r = Math.max(0, Math.min(255, (num >> 16) + amt))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt))
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amt))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
