import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import SwipeableContainer from '../../src/components/SwipeableContainer'

export default function TabsLayout() {
  return (
    <SwipeableContainer>
      <Tabs
        screenOptions={{
          headerShown: false, // Headers customizados com menu
          tabBarStyle: { display: 'none' }, // Esconde a tab bar
          tabBarActiveTintColor: '#2563eb',
          tabBarInactiveTintColor: '#6b7280',
        }}
      >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="agendamentos"
        options={{
          title: 'Agendamentos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="servicos"
        options={{
          title: 'Serviços',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="medical" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="clientes"
        options={{
          title: 'Clientes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="unidades"
        options={{
          title: 'Unidades',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="atendentes"
        options={{
          title: 'Atendentes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="usuarios"
        options={{
          title: 'Usuários',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="empresas"
        options={{
          title: 'Empresas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfis"
        options={{
          title: 'Perfis',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shield" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
    </SwipeableContainer>
  )
}
