import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { UserRound, Loader2, ExternalLink, Mail, Plus, Briefcase } from 'lucide-react'
import { atendenteService } from '../../services/atendenteService'
import ConfigPageHeader from '../../components/configuracoes/ConfigPageHeader'
import ProximaEtapaCard from '../../components/configuracoes/ProximaEtapaCard'

export default function ProfissionaisConfig() {
  const navigate = useNavigate()

  const { data: atendentes = [], isLoading } = useQuery({
    queryKey: ['configuracoes', 'profissionais'],
    queryFn: () => atendenteService.listar(),
  })

  const totalAtivos = atendentes.filter((a: any) => a.ativo !== false).length

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <ConfigPageHeader />
      <header>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <UserRound className="h-6 w-6 text-violet-600" />
          Profissionais
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Profissionais são as pessoas que prestam atendimento. Cada um precisa ter uma conta
          de usuário no sistema, vinculada a uma ou mais unidades.
        </p>
      </header>

      {/* Como adicionar (2 caminhos) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => navigate('/configuracoes/equipe')}
          className="bg-white border border-violet-200 hover:border-violet-400 hover:shadow-sm rounded-2xl p-5 text-left transition"
        >
          <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center mb-3">
            <Mail className="h-5 w-5 text-violet-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">Convidar por link</h3>
          <p className="text-xs text-slate-600">
            Gere um link e envie. A pessoa se cadastra sozinha e já vira profissional.
          </p>
          <p className="text-xs font-semibold text-violet-700 mt-2">Recomendado →</p>
        </button>

        <button
          type="button"
          onClick={() => navigate('/profissionais')}
          className="bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm rounded-2xl p-5 text-left transition"
        >
          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
            <Plus className="h-5 w-5 text-slate-700" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">Cadastrar manualmente</h3>
          <p className="text-xs text-slate-600">
            Você define CPF, comissão, unidades e serviços que esse profissional pode atender.
          </p>
          <p className="text-xs font-semibold text-slate-700 mt-2">Tela completa →</p>
        </button>
      </section>

      {/* Lista de profissionais */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-700">
            Profissionais cadastrados {totalAtivos > 0 && <span className="text-slate-400">· {totalAtivos}</span>}
          </h2>
          <button
            type="button"
            onClick={() => navigate('/profissionais')}
            className="text-xs font-medium text-violet-700 hover:text-violet-900 inline-flex items-center gap-1"
          >
            Gerenciar todos <ExternalLink className="h-3 w-3" />
          </button>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center gap-2 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : atendentes.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-8 text-center">
            <UserRound className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Nenhum profissional cadastrado ainda.</p>
            <p className="text-xs text-slate-400 mt-1">Use uma das opções acima para começar.</p>
          </div>
        ) : (
          <ul className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100 overflow-hidden">
            {atendentes.slice(0, 10).map((a: any) => {
              const nome = a.nomeUsuario ?? `Profissional #${a.id}`
              const inicial = (nome.charAt(0) ?? '?').toUpperCase()
              return (
                <li key={a.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {inicial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{nome}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
                      {a.nomeUnidade && (
                        <>
                          <Briefcase className="h-3 w-3" /> {a.nomeUnidade}
                        </>
                      )}
                      {a.emailUsuario && (
                        <>
                          {a.nomeUnidade && <span>·</span>}
                          <span className="truncate">{a.emailUsuario}</span>
                        </>
                      )}
                    </p>
                  </div>
                  {a.ativo === false && (
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">
                      Inativo
                    </span>
                  )}
                </li>
              )
            })}
            {atendentes.length > 10 && (
              <li className="px-4 py-3 text-center text-xs text-slate-500">
                + {atendentes.length - 10} profissionais. Veja todos em{' '}
                <button
                  onClick={() => navigate('/profissionais')}
                  className="text-violet-700 font-medium hover:underline"
                >
                  Gerenciar profissionais
                </button>
              </li>
            )}
          </ul>
        )}
      </section>

      <ProximaEtapaCard tarefaAtualId="profissional" />
    </div>
  )
}
