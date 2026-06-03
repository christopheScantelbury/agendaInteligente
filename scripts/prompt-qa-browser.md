# Prompt: QA E2E no navegador — agendaInteligente

Cole esse prompt no agente do Chrome (Claude in Chrome / outro browser agent). Ele vai abrir as duas contas (cliente + profissional) e testar o fluxo completo de agendamento.

> **IMPORTANTE — antes de começar:** use **DOIS perfis separados do Chrome** (não duas abas no mesmo perfil). Perfil 1 = Cliente, Perfil 2 = Profissional. Sem isso, o `localStorage` é compartilhado e contamina dados entre os logins (ex: nome do profissional vaza no formulário do cliente). Foi um bug reportado e a workaround é separar perfis.

> **SW deve estar em v49 ou mais novo.** Verifique em DevTools → Application → Service Workers → `agenda-inteligente-v49-…`. Se estiver em versão anterior, force "Update" + recarregue antes de testar.

---

## Parte 0 — NOVAS funcionalidades desta release (v49)

Antes dos retests antigos, valide tudo que entrou na rodada Sprint Forms+Comissões+Despesas. Estrutura: PASS/FAIL por cenário, bug detalhado se falhar.

### F1 — Máscara monetária R$ em Serviços e Despesas (#148)

1. Logue como `admin@salao.demo.com` (ou `chris@agendainteligente.com`) e vá em `/servicos`
2. Clique em **"Novo serviço"** → digite no campo Valor: `12345` (sem vírgula nem ponto)
3. **Esperado**: exibe **R$ 123,45** durante a digitação (comportamento calculadora)
4. Digite `1` → deve mostrar `R$ 0,01`. Digite `100` → `R$ 1,00`. Digite `10000` → `R$ 100,00`
5. Salve. Reabra editando → o valor deve ser hidratado mascarado também
6. Repita em `/despesas` → "Nova despesa" → campo Valor
7. Repita em `/comissoes` → "Nova regra" → tipo **Valor fixo (R$)** (no tipo Percentual o campo é número simples; não testar máscara R$)

### F2 — Telefone com máscara em Profissionais (#144)

1. Vá em `/atendentes` → "Novo profissional"
2. Campo Telefone: digite somente dígitos `92991234567` (11)
3. **Esperado**: máscara automática `(92) 99123-4567` durante a digitação
4. Apague e digite 10 dígitos `9234567890` → vira `(92) 3456-7890`

### F3 — Busca de clientes na Anamnese (#145)

1. Vá em `/anamneses` → "Nova anamnese"
2. No campo Cliente, digite `mar` (3 letras)
3. **Esperado**: dropdown lista clientes com Maria/Mariana/Marcos
4. Apague e digite `MARÍLIA` (com acento) ou `MARILIA` (sem acento) → ambos devem achar "Marília" se existir
5. Tente também o telefone do cliente (ex.: `929912`) → deve achar pelo telefone
6. Tente o email (ex.: `cliente@`) → deve achar pelo email
7. Selecione um cliente; o nome fica pré-preenchido

### F4 — Filtro de busca de Clientes (#146)

1. Vá em `/clientes` (aba Gerenciamentos)
2. Digite na busca: nome parcial, telefone (qualquer trecho), CPF parcial, email parcial
3. **Esperado**: cada termo filtra corretamente. Acentos não devem importar.

### F5 — Filtro "Personalizado" em Sumidos (#147)

1. Vá em `/clientes` → aba **Sumidos**
2. No select "Último atendimento há", escolha **"Personalizado…"**
3. **Esperado**: vira um input numérico de **dias** + label "dias" + botão "voltar"
4. Digite `45` → query roda e atualiza a lista
5. Clique "voltar" → volta ao select de presets (15/30/60/90)
6. Repita pro select "Mínimo de atendimentos"

### F6 — Vales/Adiantamentos de comissão (#142) — NOVO

1. Logue como admin/gerente, vá em `/comissoes` → escolha um profissional
2. Botão **"Vales"** aparece no header da aba Pendentes (ao lado de "Pagar comissão")
3. Clique em "Vales" → modal abre com:
   - Topo: "Total de vales pendentes: R$ X,XX"
   - Botão "Adicionar vale"
   - Tabs: "Ainda não descontados (N)" / "Já descontados (M)"
4. Clique "Adicionar vale" → form inline: Valor (com máscara R$), Data, Observação
5. Preencha Valor `5000` → mostra "R$ 50,00", Data hoje, Observação "Vale teste"
6. **Esperado**: salva, aparece na lista de pendentes, topo atualiza pra R$ 50,00
7. Tente excluir um vale pendente → modal de confirmação vermelho → confirma → some
8. Crie outro vale pra usar no F7

### F7 — Pagamento de comissão com abatimento de vales (#141) — NOVO

1. Em `/comissoes`, selecione 1+ atendimentos pendentes (checkboxes)
2. Clique **"Pagar comissão"** → modal **"Pagamento de comissão"** abre
3. **Verifique o resumo financeiro**:
   - Comissão bruta (= soma do que você selecionou)
   - Vales a descontar (R$ 0,00 inicialmente, em laranja se selecionar algum)
   - **Líquido a pagar** (verde se ≥ 0)
4. Verifique que **"Forma de pagamento" é obrigatório** — se ficar "Selecione…", botão "Confirmar pagamento" fica DESABILITADO
5. Escolha forma (PIX/Dinheiro/etc.)
6. Marque um ou mais vales na lista "Vales disponíveis" → líquido recalcula em tempo real
7. Se selecionar vales que somam mais que o bruto → banner vermelho "Total de vales excede a comissão" + botão desabilita
8. Confirme com seleção válida
9. **Esperado**: toast "Pagamento registrado". Reabra Vales → os marcados agora estão em **"Já descontados"** com "descontado no pagamento #X"
10. Vá pra aba Pagamentos → o registro tem `valorBruto`, `valorVales`, `valorTotal` (líquido)

### F8 — Despesas Regular / Fixa Mensal / Parcelada (#143) — NOVO

1. Vá em `/despesas` → "Nova despesa"
2. Topo do form: **3 cards** "Regular" (default) / "Fixa Mensal" / "Parcelada"

**Teste 1 — Regular (comportamento antigo)**:
3. Mantenha em **Regular**, preencha nome/valor/data/categoria, salve
4. **Esperado**: 1 despesa criada normalmente

**Teste 2 — Parcelada**:
5. Clique em **Parcelada** → aparece bloco violet com input "Quantidade de parcelas"
6. Digite valor `50000` (R$ 500), 5 parcelas, vencimento hoje
7. **Esperado**: rodapé mostra preview "Cada parcela: R$ 100,00 — vencimento mensal a partir de…"
8. Salve. Vá na listagem
9. **Esperado**: aparecem 5 despesas com nome "Despesa X (1/5)", "(2/5)", … vencimentos +1 mês cada
10. Última parcela pode ter ajuste de centavo (ex: R$ 500 / 3 = R$ 166,67 × 2 + R$ 166,66 = exato)

**Teste 3 — Fixa Mensal**:
11. Clique em **Fixa Mensal** → aparece bloco violet com "Fim (opcional)" + "Marcar como pago"
12. Vencimento (= início) = hoje, sem data fim, "Marcar como pago: Apenas a primeira"
13. **Esperado**: gera 12 despesas (1 por mês). A 1ª nasce com status **PAGA**, as outras 11 em **RASCUNHO**
14. Teste com data fim explícita (ex: +3 meses) e modo "Nenhuma" → 4 despesas todas RASCUNHO

### F9 — Auditoria SEC (regression checks) — CRÍTICO

Estes testes garantem que os 3 fixes de segurança não foram quebrados:

**SEC-1: Admin de tenant A não pode agendar em tenant B**
1. Logue como `chris@agendainteligente.com` (admin global) e crie um agendamento normal
2. Logue como admin de outro tenant (ou simule via DevTools manipulando o JWT, se tiver acesso)
3. Tente POST `/api/agendamentos` com `unidadeId` pertencente ao tenant Salao
4. **Esperado**: 403 ou erro "Você não tem permissão para criar agendamentos nesta unidade"

**SEC-2: Seed só com admin GLOBAL**
1. Logue como `salao@demo.com` (admin de tenant, ROLE_ADMINISTRADOR)
2. Tente POST `/api/admin/seed-demo`
3. **Esperado**: 401 "Não autorizado"
4. Logue como `chris@agendainteligente.com` (ROLE_ADMIN puro)
5. Tente o mesmo POST → **Esperado**: 200 OK + sementes criadas

**SEC-3: Reclamação rejeita unidadeId inválido**
1. Sem login, POST `/api/publico/reclamacoes` com `unidadeId: 99999` (inexistente)
2. **Esperado**: 400 "Unidade não encontrada"
3. POST com `unidadeId: null` ou omitido → **Esperado**: 201 (reclamação anônima permitida)

---

## Parte 1 — Retests da rodada anterior (B1–B8)

Status conhecido após commits `ff4d695` (v45) e `a85feab` (v46). Confirme cada um em v49:

| ID | O que verificar | Esperado | Status esperado em v49 |
|---|---|---|---|
| **B1** | Login como `profissional@salao.demo.com` em `/login` | Vai pra `/profissional/hoje` SEM mostrar "Conta não vinculada como atendente". Se aparecer, peça pra rodar `POST /api/admin/seed-demo` autenticado como `chris@agendainteligente.com` | ⚠️ **Operacional** (precisa re-rodar seed em prod) |
| **B2** | Em `/cliente/meus-agendamentos`, abra qualquer card | Campos **"Atendente:"** e **"Serviços:"** mostram VALORES (nome do profissional + nome dos serviços), não vazios | ✅ |
| **B3** | Cliente cria novo agendamento, clica "Confirmar agendamento" | Toast verde "Agendamento realizado com sucesso!" aparece por ~1,5s antes de redirecionar pra `/cliente/meus-agendamentos` | ✅ |
| **B4** | Cliente cancela um agendamento ativo | Toast "Agendamento cancelado e movido para o histórico." | ✅ |
| **B5** | Perfil cliente → seção "Conta" → botão "Sair" | Ícone do círculo em **violet** | ✅ |
| **B6** | Tela `/cliente` → saudação | "Olá, **Cliente Salao**" (nome completo) | ✅ |
| **B7** | Em perfil separado do Chrome, sem login admin, Perfil → "Enviar feedback" | Form pré-preenche **"Cliente Salao"** no campo Nome | ✅ |
| **B8** | Após enviar feedback | Tela de sucesso "Mensagem enviada!" + botões "Enviar outra" / "Voltar para meu perfil" | ✅ |
| **B-NEW-1** | Em `/cliente/agendar` via navegação SPA (não hard refresh) | Wizard mostra seletor de unidades (loading skeleton se carregando, cards se múltiplas, auto-select se 1) — **nunca** mostra "Selecione uma unidade primeiro" sem UI | ✅ |

Reporte cada retest como `✅ corrigido` / `❌ ainda quebrado` / `⚠️ parcial`.

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
