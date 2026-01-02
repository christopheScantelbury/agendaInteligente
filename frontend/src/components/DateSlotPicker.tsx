import { useState, useMemo } from 'react'
import { format, addDays, startOfDay, isSameDay, isBefore, addWeeks, subWeeks } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react'

interface DateSlotPickerProps {
    selectedDate: Date
    onDateSelect: (date: Date) => void
    slots: {
        dataHoraInicio: string;
        dataHoraFim?: string;
        atendenteNome?: string;
        [key: string]: any
    }[]
    onSlotSelect: (slot: any) => void
    selectedSlot: any | null
    loading?: boolean
}

export default function DateSlotPicker({
    selectedDate,
    onDateSelect,
    slots,
    onSlotSelect,
    selectedSlot,
    loading = false
}: DateSlotPickerProps) {
    const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfDay(new Date()))

    // Generate days for the current view (1 week)
    const daysInView = useMemo(() => {
        const days = []
        for (let i = 0; i < 7; i++) {
            days.push(addDays(currentWeekStart, i))
        }
        return days
    }, [currentWeekStart])

    const nextWeek = () => setCurrentWeekStart(d => addWeeks(d, 1))
    const prevWeek = () => {
        const newDate = subWeeks(currentWeekStart, 1)
        if (!isBefore(newDate, startOfDay(new Date()))) {
            setCurrentWeekStart(newDate)
        }
    }

    // Group slots by period for better UX
    const slotsByPeriod = useMemo(() => {
        const morning: any[] = []
        const afternoon: any[] = []
        const evening: any[] = []

        slots.forEach(slot => {
            const date = new Date(slot.dataHoraInicio)
            const hour = date.getHours()

            if (hour < 12) morning.push(slot)
            else if (hour < 18) afternoon.push(slot)
            else evening.push(slot)
        })

        return { morning, afternoon, evening }
    }, [slots])

    const formatTime = (isoString: string) => {
        return format(new Date(isoString), 'HH:mm')
    }

    return (
        <div className="space-y-6">
            {/* Date Selector */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-indigo-600" />
                        Selecione a Data
                    </h3>
                    <div className="flex gap-2">
                        <button
                            onClick={prevWeek}
                            disabled={isSameDay(currentWeekStart, startOfDay(new Date()))}
                            className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30 transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <button
                            onClick={nextWeek}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ChevronRight className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-2">
                    {daysInView.map((date) => {
                        const isSelected = isSameDay(date, selectedDate)
                        const isToday = isSameDay(date, new Date())
                        const isPast = isBefore(date, startOfDay(new Date()))

                        return (
                            <button
                                key={date.toISOString()}
                                onClick={() => !isPast && onDateSelect(date)}
                                disabled={isPast}
                                className={`
                  flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200
                  ${isSelected
                                        ? 'bg-indigo-600 text-white shadow-md scale-105'
                                        : isPast
                                            ? 'opacity-40 cursor-not-allowed bg-gray-50'
                                            : 'hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 border border-transparent hover:border-indigo-100'
                                    }
                `}
                            >
                                <span className="text-xs font-medium uppercase mb-1">
                                    {format(date, 'EEE', { locale: ptBR })}
                                </span>
                                <span className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                                    {format(date, 'dd')}
                                </span>
                                {isToday && (
                                    <span className={`w-1 h-1 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-indigo-500'}`} />
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Slots Selector */}
            <div className="animate-fadeIn">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    Horários Disponíveis
                    {loading && <span className="text-sm font-normal text-gray-500 ml-2">(Buscando...)</span>}
                </h3>

                {loading ? (
                    <div className="grid grid-cols-3 gap-3">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : slots.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <p className="text-gray-500">Nenhum horário disponível para esta data.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {[
                            { label: 'Manhã', icon: '🌅', items: slotsByPeriod.morning },
                            { label: 'Tarde', icon: '☀️', items: slotsByPeriod.afternoon },
                            { label: 'Noite', icon: '🌙', items: slotsByPeriod.evening }
                        ].map(period => period.items.length > 0 && (
                            <div key={period.label}>
                                <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                                    <span>{period.icon}</span> {period.label}
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {period.items.map((slot, idx) => (
                                        <button
                                            key={`${slot.dataHoraInicio}-${idx}`}
                                            onClick={() => onSlotSelect(slot)}
                                            className={`
                        relative px-4 py-3 rounded-lg border text-sm font-medium transition-all duration-200
                        flex flex-col items-center gap-1
                        ${selectedSlot?.dataHoraInicio === slot.dataHoraInicio
                                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-600'
                                                    : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:shadow-sm'
                                                }
                      `}
                                        >
                                            <span className="text-base font-bold">
                                                {formatTime(slot.dataHoraInicio)}
                                            </span>
                                            {slot.atendenteNome && (
                                                <span className="text-[10px] text-gray-500 truncate max-w-full">
                                                    {slot.atendenteNome.split(' ')[0]}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
