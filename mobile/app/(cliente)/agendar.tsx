import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, radii, spacing } from '../../src/theme'

/**
 * Wizard de agendamento 3 passos — placeholder por enquanto.
 * MVP: link "Em breve no app" + sugestão de usar a web.
 * Implementação completa fica para próxima iteração (#117 expandido).
 */
export default function Agendar() {
  const router = useRouter()
  return (
    <View style={styles.container}>
      <Pressable style={styles.voltar} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color={colors.text} />
        <Text style={styles.voltarText}>Voltar</Text>
      </Pressable>

      <View style={styles.box}>
        <Ionicons name="construct-outline" size={48} color={colors.violet} />
        <Text style={styles.titulo}>Em breve no app</Text>
        <Text style={styles.subtitulo}>
          Estamos finalizando o fluxo de agendamento nativo. Por enquanto, use a versão web — o link é o mesmo da sua conta.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, backgroundColor: colors.bg },
  voltar: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xl },
  voltarText: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  box: {
    flex: 1,
    backgroundColor: colors.bgWhite,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginTop: spacing.md, textAlign: 'center' },
  subtitulo: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center', lineHeight: 22 },
})
