import React, { useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Animated } from 'react-native'
import { router, usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { authService } from '../services/authService'
import { Alert } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { reclamacaoService } from '../services/reclamacaoService'

interface MenuItem {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  path: string
  paths?: string[]
  badge?: number
}

const baseMenuItems: MenuItem[] = [
  { label: 'Início', icon: 'home', path: '/(tabs)' },
  { label: 'Agendamentos', icon: 'calendar', path: '/(tabs)/agendamentos', paths: ['/(tabs)/agendamentos', '/agendamentos'] },
  { label: 'Clientes', icon: 'people', path: '/(tabs)/clientes' },
  { label: 'Serviços', icon: 'medical', path: '/(tabs)/servicos' },
  { label: 'Unidades', icon: 'business', path: '/(tabs)/unidades' },
  { label: 'Atendentes', icon: 'person', path: '/(tabs)/atendentes' },
  { label: 'Usuários', icon: 'settings', path: '/(tabs)/usuarios' },
]

interface DrawerMenuProps {
  visible: boolean
  onClose: () => void
}

export default function DrawerMenu({ visible, onClose }: DrawerMenuProps) {
  const pathname = usePathname()
  const slideAnim = useRef(new Animated.Value(-280)).current
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

  const menuItems: MenuItem[] = [
    ...baseMenuItems,
    ...(podeVerNotificacoes
      ? [{ label: 'Notificações', icon: 'notifications', path: '/notificacoes', badge: contadorReclamacoes }]
      : []),
  ]

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start()
    } else {
      Animated.timing(slideAnim, {
        toValue: -280,
        duration: 300,
        useNativeDriver: true,
      }).start()
    }
  }, [visible])

  const isActive = (item: MenuItem): boolean => {
    if (item.paths) {
      return item.paths.some((p) => pathname === p || pathname.startsWith(p + '/'))
    }
    return pathname === item.path || pathname.startsWith(item.path + '/')
  }

  const handleNavigate = (path: string) => {
    router.push(path as any)
    onClose()
  }

  const handleLogout = async () => {
    Alert.alert(
      'Confirmar Logout',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await authService.logout()
            router.replace('/login')
            onClose()
          },
        },
      ]
    )
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Pressable style={styles.overlay} onPress={onClose} />
        <Animated.View 
          style={[
            styles.drawer, 
            { 
              transform: [{ translateX: slideAnim }],
            }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="calendar" size={32} color="#2563eb" />
            <Text style={styles.headerTitle}>Agenda Inteligente</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <View style={styles.menuContainer}>
            {menuItems.map((item) => {
              const active = isActive(item)
              return (
                <TouchableOpacity
                  key={item.path}
                  style={[styles.menuItem, active && styles.menuItemActive]}
                  onPress={() => handleNavigate(item.path)}
                >
                  <Ionicons
                    name={item.icon}
                    size={24}
                    color={active ? '#2563eb' : '#6b7280'}
                    style={styles.menuIcon}
                  />
                  <Text style={[styles.menuText, active && styles.menuTextActive]}>
                    {item.label}
                  </Text>
                  {item.badge !== undefined && item.badge > 0 && (
                    <View style={styles.menuBadge}>
                      <Text style={styles.menuBadgeText}>
                        {item.badge > 99 ? '99+' : item.badge}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Footer com Logout */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color="#dc2626" />
              <Text style={styles.logoutText}>Sair</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject, // Cobre toda a tela
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    width: 280,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    position: 'absolute', // Garante que fica posicionado absolutamente
    left: 0, // Sempre à esquerda
    top: 0,
    bottom: 0,
  },
  header: {
    height: 100,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 12,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  menuContainer: {
    flex: 1,
    paddingTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 8,
    borderRadius: 8,
  },
  menuItemActive: {
    backgroundColor: '#eff6ff',
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
    color: '#6b7280',
  },
  menuTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  logoutText: {
    fontSize: 16,
    color: '#dc2626',
    fontWeight: '600',
    marginLeft: 12,
  },
  menuBadge: {
    marginLeft: 'auto',
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  menuBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
})
