import { Sun } from 'lucide-react'

export default function HojeProfissional() {
  return (
    <div className="px-4 py-8 max-w-md mx-auto text-center">
      <div className="mx-auto w-14 h-14 rounded-full bg-violet-50 flex items-center justify-center mb-4">
        <Sun className="h-7 w-7 text-violet-600" />
      </div>
      <h1 className="text-xl font-bold text-slate-900">Modo Dia</h1>
      <p className="text-sm text-gray-500 mt-2">
        Timeline e ações rápidas chegam na próxima story (#88).
      </p>
    </div>
  )
}
