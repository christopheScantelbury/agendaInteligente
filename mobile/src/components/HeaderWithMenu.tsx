import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import DrawerMenu from './DrawerMenu'
import { useDrawer } from '../contexts/DrawerContext'

interface HeaderWithMenuProps {
  title: string
}

export default function HeaderWithMenu({ title }: HeaderWithMenuProps) {
  const { isOpen, openDrawer, closeDrawer } = useDrawer()

  const handleMenuPress = () => {
    console.log('Menu button pressed, opening drawer...')
    try {
      openDrawer()
      console.log('Drawer opened successfully')
    } catch (error) {
      console.error('Error opening drawer:', error)
    }
  }

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleMenuPress}
          style={styles.menuButton}
          activeOpacity={0.6}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          accessibilityLabel="Abrir menu"
          accessibilityRole="button"
        >
          <Ionicons name="menu" size={32} color="#2563eb" />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.placeholder} />
      </View>
      <DrawerMenu visible={isOpen} onClose={closeDrawer} />
    </>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    minHeight: 56, // Altura mínima para área de toque confortável
    zIndex: 100, // Garante que o header está acima
    elevation: 2, // Para Android
  },
  menuButton: {
    padding: 16, // Área de toque ainda maior
    marginLeft: 0,
    borderRadius: 8,
    minWidth: 56, // Aumentado para 56px
    minHeight: 56, // Aumentado para 56px
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  placeholder: {
    width: 48, // Mesmo tamanho do botão para simetria
  },
})
