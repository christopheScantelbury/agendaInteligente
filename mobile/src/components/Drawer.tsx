import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native'
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer'
import { router, usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { authService } from '../services/authService'

interface MenuItem {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  path: string
  paths?: string[] // Para verificar múltiplos paths
}

const menuItems: MenuItem[] = [
  { label: 'Início', icon: 'home', path: '/(tabs)' },
  { label: 'Agendamentos', icon: 'calendar', path: '/(tabs)/agendamentos', paths: ['/(tabs)/agendamentos', '/agendamentos'] },
  { label: 'Clientes', icon: 'people', path: '/(tabs)/clientes' },
  { label: 'Serviços', icon: 'medical', path: '/(tabs)/servicos' },
  { label: 'Unidades', icon: 'business', path: '/(tabs)/unidades' },
  { label: 'Atendentes', icon: 'person', path: '/(tabs)/atendentes' },
  { label: 'Usuários', icon: 'settings', path: '/(tabs)/usuarios' },
]

export default function DrawerContent(props: DrawerContentComponentProps) {
  const pathname = usePathname()

  const isActive = (item: MenuItem): boolean => {
    if (item.paths) {
      return item.paths.some((p) => pathname === p || pathname.startsWith(p + '/'))
    }
    return pathname === item.path || pathname.startsWith(item.path + '/')
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
          },
        },
      ]
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="calendar" size={32} color="#2563eb" />
        <Text style={styles.headerTitle}>Agenda Inteligente</Text>
      </View>

      <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContent}>
        {menuItems.map((item) => {
          const active = isActive(item)
          return (
            <TouchableOpacity
              key={item.path}
              style={[styles.menuItem, active && styles.menuItemActive]}
              onPress={() => {
                router.push(item.path as any)
                props.navigation.closeDrawer()
              }}
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
            </TouchableOpacity>
          )
        })}
      </DrawerContentScrollView>

      {/* Footer com Logout */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#dc2626" />
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 12,
  },
  scrollContent: {
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
})
