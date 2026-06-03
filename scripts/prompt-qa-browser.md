# Prompt: QA E2E no navegador — agendaInteligente

Cole esse prompt no agente do Chrome (Claude in Chrome / outro browser agent). Ele vai abrir as duas contas (cliente + profissional) e testar o fluxo completo de agendamento.

---

## Prompt pro agente

Você é um QA de uma plataforma de agendamentos chamada **agendaInteligente**. Sua tarefa é executar um teste end-to-end completo do fluxo entre cliente e profissional, alternando entre duas contas. Documente tudo que encontrar.

### URLs

- **Cliente PWA**: https://agendainteligente-aleefhenriiques-projects.vercel.app/cliente/login
- **Profissional/Admin**: https://agendainteligente-aleefhenriiques-projects.vercel.app/login

### Credenciais

| Perfil | Email | Senha |
|---|---|---|
| Cliente | `cliente@salao.demo.com` | `Demo@2026` |
| Profissional | `profissional@salao.demo.com` | `Demo@2026` |

### Cenário 1 — Cliente cria agendamento (PWA)

1. Abra `/cliente/login`
2. Logue como `cliente@salao.demo.com` / `Demo@2026`
3. **Verifique**: tela inicial mostra "Olá, Cliente Salao" e botão violet "Marcar novo horário"
4. Clique em **"Marcar novo horário"** (ou "Novo")
5. No wizard:
   - **Passo 1**: escolha um serviço (qualquer um da lista — ex.: "Corte feminino")
   - **Passo 2**: escolha um horário disponível futuro
   - **Passo 3**: forma de pagamento = **PIX**, depois **Confirmar agendamento**
6. **Verifique**: toast verde "Agendamento realizado com sucesso!" e redireciona pra `/cliente/meus-agendamentos`
7. **Verifique**: agendamento recém-criado aparece na lista com status **AGENDADO** (badge cinza/preto), com unidade, atendente, valor, data
8. **Anote**: o ID do agendamento criado (você vai precisar pra confirmar do lado do profissional). Pode pegar inspecionando a chamada `POST /agendamentos` ou anotando data/hora pra identificar.

### Cenário 2 — Cliente vê seus dados

1. Ainda logado como cliente, navegue pelo menu inferior:
   - **Início**: deve mostrar próximo horário
   - **Meus horários**: deve listar o agendamento criado
   - **Perfil**: deve mostrar nome, email, ID; deve ter botão "Enviar feedback" e "Refazer tour"; botão "Sair" deve estar com cor **violet** (não amarelo nem vermelho)
2. **Tente cancelar o agendamento**:
   - Clique em "Cancelar" no card do agendamento
   - **Verifique**: aparece um modal com título "Cancelar agendamento", botão de confirmação **VERMELHO** dizendo "Sim, cancelar" e botão "Voltar" branco
   - **NÃO clique em Sim, cancelar agora** — só fecha o modal (Voltar). Vamos cancelar depois.

### Cenário 3 — Profissional confirma e executa atendimento

1. Em **outra aba**, abra `/login`
2. Logue como `profissional@salao.demo.com` / `Demo@2026`
3. **Verifique**: vai pra `/profissional/hoje`. Deve mostrar a agenda dele do dia
4. Localize o agendamento criado pelo cliente (mesma data/hora)
5. Clique no agendamento → abre bottom-sheet de ações
6. Clique em **"Confirmar"** → status muda pra **CONFIRMADO** (badge azul)
7. Clique de novo no agendamento → clique em **"Iniciar atendimento"** → status **EM_ANDAMENTO**
8. Clique de novo → clique em **"Finalizar atendimento"** → preencha valor + forma pagamento → confirma → status **CONCLUIDO**

### Cenário 4 — Profissional reabre atendimento (testa fix do dia)

1. Ainda como profissional, abra o mesmo agendamento (agora CONCLUIDO)
2. **Verifique**: tem botão **"Reabrir"** com texto "Voltar status para em andamento"
3. Clique em **Reabrir**
4. **Verifique**: NÃO dá erro "Não é possível alterar status de um agendamento encerrado" — deve voltar pra EM_ANDAMENTO
5. Finalize de novo pra deixar como CONCLUIDO

### Cenário 5 — Profissional marca no-show direto e reverte

1. Cliente PWA: crie um **2º agendamento** no próximo slot disponível (repete Cenário 1, mas escolha horário diferente)
2. Volte pra aba do profissional → recarrega a tela `/profissional/hoje`
3. Abra o novo agendamento → clique em **"Marcar como no-show"** (sem confirmar antes)
4. **Verifique**: NÃO dá erro "Transição de status inválida" — vai direto pra **NO_SHOW** (badge laranja)
5. Abra de novo → deve ter botão **"Cliente compareceu — Corrigir: cliente chegou"** (verde/emerald)
6. Clique em **Cliente compareceu**
7. **Verifique**: NÃO dá erro "Não é possível alterar status de um agendamento encerrado" — volta pra **CONFIRMADO**

### Cenário 6 — Cliente cancela seu agendamento

1. Volte pra aba do cliente
2. Recarrega `/cliente/meus-agendamentos`
3. Encontre o 2º agendamento (status CONFIRMADO)
4. Clique **Cancelar** → confirma "Sim, cancelar"
5. **Verifique**: agendamento sai da lista de ativos; aparece um aviso de sucesso
6. **Verifique** (opcional): se houver tab "Histórico de cancelamentos", deve aparecer lá

### Cenário 7 — SEC: cliente NÃO vê dados de outras empresas

1. Cliente ainda logado
2. Inicia outro agendamento
3. **Verifique** na lista de unidades: aparece **APENAS** "Salão Demo - Unidade Principal". **NÃO** deve aparecer "Academia Demo - Unidade Principal" nem nenhuma outra empresa. Se aparecer, é vazamento multi-tenant (gravíssimo).

### Cenário 8 — Feedback/reclamação

1. Cliente → Perfil → "Enviar feedback"
2. **Verifique**: vai pra `/reclamacoes` com nome/email pré-preenchidos
3. Selecione categoria **"Elogio"**, escreva mensagem qualquer ("Teste E2E QA — agente browser")
4. Clique **"Enviar mensagem"**
5. **Verifique**: tela de sucesso com **"Mensagem enviada!"**

### O que reportar no final

Pra cada cenário, classifique como:
- ✅ **PASS** — funcionou conforme esperado
- ❌ **FAIL** — não funcionou. Cole a mensagem de erro, status HTTP (se viu no console/network), screenshot
- ⚠️ **PARCIAL** — funcionou mas tem detalhe pra revisar (cor errada, texto em inglês, layout quebrado)

**Coisas específicas pra prestar atenção:**

- **Cores dos botões em dialogs de confirmação:**
  - "Sair da conta" → botão **violet** (não amarelo)
  - "Cancelar agendamento" → botão **vermelho** (não amarelo) com texto "Sim, cancelar"
- **Idioma**: tudo em **português**. Mensagens de erro como "Transição de status inválida: AGENDADO -> NO_SHOW" são bug — deve estar "Não dá pra mudar status de Agendado para Não compareceu"
- **iOS no-zoom**: se testar no iPhone, tap em campo de texto não deve fazer zoom (font-size ≥ 16px)
- **PWA cache**: se vir erro "Ops! Algo deu errado", tem botão "Limpar cache e recarregar" — use
- **Mobile-first**: teste no DevTools com viewport iPhone 14 Pro Max (430×932). Toda tela deve caber sem scroll horizontal

### Se algum cenário falhar

Antes de reportar, tente uma vez:
1. Hard refresh (Ctrl+Shift+R)
2. Limpar cache + Service Worker (DevTools → Application → Storage → Clear site data)
3. Se persistir, é bug real — reporte

### Bonus: console + network

Em paralelo, abra F12 e:
- **Console**: cole qualquer erro vermelho que aparecer
- **Network**: filtre por "agendamentos" — se algum POST/PATCH retornar 4xx ou 5xx, cole status + body
