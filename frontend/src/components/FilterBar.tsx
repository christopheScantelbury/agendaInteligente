import { Search, X, Filter } from 'lucide-react'
import { useState } from 'react'

interface FilterBarProps {
  onSearchChange?: (value: string) => void
  onFilterChange?: (filters: Record<string, any>) => void
  searchPlaceholder?: string
  filters?: FilterConfig[]
  showSearch?: boolean
}

interface FilterConfig {
  key: string
  label: string
  type: 'select' | 'checkbox' | 'date'
  options?: { value: string; label: string }[]
}

export default function FilterBar({
  onSearchChange,
  onFilterChange,
  searchPlaceholder = 'Buscar...',
  filters = [],
  showSearch = true,
}: FilterBarProps) {
  const [searchValue, setSearchValue] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, any>>({})
  const [showFilters, setShowFilters] = useState(false)

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    onSearchChange?.(value)
  }

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filterValues, [key]: value }
    setFilterValues(newFilters)
    onFilterChange?.(newFilters)
  }

  const clearFilters = () => {
    setSearchValue('')
    setFilterValues({})
    onSearchChange?.('')
    onFilterChange?.({})
  }

  const hasActiveFilters = searchValue || Object.values(filterValues).some(v => v !== '' && v !== false && v !== null)

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4 border border-gray-200">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Barra de Busca */}
        {showSearch && (
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchValue && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Botão de Filtros */}
        {filters.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
              {hasActiveFilters && (
                <span className="bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {Object.values(filterValues).filter(v => v !== '' && v !== false && v !== null).length + (searchValue ? 1 : 0)}
                </span>
              )}
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">Limpar</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Painel de Filtros */}
      {showFilters && filters.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map((filter) => (
              <div key={filter.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {filter.label}
                </label>
                {filter.type === 'select' && (
                  <select
                    value={filterValues[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Todos</option>
                    {filter.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
                {filter.type === 'checkbox' && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filterValues[filter.key] || false}
                      onChange={(e) => handleFilterChange(filter.key, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Ativo</span>
                  </label>
                )}
                {filter.type === 'date' && (
                  <input
                    type="date"
                    value={filterValues[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
