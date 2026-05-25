import { Calendar } from 'lucide-react'

export default function AgendaProfissional() {
  return (
    <div className="px-4 py-8 max-w-md mx-auto text-center">
      <div className="mx-auto w-14 h-14 rounded-full bg-violet-50 flex items-center justify-center mb-4">
        <Calendar className="h-7 w-7 text-violet-600" />
      </div>
      <h1 className="text-xl font-bold text-slate-900">Próximos 7 dias</h1>
      <p className="text-sm text-gray-500 mt-2">
        Lista de dias chega na story #90.
      </p>
    </div>
  )
}
