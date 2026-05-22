import { useState } from 'react'
import { Search } from 'lucide-react'
import { useCategoria } from '../../hooks/useCategoria'
import ClienteGerenciamento from './tabs/ClienteGerenciamento'
import ClienteRetornos from './tabs/ClienteRetornos'
import ClienteSumidos from './tabs/ClienteSumidos'
import ClienteUnificarContatos from './tabs/ClienteUnificarContatos'

const TABS = [
  { id: 'gerenciamento', label: 'Gerenciamento' },
  { id: 'retornos', label: 'Retornos' },
  { id: 'sumidos', label: 'Sumidos' },
  { id: 'unificar', label: 'Unificar Contatos' },
] as const

type TabId = typeof TABS[number]['id']

export default function ClientesPage() {
  const { dict } = useCategoria()
  const [activeTab, setActiveTab] = useState<TabId>('gerenciamento')
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <div className="w-full space-y-4">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">{dict.rotuloClientePlural}</h1>
        {activeTab === 'gerenciamento' && (
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-700 text-gray-200 border border-gray-600 rounded-md pl-9 pr-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <nav className="-mb-px flex gap-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'gerenciamento' && <ClienteGerenciamento searchTerm={searchTerm} />}
        {activeTab === 'retornos' && <ClienteRetornos />}
        {activeTab === 'sumidos' && <ClienteSumidos />}
        {activeTab === 'unificar' && <ClienteUnificarContatos />}
      </div>
    </div>
  )
}
