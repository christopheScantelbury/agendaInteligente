# Prompt: QA E2E no navegador — agendaInteligente

Cole esse prompt no agente do Chrome (Claude in Chrome / outro browser agent). Ele vai abrir as duas contas (cliente + profissional) e testar o fluxo completo de agendamento.

> **IMPORTANTE — antes de começar:** use **DOIS perfis separados do Chrome** (não duas abas no mesmo perfil). Perfil 1 = Cliente, Perfil 2 = Profissional. Sem isso, o `localStorage` é compartilhado e contamina dados entre os logins (ex: nome do profissional vaza no formulário do cliente). Foi um bug reportado e a workaround é separar perfis.

## Bugs corrigidos na última iteração — RETESTAR primeiro

Antes de executar os 8 cenários, verifique se os bugs abaixo foram resolvidos. Se algum persistir, marque imediatamente como ❌ FAIL e siga com os demais:

| ID | O que verificar | Esperado |
|---|---|---|
| **B1** | Login como `profissional@salao.demo.com` em `/login` | Vai pra `/profissional/hoje` SEM mostrar "Conta não vinculada como atendente". Se aparecer essa mensagem, peça pra rodar `POST /api/admin/seed-demo` autenticado como `chris@agendainteligente.com` |
| **B2** | Em `/cliente/meus-agendamentos`, abra qualquer card | Campos **"Atendente:"** e **"Serviços:"** mostram VALORES (nome do profissional + nome dos serviços), não vazios |
| **B3** | Cliente cria novo agendamento, clica "Confirmar agendamento" | **Toast verde "Agendamento realizado com sucesso!"** aparece por ~1,5s antes de redirecionar pra `/cliente/meus-agendamentos` (não pra `/cliente`) |
| **B4** | Cliente cancela um agendamento ativo | Toast "Agendamento cancelado e movido para o histórico." aparece |
| **B5** | Perfil cliente → seção "Conta" → botão "Sair" | Ícone do círculo em **violet** (não vermelho). Vermelho era bug |
| **B6** | Tela `/cliente` → saudação | "Olá, **Cliente Salao**" (nome completo, não só primeiro nome) |
| **B7** | Em perfil separado do Chrome, sem login admin, ir em Perfil → "Enviar feedback" | Form pré-preenche **"Cliente Salao"** no campo Nome (não "Profissional Salao") |
| **B8** | Após enviar feedback | Tela de sucesso aparece com **"Mensagem enviada!"** + botões "Enviar outra" / "Voltar para meu perfil" |

Reporte o resultado de cada retest como `✅ corrigido` / `❌ ainda quebrado` / `⚠️ parcial` antes de prosseguir.

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

---

## Parte 2: brainstorm de cobertura — **OBRIGATÓRIO**

Depois de executar os 8 cenários acima, **NÃO termine ainda**. Os cenários cobrem o caminho feliz + alguns bugs conhecidos, mas claramente deixam gaps. Sua segunda tarefa é **propor cenários que NÃO estão no prompt** e que você acha que deveriam estar testados.

### Pense em pelo menos essas categorias

**Casos de borda do agendamento:**
- Cliente tenta agendar fora do horário de funcionamento da unidade (deve bloquear)
- Cliente tenta agendar no passado
- Cliente tenta agendar 2 horários sobrepostos (com mesmo atendente OU consigo mesmo)
- Cliente tenta agendar 1 minuto após outro cliente pegar o slot (race condition)
- Profissional tenta finalizar um agendamento de outro profissional
- Profissional tenta abrir/editar agendamento de outra unidade
- ADMINISTRADOR cria agendamento PARA cliente — funciona? bloqueia tenant cruzado?

**Casos de borda de unidades/serviços:**
- Unidade sem nenhum profissional cadastrado — quais slots aparecem?
- Serviço inativo — aparece pro cliente?
- Profissional inativo — slots dele aparecem?
- Profissional vinculado a múltiplas unidades — slots filtram corretamente?

**Casos de borda de autenticação:**
- Token expirado: app trata bem? Mostra "sessão expirada" ou crasha?
- Logout e tentar voltar com back do browser
- Login simultâneo em duas abas — sincronia?
- Recuperação de senha (se houver)
- Bloqueio após N tentativas incorretas (se houver)

**Casos de borda multi-tenant (SEC):**
- Cliente do tenant A copia URL com ID de unidade do tenant B na barra → app bloqueia?
- Profissional do salão tenta hit endpoint da academia no Network (manualmente via DevTools)
- ADMINISTRADOR do salão consegue ver agendamentos de outras empresas? não pode.
- Mudar `clienteId` no payload do POST `/agendamentos` pra agendar em nome de outro cliente

**Casos de acessibilidade/UX:**
- Tab navigation funciona em todas as telas
- Leitor de tela: labels dos inputs, alt em imagens
- Daltonismo: dá pra distinguir status só pela cor? (precisa ter texto também)
- Touch targets ≥ 44px nos botões mobile
- Estado de loading visível (spinner, skeleton)
- Estado vazio (sem agendamentos / sem clientes) — tem mensagem amigável?

**Casos de borda de input:**
- Nome com 200+ caracteres
- Telefone formato estrangeiro (+1, +44)
- CPF/CNPJ inválido (dígito verificador errado)
- Email com formato exótico (`teste+filter@gmail.com`)
- XSS: input com `<script>alert(1)</script>` no campo de feedback/observações
- SQL injection: `' OR 1=1 --` no campo de busca de clientes
- Emojis em nome / mensagem

**Casos de performance:**
- Cliente com 100+ agendamentos no histórico — paginação? loading lento?
- Buscar horários disponíveis em janela de 6 meses — backend trava?
- 50+ unidades — dropdown vira pesadelo?

**Casos de regressão visual:**
- Modo escuro (se houver toggle)
- Zoom 200% do browser
- Tela ultra-larga (3440px)
- iPhone SE (375px) — caminho mais apertado
- Tablet retrato (768px)

**Fluxos não cobertos:**
- Reagendar (mudar data/hora de agendamento existente)
- Avaliação pós-atendimento (se houver)
- Notificações push / email — chegam? quando?
- NFS-e emitida automaticamente ao concluir — gera mesmo?
- Comissão calculada — aparece corretamente em /comissoes?
- Anamnese: cliente preenche → profissional vê
- Recorrência: criar agendamento recorrente semanal
- Despesas (gestor cadastra → aparece no relatório financeiro)

### Formato da entrega da Parte 2

Pra cada cenário novo que você propor, use esse template:

```
### [CATEGORIA] Nome curto do cenário

**Quem testa:** (cliente / profissional / admin / anônimo)
**Por que importa:** (regra de negócio quebrada, regressão potencial, edge case real)
**Passos:**
1. ...
2. ...
3. ...
**Resultado esperado:** ...
**Severidade se falhar:** 🔴 crítico / 🟡 médio / 🟢 cosmético
```

### Critério de "boa proposta"

- **Não duplica** os 8 cenários do prompt original
- **Testável**: dá pra executar manualmente no navegador (não exige hack interno do banco)
- **Realista**: alguém real faria isso, OU é vetor de ataque comum
- **Específico**: não basta "testar segurança" — proponha A AÇÃO ESPECÍFICA que abusaria

### Quantidade

Mire em **10 a 20 cenários novos** distribuídos pelas categorias. Não force quantidade — qualidade > quantidade. Se 12 cenários ótimos cobrem tudo que faz sentido, melhor que 20 cenários repetitivos.

### Bônus: priorize

Ao final dos cenários propostos, liste os **top 5 mais críticos** pra rodar primeiro, ordenados por risco × probabilidade.

---

## Parte 3: cenários novos da rodada anterior — EXECUTE TAMBÉM

A rodada anterior do QA já propôs 17 cenários adicionais. Execute pelo menos os **top 5 críticos** abaixo (são vetores reais de ataque ou bugs frequentes). Marque PASS/FAIL conforme template da Parte 2.

### TOP 1 — SEC: cliente manipula `clienteId` no payload

1. Logue como cliente, crie um agendamento normal pelo wizard
2. F12 → Network → ache o `POST /api/publico/clientes/agendamentos` → botão direito → "Copy as fetch"
3. Cole no console, MUDE `clienteId` pra outro número (ex: `1`, `2`, `99`)
4. Submeta
5. **Esperado:** servidor IGNORA o clienteId do body e usa o ID do JWT — agendamento cai pro cliente certo ou retorna 403. Se cair pro `clienteId` adulterado, é IDOR crítico

### TOP 2 — SEC: copiar URL com `unidadeId` de outro tenant

1. Em outra aba, logue como `cliente@academia.demo.com` / `Demo@2026`
2. Anote o ID da unidade da Academia (via Network ou GET `/api/publico/clientes/unidades`)
3. Faça logout, logue como `cliente@salao.demo.com`
4. Cole `/cliente/agendar?unidadeId=<id_da_academia>` na URL
5. **Esperado:** o wizard NÃO carrega serviços nem horários da Academia. Mostra "Unidade não encontrada" ou ignora o param

### TOP 3 — Race condition: dois clientes mesmo slot simultâneo

1. Em DOIS perfis Chrome separados, logue 2 clientes diferentes (`cliente@salao.demo.com` e `cliente@academia.demo.com` precisariam estar no mesmo tenant — alternativa: criar 2 cadastros no mesmo salão via guest checkout)
2. Ambos chegam ao passo 3 do wizard com o MESMO horário do MESMO profissional
3. Clique "Confirmar" em ambas as abas simultaneamente
4. **Esperado:** um recebe 201, outro 409 com "Horário não disponível"

### TOP 4 — SEC: profissional acessa endpoint de outra unidade

1. Logue como profissional, abra F12 → Console
2. Pegue o token: `localStorage.getItem('token')`
3. Tente fetch de outra unidade:
   ```js
   fetch('/api/profissional/agendamentos/hoje?unidadeId=99', {
     headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
   }).then(r => r.json()).then(console.log)
   ```
4. **Esperado:** lista vazia ou 403 — nunca retorna agendamentos de unidade fora do tenant

### TOP 5 — XSS no campo de feedback

1. Vá em `/reclamacoes` (anônimo ou logado)
2. No campo "Sua mensagem", cole: `<img src=x onerror=alert('xss')>` e também `<script>alert(1)</script>`
3. Envie
4. Logue como ADMINISTRADOR e abra `/notificacoes`
5. **Esperado:** alert NÃO dispara em nenhum dos dois lados; texto aparece como string literal

### Cenários extras (faça se sobrar tempo)

- **Reagendar** (botão "Reagendar" no card do cliente) — verifica se mantém ID ou cria novo
- **Disponibilidade janela 6 meses** — navega 20+ semanas no calendário, mede latência
- **Tab navigation** no wizard de agendamento — fluxo completo sem mouse
- **Estado vazio** — cliente novo sem agendamentos vê empty state amigável

---

## Como reportar

Ao final, entregue **3 blocos**:

### 1. Tabela de retests dos bugs B1–B8
| ID | Status | Observação |
|---|---|---|
| B1 | ✅/❌/⚠️ | ... |

### 2. Tabela dos 8 cenários originais + 5 críticos da Parte 3
| Cenário | Status | Bugs novos encontrados |
|---|---|---|

### 3. Lista priorizada de TODOS os bugs encontrados nesta rodada
- 🔴 Crítico: ...
- 🟡 Médio: ...
- 🟢 Cosmético: ...

### 4. Novos cenários propostos (Parte 2 do brainstorm)
- Mantenha o template (categoria, quem testa, passos, esperado, severidade)
- Mire em cenários ainda NÃO cobertos pelos 17 anteriores
