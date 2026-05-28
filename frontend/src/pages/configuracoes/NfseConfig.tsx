import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Building2, CheckCircle2, AlertCircle, FileText, ExternalLink, Loader2 } from 'lucide-react'
import { unidadeService } from '../../services/unidadeService'
import ConfigPageHeader from '../../components/configuracoes/ConfigPageHeader'
import ProximaEtapaCard from '../../components/configuracoes/ProximaEtapaCard'

export default function NfseConfig() {
  const navigate = useNavigate()

  const { data: unidades = [], isLoading, error } = useQuery({
    queryKey: ['configuracoes', 'nfse', 'unidades'],
    queryFn: () => unidadeService.listar(),
  })

  const configuradas = unidades.filter((u: any) => u.inscricaoMunicipal && u.inscricaoMunicipal.trim() !== '')
  const pendentes = unidades.filter((u: any) => !u.inscricaoMunicipal || u.inscricaoMunicipal.trim() === '')

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <ConfigPageHeader />
      <header>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileText className="h-6 w-6 text-violet-600" />
          Emissão de NFS-e
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Configure os dados fiscais para emitir Notas Fiscais de Serviço eletrônicas
          automaticamente após cada atendimento concluído.
        </p>
      </header>

      {/* Explicação */}
      <section className="bg-blue-50 border border-blue-200 rounded-2xl p-4 sm:p-5">
        <p className="text-sm text-blue-900 font-semibold mb-2">📋 O que é necessário?</p>
        <ul className="text-sm text-blue-800 space-y-1.5 list-disc list-inside">
          <li>Cada unidade precisa ter <strong>Inscrição Municipal</strong> e <strong>CNPJ</strong> cadastrados.</li>
          <li>O CNPJ precisa estar habilitado para emissão de NFS-e na prefeitura.</li>
          <li>A integração é feita via <em>Nota MEI Gateway</em> (NotaFácil).</li>
        </ul>
      </section>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando unidades…
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-900">Não foi possível carregar as unidades.</p>
        </div>
      ) : unidades.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-600 mb-4">Nenhuma unidade cadastrada ainda.</p>
          <button
            type="button"
            onClick={() => navigate('/unidades')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition"
          >
            Cadastrar unidade <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-emerald-700 mb-1">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Configuradas</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{configuradas.length}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-amber-700 mb-1">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Pendentes</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{pendentes.length}</p>
            </div>
          </div>

          {/* Lista de unidades */}
          <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <h2 className="px-4 sm:px-5 pt-4 pb-2 text-sm font-semibold text-slate-700">
              Suas unidades
            </h2>
            <ul className="divide-y divide-gray-100">
              {unidades.map((u: any) => {
                const ok = !!(u.inscricaoMunicipal && u.inscricaoMunicipal.trim())
                return (
                  <li key={u.id} className="px-4 sm:px-5 py-3 flex items-center gap-3">
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                        ok ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                      }`}
                    >
                      {ok ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{u.nome}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {ok
                          ? `Inscrição: ${u.inscricaoMunicipal}`
                          : 'Inscrição municipal não cadastrada'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/unidades`)}
                      className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
                    >
                      Editar <ExternalLink className="h-3 w-3" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          {/* Dica final */}
          {pendentes.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600">
              💡 Após preencher a Inscrição Municipal de todas as unidades, esta etapa do
              checklist será marcada como concluída automaticamente.
            </div>
          )}

          <ProximaEtapaCard tarefaAtualId="fiscal" />
        </>
      )}
    </div>
  )
}
