# 📱 Agenda Inteligente - App Mobile (React Native + Expo)

Aplicação mobile desenvolvida com React Native e Expo para iOS e Android.

## 🚀 Desenvolvimento (Expo Go)

### Pré-requisitos

- Node.js 18+ instalado
- Expo Go app instalado no seu iPhone (disponível na App Store)

### Instalação e Execução

1. **Instale as dependências:**
   ```bash
   cd mobile
   npm install
   ```

2. **A URL da API já está configurada** em `app.json` apontando para o backend no EasyPanel:
   ```json
   "extra": {
     "apiUrl": "https://agendainteligentebackend.agendainteligenteapp.cloud/api"
   }
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm start
   ```

4. **Escaneie o QR Code:**
   - Abra o app **Expo Go** no seu iPhone
   - Escaneie o QR Code exibido no terminal ou navegador
   - O app será carregado automaticamente e conectará ao backend no EasyPanel

> **💡 Importante**: O app se conecta ao backend no EasyPanel via HTTPS. Não precisa de Docker para desenvolvimento mobile.

## 📁 Estrutura do Projeto

```
mobile/
├── app/                  # Rotas (Expo Router - file-based routing)
│   ├── _layout.tsx       # Layout raiz
│   ├── login.tsx         # Tela de login
│   └── (tabs)/           # Abas principais
│       ├── _layout.tsx        # Layout das abas
│       ├── index.tsx          # Dashboard
│       ├── agendamentos.tsx    # Agendamentos
│       ├── servicos.tsx       # Serviços
│       └── clientes.tsx       # Clientes
├── src/
│   ├── components/        # Componentes reutilizáveis
│   │   ├── Button.tsx
│   │   └── FormField.tsx
│   └── services/         # Serviços de API
│       ├── api.ts
│       ├── authService.ts
│       ├── agendamentoService.ts
│       ├── servicoService.ts
│       └── clienteService.ts
├── app.json              # Configuração do Expo
├── package.json
└── tsconfig.json
```

## 🔑 Principais Diferenças do Web

### Armazenamento
- **Web**: `localStorage`
- **Mobile**: `expo-secure-store` (armazenamento seguro)

### Navegação
- **Web**: `react-router-dom`
- **Mobile**: `expo-router` (file-based routing)

### Componentes
- **Web**: HTML (`<div>`, `<button>`, etc.)
- **Mobile**: React Native (`<View>`, `<TouchableOpacity>`, etc.)

### Estilos
- **Web**: CSS/Tailwind
- **Mobile**: `StyleSheet` do React Native

## 🔐 Autenticação

O app usa `expo-secure-store` para armazenar tokens de forma segura. Os tokens são automaticamente incluídos nas requisições via interceptor do axios.

## 🚀 Produção (Build Nativo)

Para gerar um app nativo (APK/IPA) para produção, use o **EAS Build**:

### 1. Instale o EAS CLI

```bash
npm install -g eas-cli
```

### 2. Faça Login

```bash
eas login
```

### 3. Configure o Projeto (primeira vez)

```bash
eas build:configure
```

### 4. Gere o Build

**Android (APK):**
```bash
eas build --platform android --profile preview
```

**iOS (IPA):**
```bash
eas build --platform ios --profile preview
```

**Ambos:**
```bash
eas build --platform all --profile production
```

> 📖 **Guia Completo**: Veja `GUIA_DESENVOLVIMENTO_E_PRODUCAO.md` para instruções detalhadas.

## 🛠️ Comandos Úteis

```bash
# Desenvolvimento
npm start                    # Inicia o servidor Metro
npm run ios                  # Inicia no simulador iOS (Mac apenas)
npm run android              # Inicia no emulador Android
expo start -c                # Limpa cache e inicia

# Produção
eas build:configure          # Configura o projeto para EAS Build
eas build --platform android # Gera build Android
eas build --platform ios     # Gera build iOS
```

## 📝 Próximos Passos

- [ ] Adicionar mais páginas (Unidades, Atendentes, etc.)
- [ ] Implementar formulários completos
- [ ] Adicionar calendário para seleção de datas
- [ ] Implementar notificações push
- [ ] Adicionar suporte offline
- [ ] Melhorar tratamento de erros
- [ ] Adicionar loading states
- [ ] Implementar refresh pull-to-refresh

## 📚 Documentação

- **Desenvolvimento e Produção**: Veja `GUIA_DESENVOLVIMENTO_E_PRODUCAO.md` para um guia completo
- [Documentação Expo](https://docs.expo.dev/)
- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
