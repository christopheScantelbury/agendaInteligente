# Script de QA — Agenda Inteligente
> Agente: execute cada caso na ordem indicada. Registre PASS ✅ ou FAIL ❌ ao lado de cada item.
> URL base: **https://agenda-inteligente-app.vercel.app**
> Credenciais primárias: **qa@agendainteligente.com / Qa@123456** (perfil ADMINISTRADOR)
> Credenciais seed (após V55 migrar): **admin@agendainteligente.com / 123456**

---

## CONVENÇÕES

| Símbolo | Significado |
|---------|------------|
| **[AÇÃO]** | Clique, preencha ou navegue |
| **[ESPERA]** | Aguarde o elemento aparecer (max 5s) |
| **[VERIFICA]** | Assert — confirme o que deve estar visível |
| **[DADO]** | Valor exato a digitar |

Ao encontrar um FAIL, anote: URL, elemento, mensagem de erro. Continue para o próximo caso.

---

## MÓDULO 1 — AUTENTICAÇÃO

### 1.1 Login com credenciais inválidas
1. [AÇÃO] Navegue para `/login`
2. [DADO] email: `invalido@naoexiste.com` · senha: `senhaerrada`
3. [AÇÃO] Clique em "Entrar"
4. [VERIFICA] Toast de erro visível
5. [VERIFICA] Permanece em `/login`

### 1.2 Login com credenciais válidas
1. [AÇÃO] Navegue para `/login`
2. [DADO] email: `qa@agendainteligente.com` · senha: `Qa@123456`
3. [AÇÃO] Clique em "Entrar"
4. [VERIFICA] Redireciona para `/` (Dashboard ou primeiro menu permitido)
5. [VERIFICA] Menu lateral visível com o nome do usuário

### 1.3 Logout
1. [AÇÃO] Com sessão ativa, clique no botão de logout no menu
2. [VERIFICA] Redireciona para `/login` ou `/`
3. [VERIFICA] Não há mais token de sessão (tentar acessar `/agendamentos` redireciona para login)

---

## MÓDULO 2 — DASHBOARD (BUG-03/09 corrigido)

### 2.1 Dashboard visível após login
1. [AÇÃO] Faça login como `qa@agendainteligente.com`
2. [VERIFICA] URL é `/` — NÃO redireciona automaticamente para `/agendamentos`
3. [VERIFICA] Página exibe cards de KPIs (agendamentos, clientes, receita ou equivalente)
4. [VERIFICA] Não há erro 404 ou tela em branco

### 2.2 Dashboard acessível via menu
1. [AÇÃO] Clique em "Início" ou ícone de casa no menu lateral
2. [VERIFICA] URL muda para `/`
3. [VERIFICA] Cards de KPIs visíveis

---

## MÓDULO 3 — CLIENTES (BUG-01 corrigido)

### 3.1 Listagem de clientes — ADMINISTRADOR vê sua base
1. [AÇÃO] Navegue para `/clientes`
2. [VERIFICA] Lista de clientes carrega (não fica vazia / sem spinner infinito)
3. [VERIFICA] Os clientes exibidos pertencem às unidades do ADMINISTRADOR logado

### 3.2 Busca e ordenação
1. [AÇÃO] Em `/clientes`, clique na coluna "Nome" para ordenar
2. [VERIFICA] Lista reordena A→Z
3. [AÇÃO] Clique novamente em "Nome"
4. [VERIFICA] Lista reordena Z→A

### 3.3 Criação de cliente
1. [AÇÃO] Clique em "Novo Cliente"
2. [DADO] Nome: `Cliente QA Teste` · Email: `clienteqa@teste.com` · CPF: `123.456.789-09`
3. [AÇÃO] Selecione uma unidade no campo Unidade
4. [AÇÃO] Clique em "Salvar"
5. [VERIFICA] Toast de sucesso visível
6. [VERIFICA] Cliente aparece na listagem

### 3.4 Edição de cliente
1. [AÇÃO] Na linha de "Cliente QA Teste", clique em Editar (ícone lápis)
2. [AÇÃO] Altere o nome para `[DADO] Cliente QA Editado`
3. [AÇÃO] Clique em "Salvar"
4. [VERIFICA] Toast de sucesso
5. [VERIFICA] Nome atualizado na lista

### 3.5 Coluna Endereço visível em telas grandes
1. [AÇÃO] Navegue para `/clientes` em viewport ≥ 1024px
2. [VERIFICA] Coluna "Endereço" visível na tabela

---

## MÓDULO 4 — PROFISSIONAIS / ATENDENTES

### 4.1 Listagem de profissionais
1. [AÇÃO] Navegue para `/profissionais`
2. [VERIFICA] Tabela carrega com colunas Nome, Email, Comissão, Ativo

### 4.2 Criação de profissional
1. [AÇÃO] Clique em "Novo Profissional"
2. [DADO] Nome: `Prof QA` · Email: `profqa@teste.com` · Senha: `Qa@123456`
3. [DADO] CPF: `987.654.321-00`
4. [AÇÃO] Selecione um perfil (ex: PROFISSIONAL)
5. [AÇÃO] Clique em "Salvar"
6. [VERIFICA] Toast de sucesso
7. [VERIFICA] Prof QA aparece na lista

### 4.3 Edição de profissional
1. [AÇÃO] Na linha de "Prof QA", clique em Editar
2. [AÇÃO] Altere Percentual de Comissão para `[DADO] 10`
3. [AÇÃO] Clique em "Salvar"
4. [VERIFICA] Toast de sucesso
5. [VERIFICA] Comissão exibida como `10.00%` na lista

---

## MÓDULO 5 — AGENDAMENTOS

### 5.1 Visualização do calendário — modo Calendário
1. [AÇÃO] Navegue para `/agendamentos`
2. [AÇÃO] Clique no botão "Calendário" (modo calendário)
3. [VERIFICA] Calendário semanal visível com horários

### 5.2 Alternar dia/semana (BUG-06 corrigido)
1. [AÇÃO] No calendário, clique no botão "Dia"
2. [VERIFICA] Calendário muda para visão de dia (1 coluna)
3. [AÇÃO] Clique no botão "Semana"
4. [VERIFICA] Calendário muda para visão semanal (7 colunas)
5. [VERIFICA] O botão ativo muda de destaque corretamente

### 5.3 Criação de agendamento
1. [AÇÃO] Clique em "Novo agendamento"
2. [AÇÃO] Preencha todos os campos obrigatórios (cliente, serviço, data/hora, profissional)
3. [AÇÃO] Clique em "Salvar"
4. [VERIFICA] Toast de sucesso
5. [VERIFICA] Evento aparece no calendário

### 5.4 Visualização — modo Lista (linha do tempo)
1. [AÇÃO] Clique no botão "Lista"
2. [VERIFICA] Mini-calendário mensal visível à esquerda
3. [VERIFICA] Timeline diária com agendamentos visível à direita

---

## MÓDULO 6 — ANAMNESES (BUG-04 verificado)

### 6.1 Listagem de anamneses
1. [AÇÃO] Navegue para `/anamneses`
2. [VERIFICA] Lista de fichas de anamnese ou mensagem "Nenhuma ficha cadastrada"

### 6.2 Validação de cliente obrigatório
1. [AÇÃO] Clique em "Nova Ficha"
2. [AÇÃO] NÃO preencha o campo Cliente
3. [AÇÃO] Clique em "Salvar" (ou botão de submit)
4. [VERIFICA] Toast de erro: "Selecione um cliente"
5. [VERIFICA] Formulário não é submetido

### 6.3 Validação de procedimento obrigatório
1. [AÇÃO] Em nova ficha, selecione um cliente mas deixe o Procedimento em branco
2. [AÇÃO] Clique em "Salvar"
3. [VERIFICA] Toast de erro: "Informe o procedimento"

### 6.4 Criação completa de anamnese
1. [AÇÃO] Preencha: Cliente (selecione via autocomplete), Procedimento, Data
2. [AÇÃO] Responda ao menos uma pergunta Sim/Não
3. [AÇÃO] Clique em "Salvar"
4. [VERIFICA] Toast de sucesso "Ficha salva com sucesso!"
5. [VERIFICA] Redireciona para `/anamneses`
6. [VERIFICA] Nova ficha aparece na lista

---

## MÓDULO 7 — RECLAMAÇÕES (BUG-05 verificado)

### 7.1 Envio de reclamação anônima
1. [AÇÃO] Navegue para `/reclamacoes` (pode ser feito sem login)
2. [AÇÃO] (Opcional) Selecione uma unidade
3. [DADO] Mensagem: `Teste de reclamação QA automatizado`
4. [AÇÃO] Clique em "Enviar Reclamação"
5. [VERIFICA] Toast de sucesso: "Reclamação enviada com sucesso! Obrigado pelo seu feedback."
6. [VERIFICA] Formulário é limpo após envio

### 7.2 Validação de mensagem vazia
1. [AÇÃO] Em `/reclamacoes`, deixe o campo de mensagem vazio
2. [AÇÃO] Clique em "Enviar Reclamação"
3. [VERIFICA] Toast de aviso "Por favor, digite sua reclamação" OU validação HTML5

---

## MÓDULO 8 — CONFIGURAÇÕES (BUG-08 corrigido)

### 8.1 Seção "Conta" visível
1. [AÇÃO] Navegue para `/configuracoes`
2. [VERIFICA] Seção "1. Conta" visível com campos Nome, Email, Telefone
3. [VERIFICA] Campos pré-preenchidos com os dados do usuário logado

### 8.2 Campo "Senha atual" presente
1. [AÇÃO] Localize a seção "Alterar senha"
2. [VERIFICA] Campo "Senha atual" está presente ANTES de "Nova senha"
3. [VERIFICA] Três campos no total: Senha atual, Nova senha, Confirmar nova senha

### 8.3 Troca de senha — validação de senha atual incorreta
1. [DADO] Senha atual: `senhaerrada`
2. [DADO] Nova senha: `NovaSenha@123`
3. [DADO] Confirmar: `NovaSenha@123`
4. [AÇÃO] Clique em "Salvar Senha" ou equivalente
5. [VERIFICA] Toast de erro "Senha atual incorreta"

### 8.4 Troca de senha — sucesso
1. [DADO] Senha atual: `Qa@123456`
2. [DADO] Nova senha: `NovaSenha@2026`
3. [DADO] Confirmar: `NovaSenha@2026`
4. [AÇÃO] Clique em "Salvar Senha"
5. [VERIFICA] Toast de sucesso "Senha alterada com sucesso."
6. [AÇÃO] Faça logout e tente login com `NovaSenha@2026`
7. [VERIFICA] Login bem-sucedido
8. [AÇÃO] Restaure a senha para `Qa@123456` (repita o processo)

---

## MÓDULO 9 — PROFISSIONAIS: RETORNOS DE CLIENTES

### 9.1 Aba de retornos em cliente
1. [AÇÃO] Em `/clientes`, abra qualquer cliente
2. [AÇÃO] Clique na aba "Retornos" (se existir)
3. [VERIFICA] Lista de agendamentos anteriores ou mensagem "Nenhum retorno"

### 9.2 Prazo personalizado
1. [AÇÃO] No componente de retornos, selecione "Personalizado" no select de prazo
2. [VERIFICA] Campo numérico aparece para digitar o número de dias
3. [DADO] Digite `45`
4. [VERIFICA] Lista filtra clientes com retorno em até 45 dias

---

## MÓDULO 10 — INSTALL PROMPT PWA (BUG-10 corrigido)

### 10.1 Prompt não bloqueia UI imediatamente
1. [AÇÃO] Abra a URL base em modo iOS Safari ou Chrome Android
2. [VERIFICA] Nos primeiros 10 segundos, nenhum banner de instalação é exibido
3. [VERIFICA] É possível navegar e usar o app normalmente

### 10.2 Prompt pode ser dispensado
1. [AÇÃO] Aguarde 30s+ para o prompt aparecer (se em iOS)
2. [AÇÃO] Clique em "Depois" ou no X
3. [VERIFICA] Banner fecha
4. [VERIFICA] Não reaparece na mesma sessão ao navegar para outra página

---

## MÓDULO 11 — NAVEGAÇÃO E PERMISSÕES

### 11.1 Rota /unidades redireciona ADMINISTRADOR
1. [AÇÃO] Com login de ADMINISTRADOR, tente acessar `/unidades` diretamente
2. [VERIFICA] Redireciona para `/configuracoes` (comportamento esperado para ADMINISTRADOR)

### 11.2 Rotas protegidas sem login
1. [AÇÃO] Sem estar logado, acesse `/agendamentos`
2. [VERIFICA] Redireciona para `/login`

### 11.3 Menu lateral mostra apenas rotas permitidas
1. [AÇÃO] Faça login como ADMINISTRADOR
2. [VERIFICA] Menu NÃO exibe "Unidades" nem "Empresas" (rotas bloqueadas para esse perfil)
3. [VERIFICA] Menu exibe "Configurações"

---

## MÓDULO 12 — SERVIÇOS

### 12.1 Listagem
1. [AÇÃO] Navegue para `/servicos`
2. [VERIFICA] Lista carrega sem erros

### 12.2 Criação
1. [AÇÃO] Clique em "Novo Serviço"
2. [DADO] Nome: `Serviço QA` · Duração: `60` · Preço: `150,00`
3. [AÇÃO] Clique em "Salvar"
4. [VERIFICA] Toast de sucesso
5. [VERIFICA] Serviço aparece na lista

---

## MÓDULO 13 — NOTIFICAÇÕES

### 13.1 Listagem
1. [AÇÃO] Navegue para `/notificacoes`
2. [VERIFICA] Lista carrega ou exibe "Nenhuma notificação"

---

## RESUMO DE BUGS CORRIGIDOS NESTE DEPLOY

| Bug | Descrição | Como verificar |
|-----|-----------|----------------|
| BUG-01 | ADMINISTRADOR via lista vazia de clientes | Módulo 3.1 |
| BUG-03/09 | Dashboard nunca era exibido | Módulo 2.1–2.2 |
| BUG-06 | Botão "Semana" no calendário não funcionava | Módulo 5.2 |
| BUG-08 | Faltava campo "Senha atual" em Configurações | Módulo 8.2–8.4 |
| BUG-10 | Banner PWA bloqueava UI imediatamente | Módulo 10.1–10.2 |
