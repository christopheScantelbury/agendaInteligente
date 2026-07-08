import { ReactNode } from 'react'

interface Props {
  /** Título principal (h1) — grande no desktop. */
  titulo: string
  /** Descrição curta abaixo do título. */
  descricao?: string
  /** Ícone opcional (lucide component) exibido antes do título. */
  icone?: React.ComponentType<{ className?: string }>
  /** Botões/ações do lado direito do header. */
  acoes?: ReactNode
  /** Conteúdo principal. */
  children: ReactNode
  /** max-width do container. Default 'max-w-7xl'. */
  maxWidth?: string
}

/**
 * Container padrão pra páginas de gestão na versão WEB (#166-#169).
 *
 * - `max-w-7xl` no container (mais largo que o padrão mobile `max-w-3xl`)
 * - Header com título grande + descrição + slot pra ações à direita
 * - Padding maior que o mobile: `p-6 xl:p-8`
 *
 * Usado dentro do bloco `{isWebLayout && (...)}` — mobile continua com o
 * container atual da tela.
 */
export default function WebPageShell({
  titulo,
  descricao,
  icone: Icone,
  acoes,
  children,
  maxWidth = 'max-w-7xl',
}: Props) {
  return (
    <div className={`${maxWidth} mx-auto p-6 xl:p-8 space-y-6`}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {Icone && (
            <div className="h-12 w-12 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center flex-shrink-0">
              <Icone className="h-6 w-6" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl xl:text-3xl font-bold text-slate-900 truncate">{titulo}</h1>
            {descricao && <p className="text-sm text-slate-500 mt-1">{descricao}</p>}
          </div>
        </div>
        {acoes && <div className="flex items-center gap-2 flex-wrap">{acoes}</div>}
      </header>
      {children}
    </div>
  )
}
