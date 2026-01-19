import React from 'react'
import { View, StyleSheet } from 'react-native'
import { PanGestureHandler, State } from 'react-native-gesture-handler'
import { useDrawer } from '../contexts/DrawerContext'

const SWIPE_THRESHOLD = 50 // Distância mínima para abrir

interface SwipeableContainerProps {
  children: React.ReactNode
}

export default function SwipeableContainer({ children }: SwipeableContainerProps) {
  const { openDrawer } = useDrawer()

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX, velocityX } = event.nativeEvent

      // Se arrastou da esquerda para direita (translationX > 0)
      // translationX positivo = arrastou para direita
      if (translationX > SWIPE_THRESHOLD || velocityX > 300) {
        openDrawer()
      }
    }
  }

  return (
    <View style={styles.container}>
      {children}
      
      {/* Área de detecção de swipe na borda esquerda */}
      <PanGestureHandler
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={10} // Ativa quando arrasta 10px para direita
        failOffsetY={[-10, 10]} // Falha se arrastar muito verticalmente
        minPointers={1}
        maxPointers={1}
      >
        <View style={styles.swipeArea} />
      </PanGestureHandler>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  swipeArea: {
    position: 'absolute',
    left: 0,
    top: 60, // Começa abaixo do header (altura do header ~56px)
    bottom: 0,
    width: 20, // Área sensível na borda esquerda (20px)
    zIndex: 1, // Abaixo do header mas acima do conteúdo
    backgroundColor: 'transparent',
  },
})
