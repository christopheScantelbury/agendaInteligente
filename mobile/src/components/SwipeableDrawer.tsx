import React, { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated, Dimensions } from 'react-native'
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler'
import { useDrawer } from '../contexts/DrawerContext'
import DrawerMenu from './DrawerMenu'

const DRAWER_WIDTH = 280
const SWIPE_THRESHOLD = 100 // Distância mínima para abrir/fechar

export default function SwipeableDrawer({ children }: { children: React.ReactNode }) {
  const { isOpen, openDrawer, closeDrawer } = useDrawer()
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current
  const lastGestureX = useRef(0)

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: isOpen ? 0 : -DRAWER_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }, [isOpen])

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  )

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX, velocityX } = event.nativeEvent
      lastGestureX.current = translationX

      // Determina se deve abrir ou fechar baseado na distância e velocidade
      const shouldOpen = translationX > SWIPE_THRESHOLD || velocityX > 500
      const shouldClose = translationX < -SWIPE_THRESHOLD || velocityX < -500

      if (shouldOpen && !isOpen) {
        openDrawer()
      } else if (shouldClose && isOpen) {
        closeDrawer()
      } else {
        // Retorna ao estado anterior
        Animated.spring(translateX, {
          toValue: isOpen ? 0 : -DRAWER_WIDTH,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start()
      }
    }
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.content}>
        {children}
      </View>
      
      {/* Área de detecção de swipe na borda esquerda */}
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={10}
        failOffsetY={[-5, 5]}
        minPointers={1}
        maxPointers={1}
      >
        <Animated.View
          style={[
            styles.swipeArea,
            {
              transform: [{ translateX: translateX }],
            },
          ]}
        />
      </PanGestureHandler>

      <DrawerMenu visible={isOpen} onClose={closeDrawer} />
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  swipeArea: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 20, // Área sensível na borda esquerda
    zIndex: 1000,
  },
})
