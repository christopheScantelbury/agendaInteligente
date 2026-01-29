import React, { useEffect, useRef, useMemo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Animated } from 'react-native'
import { router, usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { authService } from '../services/authService'
import { Alert } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { reclamacaoService } from '../services/reclamacaoService'
import { perfilService } from '../services/perfilService'
import { useUsuario } from '../hooks/useUsuario'

interface MenuItem {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  path: string
  paths?: string[]
  badge?: number
}

/** Mapeamento path do menu (web) -> path no app (tabs). */
const MENU_PATH_TO_APP: Record<string, { path: string; label: string; icon: keyof typeof Ionicons.glyphMap; paths?: string[] }> = {
  '/': { path: '/(tabs)', label: 'Início', icon: 'home' },
  '/agendamentos': { path: '/(tabs)/agendamentos', label: 'Agendamentos', icon: 'calendar', paths: ['/(tabs)/agendamentos', '/agendamentos'] },
  '/empresas': { path: '/(tabs)/empresas', label: 'Empresas', icon: 'business' },
  '/unidades': { path: '/(tabs)/unidades', label: 'Unidades', icon: 'business' },
  '/servicos': { path: '/(tabs)/servicos', label: 'Serviços', icon: 'medical' },
  '/usuarios': { path: '/(tabs)/usuarios', label: 'Usuários', icon: 'settings' },
  '/perfis': { path: '/(tabs)/perfis', label: 'Perfis', icon: 'shield' },
  '/notificacoes': { path: '/notificacoes', label: 'Notificações', icon: 'notifications' },
}

interface DrawerMenuProps {
  visible: boolean
  onClose: () => void
}

export default function DrawerMenu({ visible, onClose }: DrawerMenuProps) {
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const slideAnim = useRef(new Animated.Value(-280)).current
  const { usuario } = useUsuario()
  const unidadeId = usuario?.unidadeId
  const isAdmin = usuario?.perfil === 'ADMIN'

  const { data: perfilUsuario } = useQuery({
    queryKey: ['perfil', 'meu'],
    queryFn: () => perfilService.buscarMeuPerfil(),
    enabled: !!usuario,
  })

  const temPermissaoMenu = (menuPath: string): boolean => {
    if (!perfilUsuario?.permissoesGranulares) return true
    const permissao = perfilUsuario.permissoesGranulares[menuPath]
    return permissao === 'EDITAR' || permissao === 'VISUALIZAR'
  }

  const podeVerNotificacoes = (usuario?.perfil === 'ADMIN' || usuario?.perfil === 'GERENTE') && temPermissaoMenu('/notificacoes')

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

  const menuItems: MenuItem[] = useMemo(() => {
    const items: MenuItem[] = []
    if (temPermissaoMenu('/')) {
      items.push({ label: MENU_PATH_TO_APP['/'].label, icon: MENU_PATH_TO_APP['/'].icon, path: MENU_PATH_TO_APP['/'].path })
    }
    if (temPermissaoMenu('/empresas')) {
      items.push({ label: MENU_PATH_TO_APP['/empresas'].label, icon: MENU_PATH_TO_APP['/empresas'].icon, path: MENU_PATH_TO_APP['/empresas'].path })
    }
    if (temPermissaoMenu('/unidades')) {
      items.push({ label: MENU_PATH_TO_APP['/unidades'].label, icon: 'business', path: MENU_PATH_TO_APP['/unidades'].path })
    }
    if (temPermissaoMenu('/servicos')) {
      items.push({ label: MENU_PATH_TO_APP['/servicos'].label, icon: MENU_PATH_TO_APP['/servicos'].icon, path: MENU_PATH_TO_APP['/servicos'].path })
    }
    if (temPermissaoMenu('/usuarios')) {
      items.push({ label: MENU_PATH_TO_APP['/usuarios'].label, icon: MENU_PATH_TO_APP['/usuarios'].icon, path: MENU_PATH_TO_APP['/usuarios'].path })
    }
    if (temPermissaoMenu('/perfis')) {
      items.push({ label: MENU_PATH_TO_APP['/perfis'].label, icon: MENU_PATH_TO_APP['/perfis'].icon, path: MENU_PATH_TO_APP['/perfis'].path })
    }
    if (temPermissaoMenu('/agendamentos')) {
      items.push({
        label: MENU_PATH_TO_APP['/agendamentos'].label,
        icon: MENU_PATH_TO_APP['/agendamentos'].icon,
        path: '/(tabs)/agendamentos',
        paths: ['/(tabs)/agendamentos', '/agendamentos'],
      })
    }
    if (podeVerNotificacoes) {
      items.push({
        label: MENU_PATH_TO_APP['/notificacoes'].label,
        icon: MENU_PATH_TO_APP['/notificacoes'].icon,
        path: '/notificacoes',
        badge: contadorReclamacoes,
      })
    }
    return items
  }, [perfilUsuario, podeVerNotificacoes, contadorReclamacoes])

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
            queryClient.removeQueries({ queryKey: ['usuario'] })
            queryClient.removeQueries({ queryKey: ['perfil', 'meu'] })
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
