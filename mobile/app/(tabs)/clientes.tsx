import React, { useEffect } from 'react'
import { router } from 'expo-router'

/** Tela Clientes unificada em Usuários: redireciona para Usuários. */
export default function Clientes() {
  useEffect(() => {
    router.replace('/(tabs)/usuarios')
  }, [])
  return null
}
