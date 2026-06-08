import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Tags, ArrowLeft, Save, Loader2 } from 'lucide-react'
import { planoService, Plano, formatPrecoMensal } from '../../services/planoService'
import { authService } from '../../services/authService'
import { useNotification } from '../../contexts/NotificationContext'
import MoneyInput from '../../components/forms/MoneyInput'
import { getApiErrorMessage } from '../../utils/apiError'

/**
 * Editor de planos comerciais. Apenas ADMIN GLOBAL acessa.
 * Nome técnico (TRIAL/STARTER/PRO/BUSINESS) é imutável — código referencia
 * planos por nome em ConviteService.findByNome("TRIAL").
 */
export default function PlanosAdmin() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const usuario = authService.getUsuario()
  const perfil = (usuario?.perfil ?? '').toUpperCase()
  const isAdminGlobal = perfil === 'ADMIN'

  useEffect(() => {
    if (!isAdminGlobal) {
      navigate('/')
    }
  }, [isAdminGlobal, navigate])

  const { data: planos = [], isLoading } = useQuery({
    queryKey: ['planos'],
    queryFn: planoService.listar,
    enabled: isAdminGlobal,
  })

  if (!isAdminGlobal) return null

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
      <header className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-slate-100 text-slate-600"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="h-12 w-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0">
          <Tags className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Planos</h1>
          <p className="text-sm text-slate-500">Editor de planos comerciais — visível pra todos os clientes via landing e cadastro.</p>
        </div>
      </header>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900">
        ⚠️ <strong>Atenção:</strong> mudanças aqui afetam imediatamente:
        <ul className="list-disc list-inside mt-1 space-y-0.5">
          <li>Cards de plano na Landing Page (preço/limites mostrados)</li>
          <li>Seletor de plano no cadastro de ADMINISTRADOR via convite</li>
          <li>Cota de NFS-e por mês (limite + excedente cobrado)</li>
        </ul>
        Nome técnico (TRIAL/STARTER/PRO/BUSINESS) é imutável — só edite preço, descrição e limites.
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </div>
      ) : (
        <div className="space-y-4">
          {planos.map((plano) => (
            <PlanoEditCard
              key={plano.id}
              plano={plano}
              onSaved={() => queryClient.invalidateQueries({ queryKey: ['planos'] })}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PlanoEditCard({ plano, onSaved }: { plano: Plano; onSaved: () => void }) {
  const { showNotification } = useNotification()
  const [form, setForm] = useState<Plano>(plano)
  const dirty = JSON.stringify(form) !== JSON.stringify(plano)

  const saveMutation = useMutation({
    mutationFn: () => planoService.atualizar(plano.id, form),
    onSuccess: () => {
      showNotification('success', `Plano ${plano.nomePublico} atualizado — vai aparecer na landing em até 30s ou após próximo carregamento`)
      onSaved()
    },
    onError: (e) => showNotification('error', getApiErrorMessage(e, 'Erro ao salvar plano')),
  })

  // null = ilimitado; null != undefined no input pra distinguir vazio de explícito
  const limitInput = (
    valor: number | null | undefined,
    setter: (n: number | null) => void,
    placeholder: string,
  ) => (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min={0}
        value={valor ?? ''}
        onChange={(e) => setter(e.target.value === '' ? null : Number(e.target.value))}
        placeholder={placeholder}
        className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
      />
      {valor == null && <span className="text-xs text-violet-700 font-semibold">∞</span>}
    </div>
  )

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{plano.nomePublico}</h2>
          <p className="text-xs text-slate-400 font-mono">{plano.nome}</p>
        </div>
        <span className="text-sm text-slate-500">{formatPrecoMensal(form.precoMensalBrl)}/mês</span>
      </div>

      {plano.nome === 'TRIAL' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
          ℹ️ <strong>Sobre o Trial:</strong> ele <em>não aparece</em> como card de venda na landing
          (os 3 cards são Starter/Pro/Business). O que você edita aqui afeta:
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li><strong>Duração:</strong> dias de teste após o cadastro de nova empresa</li>
            <li><strong>Preço:</strong> se {'>'}{' '}R$ 0, o texto do rodapé da landing muda de <em>"Trial gratuito"</em> para <em>"Trial por R$ X"</em></li>
            <li><strong>Limites (unidades/profissionais/agendamentos/NFS-e):</strong> o que o cliente pode usar durante o teste</li>
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Nome público</label>
          <input
            type="text"
            value={form.nomePublico}
            onChange={(e) => setForm({ ...form, nomePublico: e.target.value })}
            className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Preço mensal</label>
          <MoneyInput
            value={form.precoMensalBrl}
            onChange={(v) => setForm({ ...form, precoMensalBrl: v })}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Descrição</label>
        <textarea
          rows={2}
          value={form.descricao ?? ''}
          onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Unidades (vazio = ∞)</label>
          {limitInput(form.limiteUnidades, (n) => setForm({ ...form, limiteUnidades: n }), '∞')}
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Profissionais</label>
          {limitInput(form.limiteProfissionais, (n) => setForm({ ...form, limiteProfissionais: n }), '∞')}
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Agend/mês</label>
          {limitInput(form.limiteAgendamentosMes, (n) => setForm({ ...form, limiteAgendamentosMes: n }), '∞')}
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">NFS-e/mês</label>
          <input
            type="number"
            min={0}
            value={form.limiteNfseMes}
            onChange={(e) => setForm({ ...form, limiteNfseMes: Number(e.target.value) || 0 })}
            className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Excedente NFS-e (R$/nota)</label>
          <MoneyInput
            value={form.precoExcedenteNfseBrl}
            onChange={(v) => setForm({ ...form, precoExcedenteNfseBrl: v })}
          />
        </div>
        {plano.nome === 'TRIAL' && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Duração do trial (dias)</label>
            <input
              type="number"
              min={1}
              max={90}
              value={form.duracaoTrialDias ?? 14}
              onChange={(e) => setForm({ ...form, duracaoTrialDias: Number(e.target.value) || 14 })}
              className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.ativo}
            onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
          />
          Plano ativo (visível pra novos clientes)
        </label>
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={!dirty || saveMutation.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm shadow-violet-200"
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </button>
      </div>
    </section>
  )
}
