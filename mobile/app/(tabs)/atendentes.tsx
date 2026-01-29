import React, { useEffect } from 'react'
import { router } from 'expo-router'

/** Tela Atendentes unificada em Usuários: redireciona para Usuários. */
export default function AtendentesScreen() {
  useEffect(() => {
    router.replace('/(tabs)/usuarios')
  }, [])
  return null
}
