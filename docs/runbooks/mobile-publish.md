# Runbook — Publicação do app mobile

> Como gerar builds e publicar o app Agenda Inteligente nas stores.

## Pré-requisitos

- Conta Expo (gratuita): https://expo.dev — login com `eas login`
- Para Android: conta Google Play Console ($25 uma vez)
- Para iOS: Apple Developer Program ($99/ano) — fora do escopo do MVP
- Node 18+ e `npm install -g eas-cli`

## Setup inicial (uma vez)

```bash
cd mobile
npm install
eas login
eas init   # gera o projectId e popula extra.eas.projectId no app.json
```

Após `eas init`, **commitar** o `app.json` atualizado.

## Build de desenvolvimento (Expo Go alternativa)

Para testar no celular sem build nativo, basta:

```bash
cd mobile
npm start
# escaneie o QR Code com o Expo Go
```

**Limitação:** Expo Go não suporta `expo-notifications` em SDK 53+. Para testar push, use build de desenvolvimento abaixo.

## Build de desenvolvimento (com módulos nativos)

```bash
eas build --profile development --platform android
# (ou ios)
```

Após ~10 min, EAS gera APK. Baixar e instalar no celular. Depois:

```bash
npm start
```

E o app development conecta no Metro Bundler local.

## Build de preview (APK distribuível)

Para gerar APK e enviar manualmente a testers (sem precisar de Play Store):

```bash
eas build --profile preview --platform android
```

Resultado: link de download do APK. Compartilhar via WhatsApp/email com testers.

## Build de produção (Android)

```bash
eas build --profile production --platform android
```

Gera AAB (Android App Bundle) pronto para submissão.

## Submissão ao Google Play (primeira vez)

1. Criar listing no Google Play Console com:
   - Nome: Agenda Inteligente
   - Categoria: Lifestyle ou Business
   - Descrição curta/longa, prints, ícone
   - Política de privacidade (URL)
2. Subir AAB gerado pelo `eas build production`
3. Configurar **closed testing** primeiro (white list de emails)
4. Após aprovação, promover para **production**

Auto-submit:

```bash
eas submit --profile production --platform android
```

Requer Service Account Key da Google Play Console — ver https://docs.expo.dev/submit/android/

## Updates OTA (sem novo build)

Para correções de JS/RN sem regenerar nativo:

```bash
eas update --branch production --message "fix: ajuste de copy"
```

App recebe a atualização automaticamente na próxima abertura (até ~5 min).

## Versionamento

A cada release de produção:

1. Atualizar `app.json`:
   - `version` (semver, ex: `1.1.0`)
   - `ios.buildNumber` (incrementar inteiro)
   - `android.versionCode` (incrementar inteiro)
2. Commitar mudança
3. Gerar build de produção
4. Tag git: `git tag mobile-v1.1.0 && git push --tags`

## Troubleshooting

**"Project ID is required"**  
Rodar `eas init` (Sprint 7-1).

**"Authorization failed"**  
Rodar `eas login`. Verificar se a conta Expo tem permissão no projeto.

**Push notification não chega**  
- Verificar que `expo-notifications` está no app.json plugins
- Token de push registrado no backend? (`POST /api/publico/clientes/push-token`)
- App em foreground vs background: testar ambos

**App não conecta no backend**  
Verificar `EXPO_PUBLIC_API_URL` no `eas.json` aponta para Railway (não localhost).

## Próximas iterações

- iOS App Store (Apple Developer required)
- CI/CD GitHub Actions: build automático em tag `mobile-v*`
- Login biométrico (expo-local-authentication)
- Modo offline com cache de agendamentos
