# 📱 Guia Completo: Desenvolvimento e Produção - App Mobile

## 🎯 Visão Geral

O app mobile funciona de forma diferente do web:
- **Desenvolvimento**: Usa Expo Go (app instalado no celular) + servidor Metro local
- **Produção**: Build nativo (APK para Android, IPA para iOS) usando EAS Build

O backend sempre fica no **Railway** (ou local se você estiver testando localmente).

---

## 🛠️ DESENVOLVIMENTO (Expo Go)

### Como Funciona

1. Você roda `npm start` no seu computador
2. O Expo cria um servidor Metro (bundler) que serve o código JavaScript
3. Você escaneia o QR Code com o **Expo Go** no seu celular
4. O Expo Go baixa o código do servidor Metro e executa no celular
5. O app se conecta ao backend no Railway via HTTPS

### Passo a Passo

#### 1. Configure a URL da API

A URL da API está configurada em `app.json`:

```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://agenda-backend-production-cc5e.up.railway.app/api"
    }
  }
}
```

**Para desenvolvimento local** (se quiser testar com backend local):
```json
"apiUrl": "http://SEU_IP_LOCAL:8080/api"
```
> ⚠️ **Importante**: Use o IP da sua máquina na rede local, não `localhost`. Encontre com `ipconfig` (Windows) ou `ifconfig` (Linux/Mac).

#### 2. Instale as Dependências

```bash
cd mobile
npm install
```

#### 3. Inicie o Servidor de Desenvolvimento

```bash
npm start
```

Isso vai:
- Iniciar o servidor Metro
- Exibir um QR Code no terminal
- Abrir uma página no navegador com o QR Code

#### 4. Conecte o Celular

**No iPhone:**
1. Abra o app **Expo Go** (baixe na App Store se não tiver)
2. Escaneie o QR Code exibido no terminal/navegador
3. O app será carregado automaticamente

**Importante:**
- Seu celular e computador devem estar na **mesma rede Wi-Fi**
- O backend no Railway já está acessível via HTTPS, então funciona de qualquer lugar

#### 5. Teste o App

O app vai se conectar ao backend no Railway automaticamente usando a URL configurada em `app.json`.

---

## 🚀 PRODUÇÃO (Build Nativo)

Para produção, você precisa gerar um **build nativo** (APK/IPA) que pode ser instalado diretamente no celular ou publicado nas lojas.

### Opção 1: EAS Build (Recomendado - Expo Application Services)

O EAS Build é o serviço oficial do Expo para gerar builds nativos na nuvem.

#### 1. Instale o EAS CLI

```bash
npm install -g eas-cli
```

#### 2. Faça Login

```bash
eas login
```

#### 3. Configure o Projeto

```bash
cd mobile
eas build:configure
```

Isso cria um arquivo `eas.json` com as configurações de build.

#### 4. Configure o `eas.json`

Edite o arquivo `eas.json` criado:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://agenda-backend-production-cc5e.up.railway.app/api"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

#### 5. Gere o Build

**Para Android (APK):**
```bash
eas build --platform android --profile preview
```

**Para iOS (IPA):**
```bash
eas build --platform ios --profile preview
```

**Para ambos:**
```bash
eas build --platform all --profile production
```

#### 6. Baixe o Build

Após o build terminar (pode levar 10-30 minutos), você receberá um link para baixar:
- **Android**: APK que pode ser instalado diretamente
- **iOS**: IPA (requer conta de desenvolvedor da Apple para instalar)

#### 7. Publique nas Lojas (Opcional)

**Google Play Store:**
```bash
eas submit --platform android
```

**Apple App Store:**
```bash
eas submit --platform ios
```

---

### Opção 2: Build Local (Avançado)

Você também pode gerar builds localmente, mas requer mais configuração:

#### Android

1. Instale Android Studio
2. Configure o ambiente Android SDK
3. Execute:
```bash
npx expo run:android
```

#### iOS (apenas no Mac)

1. Instale Xcode
2. Execute:
```bash
npx expo run:ios
```

---

## 🔧 Configuração de Variáveis de Ambiente

### Desenvolvimento

A URL da API está em `app.json`:
```json
"extra": {
  "apiUrl": "https://agenda-backend-production-cc5e.up.railway.app/api"
}
```

### Produção (EAS Build)

Use variáveis de ambiente no `eas.json`:

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://agenda-backend-production-cc5e.up.railway.app/api"
      }
    }
  }
}
```

E atualize `src/services/api.ts` para usar:

```typescript
const API_URL = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8080/api'
```

---

## 📋 Resumo: Desenvolvimento vs Produção

| Aspecto | Desenvolvimento (Expo Go) | Produção (Build Nativo) |
|---------|---------------------------|--------------------------|
| **Como roda** | Expo Go app + Metro bundler | App nativo instalado |
| **Backend** | Railway (HTTPS) | Railway (HTTPS) |
| **Atualizações** | Instantâneas (hot reload) | Requer novo build |
| **Distribuição** | QR Code | APK/IPA ou lojas |
| **Performance** | Boa | Melhor (nativo) |
| **Tamanho** | Pequeno (só código) | Maior (inclui runtime) |

---

## 🎯 Fluxo Recomendado

### Durante Desenvolvimento

1. Use **Expo Go** para testar rapidamente
2. Backend no **Railway** (já configurado)
3. Faça mudanças e veja instantaneamente

### Antes de Publicar

1. Teste tudo no Expo Go
2. Gere um build de **preview** (APK/IPA) para testar como app nativo
3. Teste o build de preview em dispositivos reais
4. Gere build de **produção** quando estiver pronto
5. Publique nas lojas (opcional)

---

## ❓ FAQ

### Posso usar o mesmo backend para desenvolvimento e produção?

**Sim!** O backend no Railway já está configurado e acessível via HTTPS. Tanto o Expo Go quanto o app nativo vão se conectar ao mesmo backend.

### Preciso mudar a URL da API entre dev e produção?

**Não necessariamente.** Se você usar a mesma URL do Railway em ambos, não precisa mudar nada. Mas se quiser testar com backend local, pode criar perfis diferentes no `eas.json`.

### O Expo Go funciona sem internet?

**Não completamente.** O Expo Go precisa baixar o código do servidor Metro. Mas depois que carrega, as requisições ao backend funcionam normalmente (se tiver internet).

### Posso testar o app sem Expo Go?

**Sim!** Gere um build de preview (APK/IPA) e instale diretamente no celular. Isso simula melhor como será em produção.

---

## 🔗 Links Úteis

- [Documentação Expo](https://docs.expo.dev/)
- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [Expo Go na App Store](https://apps.apple.com/app/expo-go/id982107779)
- [Expo Go no Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
