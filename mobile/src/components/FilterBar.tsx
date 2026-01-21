import React, { useState } from 'react'
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

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
    <View style={styles.container}>
      {showSearch && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchValue}
            onChangeText={handleSearchChange}
            placeholder={searchPlaceholder}
            placeholderTextColor="#9CA3AF"
          />
          {searchValue ? (
            <TouchableOpacity onPress={() => handleSearchChange('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {filters.length > 0 && (
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterButton, (showFilters || hasActiveFilters) && styles.filterButtonActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons name="filter" size={18} color={(showFilters || hasActiveFilters) ? '#2563EB' : '#6B7280'} />
            <Text style={[styles.filterButtonText, (showFilters || hasActiveFilters) && styles.filterButtonTextActive]}>
              Filtros
            </Text>
            {hasActiveFilters && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {Object.values(filterValues).filter(v => v !== '' && v !== false && v !== null).length + (searchValue ? 1 : 0)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          {hasActiveFilters && (
            <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersButton}>
              <Text style={styles.clearFiltersText}>Limpar</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Modal
        visible={showFilters}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {filters.map((filter) => (
                <View key={filter.key} style={styles.filterItem}>
                  <Text style={styles.filterLabel}>{filter.label}</Text>
                  {filter.type === 'select' && (
                    <View style={styles.selectContainer}>
                      {filter.options?.map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.selectOption,
                            filterValues[filter.key] === option.value && styles.selectOptionActive,
                          ]}
                          onPress={() => handleFilterChange(filter.key, option.value === '' ? null : option.value)}
                        >
                          <Text
                            style={[
                              styles.selectOptionText,
                              filterValues[filter.key] === option.value && styles.selectOptionTextActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                          {filterValues[filter.key] === option.value && (
                            <Ionicons name="checkmark" size={18} color="#2563EB" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {filter.type === 'checkbox' && (
                    <TouchableOpacity
                      style={styles.checkboxContainer}
                      onPress={() => handleFilterChange(filter.key, !filterValues[filter.key])}
                    >
                      <View style={[styles.checkbox, filterValues[filter.key] && styles.checkboxChecked]}>
                        {filterValues[filter.key] && (
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        )}
                      </View>
                      <Text style={styles.checkboxLabel}>Ativo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.applyButton} onPress={() => setShowFilters(false)}>
                <Text style={styles.applyButtonText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#1F2937',
  },
  clearButton: {
    padding: 4,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  filterButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#2563EB',
  },
  badge: {
    marginLeft: 6,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  clearFiltersButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  clearFiltersText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalBody: {
    padding: 16,
  },
  filterItem: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  selectContainer: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  selectOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  selectOptionActive: {
    backgroundColor: '#EFF6FF',
  },
  selectOptionText: {
    fontSize: 14,
    color: '#1F2937',
  },
  selectOptionTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#1F2937',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  applyButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
})
