import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, TextInput, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import FormField from './FormField'
import { Picker } from '@react-native-picker/picker'
import DateTimePicker from '@react-native-community/datetimepicker'

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

export default function RecorrenciaConfig({ value, onChange }: RecorrenciaConfigProps) {
  const [config, setConfig] = useState<RecorrenciaConfig>({
    recorrente: false,
    tipoRecorrencia: 'SEMANAL',
    diasDaSemana: [],
    tipoTermino: 'OCORRENCIAS',
    numeroOcorrencias: 4,
    intervalo: 1,
    ...value,
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
      <View style={styles.container}>
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Criar agendamento recorrente</Text>
          <Switch
            value={config.recorrente}
            onValueChange={(value) => setConfig({ ...config, recorrente: value })}
            trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
            thumbColor={config.recorrente ? '#ffffff' : '#f3f4f6'}
          />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Ionicons name="repeat" size={20} color="#3b82f6" />
          <Text style={styles.title}>Configuração de Recorrência</Text>
        </View>
        <Switch
          value={config.recorrente}
          onValueChange={(value) => setConfig({ ...config, recorrente: value })}
          trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
          thumbColor={config.recorrente ? '#ffffff' : '#f3f4f6'}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Tipo de Recorrência */}
        <FormField label="Frequência">
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[
                styles.frequencyButton,
                config.tipoRecorrencia === 'DIARIA' && styles.frequencyButtonActive,
              ]}
              onPress={() => handleTipoRecorrenciaChange('DIARIA')}
            >
              <Text
                style={[
                  styles.frequencyButtonText,
                  config.tipoRecorrencia === 'DIARIA' && styles.frequencyButtonTextActive,
                ]}
              >
                Diária
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.frequencyButton,
                config.tipoRecorrencia === 'SEMANAL' && styles.frequencyButtonActive,
              ]}
              onPress={() => handleTipoRecorrenciaChange('SEMANAL')}
            >
              <Text
                style={[
                  styles.frequencyButtonText,
                  config.tipoRecorrencia === 'SEMANAL' && styles.frequencyButtonTextActive,
                ]}
              >
                Semanal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.frequencyButton,
                config.tipoRecorrencia === 'MENSAL' && styles.frequencyButtonActive,
              ]}
              onPress={() => handleTipoRecorrenciaChange('MENSAL')}
            >
              <Text
                style={[
                  styles.frequencyButtonText,
                  config.tipoRecorrencia === 'MENSAL' && styles.frequencyButtonTextActive,
                ]}
              >
                Mensal
              </Text>
            </TouchableOpacity>
          </View>
        </FormField>

        {/* Dias da Semana (apenas para SEMANAL) */}
        {config.tipoRecorrencia === 'SEMANAL' && (
          <FormField label="Dias da Semana">
            <View style={styles.daysContainer}>
              {DIAS_SEMANA.map((dia) => {
                const selecionado = config.diasDaSemana?.includes(dia.value)
                return (
                  <TouchableOpacity
                    key={dia.value}
                    style={[
                      styles.dayButton,
                      selecionado && styles.dayButtonActive,
                    ]}
                    onPress={() => toggleDiaSemana(dia.value)}
                  >
                    <Text
                      style={[
                        styles.dayButtonText,
                        selecionado && styles.dayButtonTextActive,
                      ]}
                    >
                      {dia.short}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            {config.diasDaSemana && config.diasDaSemana.length === 0 && (
              <Text style={styles.errorText}>Selecione pelo menos um dia</Text>
            )}
          </FormField>
        )}

        {/* Intervalo */}
        {config.tipoRecorrencia !== 'DIARIA' && (
          <FormField
            label={`A cada quantas ${config.tipoRecorrencia === 'SEMANAL' ? 'semanas' : 'meses'}?`}
          >
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={config.intervalo || 1}
                onValueChange={(value) =>
                  setConfig({
                    ...config,
                    intervalo: Math.max(1, value || 1),
                  })
                }
                style={styles.picker}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <Picker.Item key={num} label={num.toString()} value={num} />
                ))}
              </Picker>
            </View>
          </FormField>
        )}

        {/* Tipo de Término */}
        <FormField label="Término">
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[
                styles.terminoButton,
                config.tipoTermino === 'INFINITA' && styles.terminoButtonActive,
              ]}
              onPress={() => handleTipoTerminoChange('INFINITA')}
            >
              <Text
                style={[
                  styles.terminoButtonText,
                  config.tipoTermino === 'INFINITA' && styles.terminoButtonTextActive,
                ]}
              >
                Infinita
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.terminoButton,
                config.tipoTermino === 'DATA' && styles.terminoButtonActive,
              ]}
              onPress={() => handleTipoTerminoChange('DATA')}
            >
              <Text
                style={[
                  styles.terminoButtonText,
                  config.tipoTermino === 'DATA' && styles.terminoButtonTextActive,
                ]}
              >
                Até Data
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.terminoButton,
                config.tipoTermino === 'OCORRENCIAS' && styles.terminoButtonActive,
              ]}
              onPress={() => handleTipoTerminoChange('OCORRENCIAS')}
            >
              <Text
                style={[
                  styles.terminoButtonText,
                  config.tipoTermino === 'OCORRENCIAS' && styles.terminoButtonTextActive,
                ]}
              >
                N Ocorrências
              </Text>
            </TouchableOpacity>
          </View>
        </FormField>

        {/* Data de Término */}
        {config.tipoTermino === 'DATA' && (
          <DataTerminoPicker
            value={config.dataTermino}
            onChange={(dataTermino) =>
              setConfig({
                ...config,
                dataTermino,
              })
            }
          />
        )}

        {/* Número de Ocorrências */}
        {config.tipoTermino === 'OCORRENCIAS' && (
          <FormField label="Número de Ocorrências">
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={config.numeroOcorrencias || 4}
                onValueChange={(value) =>
                  setConfig({
                    ...config,
                    numeroOcorrencias: Math.max(1, value || 1),
                  })
                }
                style={styles.picker}
              >
                {Array.from({ length: 52 }, (_, i) => i + 1).map((num) => (
                  <Picker.Item key={num} label={num.toString()} value={num} />
                ))}
              </Picker>
            </View>
          </FormField>
        )}

        {/* Resumo */}
        <View style={styles.resumoContainer}>
          <Text style={styles.resumoTitle}>Resumo:</Text>
          <Text style={styles.resumoText}>{getResumoRecorrencia(config)}</Text>
        </View>
      </ScrollView>
    </View>
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
        .map((d) => DIAS_SEMANA.find((ds) => ds.value === d)?.short)
        .filter(Boolean)
        .join(', ')
      frequencia =
        intervalo === 1
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

function DataTerminoPicker({
  value,
  onChange,
}: {
  value?: string
  onChange: (value: string) => void
}) {
  const [showPicker, setShowPicker] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(
    value ? new Date(value) : new Date()
  )

  const onDateChange = (event: any, date?: Date) => {
    setShowPicker(Platform.OS === 'ios')
    if (date) {
      setSelectedDate(date)
      onChange(date.toISOString().split('T')[0])
    }
  }

  return (
    <FormField label="Data de Término">
      <TouchableOpacity
        style={styles.inputContainer}
        onPress={() => setShowPicker(true)}
      >
        <Ionicons name="calendar-outline" size={20} color="#6b7280" style={styles.inputIcon} />
        <Text style={styles.dateInputText}>
          {value
            ? new Date(value).toLocaleDateString('pt-BR')
            : 'Selecione uma data'}
        </Text>
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          minimumDate={new Date()}
          locale="pt-BR"
        />
      )}
    </FormField>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  frequencyButton: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  frequencyButtonActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  frequencyButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  frequencyButtonTextActive: {
    color: '#1e40af',
    fontWeight: '600',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    minWidth: 60,
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb',
  },
  dayButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  dayButtonTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  terminoButton: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  terminoButtonActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  terminoButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  terminoButtonTextActive: {
    color: '#1e40af',
    fontWeight: '600',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  picker: {
    height: 50,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
  },
  inputIcon: {
    marginRight: 8,
  },
  dateInputText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  resumoContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  resumoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e3a8a',
    marginBottom: 4,
  },
  resumoText: {
    fontSize: 14,
    color: '#1e40af',
  },
})
