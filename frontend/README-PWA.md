# Configuração PWA - Agenda Inteligente

## ✅ O que foi implementado

1. **Manifest.json** - Configuração do PWA com ícones, tema e display standalone
2. **Service Worker** - Cache básico para funcionamento offline
3. **Meta Tags iOS** - Configurações específicas para iPhone/iPad
4. **Componente InstallPrompt** - Banner de instalação automático para iOS e Android

## 📱 Como funciona no iPhone

No iPhone, o Safari não mostra um banner automático de instalação como no Android. Por isso, implementamos um **banner personalizado** que aparece automaticamente após 3 segundos.

### O banner mostra:
- Instruções passo a passo para instalar
- Botão "Entendi" para fechar
- Botão "Depois" para adiar

### Passos para instalar no iPhone:
1. Toque no botão **Compartilhar** (□↑) na parte inferior do Safari
2. Role para baixo e toque em **"Adicionar à Tela de Início"**
3. Toque em **"Adicionar"** no canto superior direito

## 🤖 Como funciona no Android

No Android/Chrome, o navegador mostra automaticamente um banner nativo. Nosso componente também mostra um banner personalizado quando o evento `beforeinstallprompt` é disparado.

## 🎨 Gerar Ícones

### Método Único (Super Fácil):
1. Abra `frontend/public/generate-pwa-icons.html` no navegador
2. Os ícones serão gerados automaticamente a partir do design de calendário
3. Clique em "Baixar" para cada ícone
4. Coloque na pasta `frontend/public/`

### Ícones necessários:
- `icon-192x192.png` (192x192px)
- `icon-512x512.png` (512x512px)
- `apple-touch-icon.png` (180x180px)

**Nota:** O design do ícone já está pronto (calendário azul com check verde). Veja `frontend/INSTRUCOES-ICONES.md` para mais detalhes.

## 🚀 Testar PWA

### Localmente:
```bash
cd frontend
npm run build
npm run preview
```

### Verificar:
1. Abra no navegador (Chrome DevTools > Application > Manifest)
2. Verifique se o manifest está carregado
3. Verifique se o service worker está registrado
4. No iPhone, abra no Safari e verifique se o banner aparece

## 📝 Notas Importantes

- **HTTPS obrigatório**: PWAs só funcionam completamente em HTTPS (ou localhost)
- **Service Worker**: Deve estar na raiz do domínio ou em um subdiretório
- **iOS**: Requer Safari (não funciona em outros navegadores iOS)
- **Cache**: O service worker usa estratégia "Network First" com fallback para cache

## 🔧 Personalização

### Alterar tema:
Edite `frontend/public/manifest.json`:
```json
{
  "theme_color": "#2563EB",  // Cor da barra de status
  "background_color": "#ffffff"  // Cor de fundo do splash
}
```

### Alterar tempo do banner iOS:
Edite `frontend/src/components/InstallPrompt.tsx`:
```typescript
setTimeout(() => {
  setShowIOSPrompt(true)
}, 3000) // Altere para o tempo desejado (em ms)
```

## ✅ Checklist de Deploy

- [ ] Ícones gerados e colocados em `public/`
- [ ] Manifest.json configurado
- [ ] Service Worker funcionando
- [ ] Testado no iPhone (Safari)
- [ ] Testado no Android (Chrome)
- [ ] HTTPS configurado (produção)
- [ ] Meta tags verificadas
