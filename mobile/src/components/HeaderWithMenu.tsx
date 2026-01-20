import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import DrawerMenu from './DrawerMenu'
import { useDrawer } from '../contexts/DrawerContext'
import { authService } from '../services/authService'
import { reclamacaoService } from '../services/reclamacaoService'

interface HeaderWithMenuProps {
  title: string
}

export default function HeaderWithMenu({ title }: HeaderWithMenuProps) {
  const { isOpen, openDrawer, closeDrawer } = useDrawer()
  const usuario = authService.getUsuario()
  const podeVerNotificacoes = usuario?.perfil === 'ADMIN' || usuario?.perfil === 'GERENTE'
  const unidadeId = usuario?.unidadeId
  const isAdmin = usuario?.perfil === 'ADMIN'

  const { data: contadorReclamacoes = 0 } = useQuery({
    queryKey: ['reclamacoes', 'contador', isAdmin ? 'todas' : 'unidade', unidadeId],
    queryFn: async () => {
      if (isAdmin) {
        return await reclamacaoService.contarNaoLidas()
      } else if (unidadeId) {
        return await reclamacaoService.contarNaoLidasPorUnidade(unidadeId)
      }
      return 0
    },
    enabled: podeVerNotificacoes,
    refetchInterval: 30000,
  })

  const handleMenuPress = () => {
    console.log('Menu button pressed, opening drawer...')
    try {
      openDrawer()
      console.log('Drawer opened successfully')
    } catch (error) {
      console.error('Error opening drawer:', error)
    }
  }

  const handleNotificationPress = () => {
    router.push('/notificacoes')
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
        {podeVerNotificacoes ? (
          <TouchableOpacity
            onPress={handleNotificationPress}
            style={styles.notificationButton}
            activeOpacity={0.6}
          >
            <Ionicons name="notifications" size={24} color="#2563eb" />
            {contadorReclamacoes > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {contadorReclamacoes > 99 ? '99+' : contadorReclamacoes}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
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
  notificationButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
})
