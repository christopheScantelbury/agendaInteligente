import React, { useState, useEffect } from 'react'
import FormField from './FormField'
import { Repeat, X } from 'lucide-react'

export interface RecorrenciaConfig {
  recorrente: boolean
  tipoRecorrencia?: 'DIARIA' | 'SEMANAL' | 'MENSAL'
  diasDaSemana?: number[] // 1-7 (Segunda-Domingo)
  tipoTermino?: 'INFINITA' | 'DATA' | 'OCORRENCIAS'
  dataTermino?: string
  numeroOcorrencias?: number
  intervalo?: number
}

interface RecorrenciaConfigProps {
  value: RecorrenciaConfig
  onChange: (config: RecorrenciaConfig) => void
  onClose?: () => void
}

const DIAS_SEMANA = [
  { value: 1, label: 'Segunda', short: 'Seg' },
  { value: 2, label: 'Terça', short: 'Ter' },
  { value: 3, label: 'Quarta', short: 'Qua' },
  { value: 4, label: 'Quinta', short: 'Qui' },
  { value: 5, label: 'Sexta', short: 'Sex' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
  { value: 7, label: 'Domingo', short: 'Dom' },
]

export default function RecorrenciaConfig({ value, onChange, onClose }: RecorrenciaConfigProps) {
  const [config, setConfig] = useState<RecorrenciaConfig>({
    tipoRecorrencia: 'SEMANAL',
    diasDaSemana: [],
    tipoTermino: 'OCORRENCIAS',
    numeroOcorrencias: 4,
    intervalo: 1,
    ...value,
    recorrente: value.recorrente ?? false,
  })

  useEffect(() => {
    onChange(config)
  }, [config, onChange])

  const toggleDiaSemana = (dia: number) => {
    const dias = config.diasDaSemana || []
    const novosDias = dias.includes(dia)
      ? dias.filter(d => d !== dia)
      : [...dias, dia].sort()
    setConfig({ ...config, diasDaSemana: novosDias })
  }

  const handleTipoRecorrenciaChange = (tipo: 'DIARIA' | 'SEMANAL' | 'MENSAL') => {
    setConfig({
      ...config,
      tipoRecorrencia: tipo,
      diasDaSemana: tipo === 'SEMANAL' ? config.diasDaSemana : undefined,
    })
  }

  const handleTipoTerminoChange = (tipo: 'INFINITA' | 'DATA' | 'OCORRENCIAS') => {
    setConfig({
      ...config,
      tipoTermino: tipo,
      dataTermino: tipo === 'DATA' ? config.dataTermino : undefined,
      numeroOcorrencias: tipo === 'OCORRENCIAS' ? config.numeroOcorrencias : undefined,
    })
  }

  if (!config.recorrente) {
    return (
      <div className="border rounded-lg p-4 bg-gray-50">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.recorrente}
            onChange={(e) => setConfig({ ...config, recorrente: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="flex items-center gap-2 text-gray-700">
            <Repeat className="w-4 h-4" />
            Criar agendamento recorrente
          </span>
        </label>
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Repeat className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Configuração de Recorrência</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Tipo de Recorrência */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Frequência
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleTipoRecorrenciaChange('DIARIA')}
            className={`px-4 py-2 rounded-lg border transition-all ${
              config.tipoRecorrencia === 'DIARIA'
                ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Diária
          </button>
          <button
            type="button"
            onClick={() => handleTipoRecorrenciaChange('SEMANAL')}
            className={`px-4 py-2 rounded-lg border transition-all ${
              config.tipoRecorrencia === 'SEMANAL'
                ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Semanal
          </button>
          <button
            type="button"
            onClick={() => handleTipoRecorrenciaChange('MENSAL')}
            className={`px-4 py-2 rounded-lg border transition-all ${
              config.tipoRecorrencia === 'MENSAL'
                ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Mensal
          </button>
        </div>
      </div>

      {/* Dias da Semana (apenas para SEMANAL) */}
      {config.tipoRecorrencia === 'SEMANAL' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dias da Semana
          </label>
          <div className="flex flex-wrap gap-2">
            {DIAS_SEMANA.map((dia) => {
              const selecionado = config.diasDaSemana?.includes(dia.value)
              return (
                <button
                  key={dia.value}
                  type="button"
                  onClick={() => toggleDiaSemana(dia.value)}
                  className={`px-3 py-2 rounded-lg border transition-all ${
                    selecionado
                      ? 'bg-blue-500 border-blue-600 text-white font-medium'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {dia.short}
                </button>
              )
            })}
          </div>
          {config.diasDaSemana && config.diasDaSemana.length === 0 && (
            <p className="text-sm text-red-500 mt-1">Selecione pelo menos um dia</p>
          )}
        </div>
      )}

      {/* Intervalo */}
      {config.tipoRecorrencia !== 'DIARIA' && (
        <div className="mb-4">
          <FormField
            label={`A cada quantas ${config.tipoRecorrencia === 'SEMANAL' ? 'semanas' : 'meses'}?`}
          >
            <input
              type="number"
              value={config.intervalo || 1}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setConfig({
                  ...config,
                  intervalo: Math.max(1, parseInt(e.target.value) || 1),
                })
              }
              min={1}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </FormField>
        </div>
      )}

      {/* Tipo de Término */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Término
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleTipoTerminoChange('INFINITA')}
            className={`px-4 py-2 rounded-lg border transition-all ${
              config.tipoTermino === 'INFINITA'
                ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Infinita
          </button>
          <button
            type="button"
            onClick={() => handleTipoTerminoChange('DATA')}
            className={`px-4 py-2 rounded-lg border transition-all ${
              config.tipoTermino === 'DATA'
                ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Até Data
          </button>
          <button
            type="button"
            onClick={() => handleTipoTerminoChange('OCORRENCIAS')}
            className={`px-4 py-2 rounded-lg border transition-all ${
              config.tipoTermino === 'OCORRENCIAS'
                ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            N Ocorrências
          </button>
        </div>
      </div>

      {/* Data de Término */}
      {config.tipoTermino === 'DATA' && (
        <div className="mb-4">
          <FormField label="Data de Término">
            <input
              type="date"
              value={config.dataTermino || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setConfig({
                  ...config,
                  dataTermino: e.target.value,
                })
              }
              min={new Date().toISOString().split('T')[0]}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </FormField>
        </div>
      )}

      {/* Número de Ocorrências */}
      {config.tipoTermino === 'OCORRENCIAS' && (
        <div className="mb-4">
          <FormField label="Número de Ocorrências">
            <input
              type="number"
              value={config.numeroOcorrencias || 4}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setConfig({
                  ...config,
                  numeroOcorrencias: Math.max(1, parseInt(e.target.value) || 1),
                })
              }
              min={1}
              max={365}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </FormField>
        </div>
      )}

      {/* Resumo */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-gray-700">
          <strong>Resumo:</strong>{' '}
          {getResumoRecorrencia(config)}
        </p>
      </div>
    </div>
  )
}

function getResumoRecorrencia(config: RecorrenciaConfig): string {
  if (!config.recorrente) return 'Agendamento único'

  const tipo = config.tipoRecorrencia
  const dias = config.diasDaSemana || []
  const intervalo = config.intervalo || 1

  let frequencia = ''
  if (tipo === 'DIARIA') {
    frequencia = intervalo === 1 ? 'Todos os dias' : `A cada ${intervalo} dias`
  } else if (tipo === 'SEMANAL') {
    if (dias.length === 0) {
      frequencia = 'Selecione os dias'
    } else {
      const diasLabels = dias
        .map(d => DIAS_SEMANA.find(ds => ds.value === d)?.short)
        .filter(Boolean)
        .join(', ')
      frequencia = intervalo === 1
        ? `Toda semana: ${diasLabels}`
        : `A cada ${intervalo} semanas: ${diasLabels}`
    }
  } else if (tipo === 'MENSAL') {
    frequencia = intervalo === 1 ? 'Todo mês' : `A cada ${intervalo} meses`
  }

  let termino = ''
  if (config.tipoTermino === 'INFINITA') {
    termino = ' (sem data de término)'
  } else if (config.tipoTermino === 'DATA' && config.dataTermino) {
    const data = new Date(config.dataTermino)
    termino = ` até ${data.toLocaleDateString('pt-BR')}`
  } else if (config.tipoTermino === 'OCORRENCIAS' && config.numeroOcorrencias) {
    termino = ` (${config.numeroOcorrencias} ocorrências)`
  }

  return frequencia + termino
}
