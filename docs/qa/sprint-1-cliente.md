# QA — Sprint 1 (Cliente)

> Prompt para o agente de QA. Cole numa sessão nova.

## Contexto
- Frontend: https://agendainteligente-aleefhenriiques-projects.vercel.app
- Backend: https://agendainteligente-production.up.railway.app
- Stories: #80 (Layout), #81 (Home), #82 (Wizard 3 passos), #83 (Cadastro + Recuperar senha), #84 (Onboarding)
- Doc-base: AgendaInteligente_Redesign_UX.docx §3.1 + §4.1/§4.2

## Pré-requisito
Rodar `POST /api/admin/seed-demo` com header `X-Seed-Token` (pedir ao Chris).

## Credenciais
- **Cliente final:** `cliente@salao.demo.com` / `Demo@2026`
- **Cliente final 2:** `cliente@academia.demo.com` / `Demo@2026`

## Dispositivo
**Mobile 375px** primeiro — interface é app-style. Depois desktop.

---

## T1.1 — Login (#83)
URL: `/cliente/login`

- [ ] Logo do AgendaInteligente visível no topo
- [ ] Título: **"Bem-vindo!"** (NÃO "Área do Cliente")
- [ ] Subtítulo: "Marque seu horário em poucos toques"
- [ ] Campo "E-mail ou CPF" + senha
- [ ] **Toggle de mostrar/ocultar senha** (ícone olho) funciona
- [ ] **Link "Esqueci minha senha"** visível abaixo da senha
- [ ] Login com credencial errada mostra mensagem de erro clara
- [ ] Login com `cliente@salao.demo.com` redireciona para `/cliente` (NÃO `/cliente/agendar`)
- [ ] Link "Cadastre-se grátis" leva para `/cliente/cadastro`

## T1.2 — Cadastro reduzido (#83)
URL: `/cliente/cadastro`

- [ ] Form tem **apenas 7 campos**: Nome, CPF, Data Nascimento, Email, Telefone, Senha, Confirmar Senha
- [ ] NÃO tem: RG, CEP, Endereço, Número, Complemento, Bairro, Cidade, UF
- [ ] Máscara de CPF: `000.000.000-00` ao digitar
- [ ] Máscara de telefone: `(00) 00000-0000`
- [ ] Senha < 6 caracteres mostra erro
- [ ] Senhas diferentes mostram erro
- [ ] Após cadastro, faz login automático e redireciona para `/cliente/agendar`

## T1.3 — Recuperar senha (#83)
- [ ] `/cliente/recuperar-senha` carrega com logo + título "Recuperar senha"
- [ ] Envio mostra mensagem genérica ("Se essa conta existir, enviamos um e-mail...") — não revela se conta existe
- [ ] `/cliente/redefinir-senha` SEM `?token=` mostra tela "Link inválido"
- [ ] `/cliente/redefinir-senha?token=abc` mostra form de nova senha
- [ ] Senhas diferentes mostram erro
- [ ] Submit com token inválido mostra erro do backend

## T1.4 — Home do cliente (#81)
Logar e ir para `/cliente`.

**Layout (#80):**
- [ ] Bottom nav fixo na parte inferior com 3 itens: **Início** (Home), **Meus horários** (Calendar), **Perfil** (User)
- [ ] Item ativo "Início" em violet
- [ ] Header com logo + botão sair (LogOut)
- [ ] Área de toque >= 44px no bottom nav
- [ ] Em iPhone com home indicator, bottom nav respeita safe area

**Onboarding (#84):**
- [ ] **Modal de boas-vindas** aparece automaticamente no primeiro login
- [ ] Texto: "Bem-vindo, [primeiro nome]!" com gradiente violet
- [ ] Subtítulo: "Aqui você marca seus horários em segundos..."
- [ ] Botão "Iniciar tour" abre tour com **4 passos** (driver.js)
- [ ] Sequência: próximo horário → CTA → favoritos → bottom nav
- [ ] Botões "Anterior", "Próximo", "Concluir" funcionam
- [ ] Botão "Pular por agora" no modal fecha sem tour
- [ ] Após dispensar, modal **NÃO aparece em refresh** (verificar `localStorage.cliente_onboarding_visto_v1`)

**Conteúdo:**
- [ ] Saudação "Olá, [primeiro nome]"
- [ ] Bloco "Próximo horário": card violet com countdown OU empty state com ícone Calendar
- [ ] Botão CTA grande "+ Marcar novo horário" violet (≥ 56px de altura)
- [ ] Tap no CTA leva para `/cliente/agendar`
- [ ] Bloco Favoritos: carrossel horizontal (se houver agendamentos passados)
- [ ] Bloco Histórico: colapsável "Histórico (N)" com max 5 itens + "Ver tudo" se > 5

## T1.5 — Wizard de agendamento 3 passos (#82)
Em `/cliente/agendar` (logado).

**Geral:**
- [ ] Barra de progresso violet no topo com 3 barras
- [ ] Indicador "1/3", "2/3", "3/3"
- [ ] Seta de voltar funciona em cada passo

**Passo 1 — Serviço:**
- [ ] Se há > 1 unidade ativa: dropdown de unidade aparece
- [ ] Se há 1 unidade: dropdown não aparece (auto-selecionada)
- [ ] Busca filtra por nome/descrição
- [ ] Lista vertical de cards com nome, duração, valor, ChevronRight
- [ ] Tap em serviço avança para Passo 2

**Passo 2 — Horário:**
- [ ] Card no topo mostra serviço escolhido + unidade
- [ ] Calendário/seletor de data funciona
- [ ] Slots disponíveis aparecem
- [ ] Tap em slot avança para Passo 3
- [ ] Seta voltar retorna ao Passo 1 mantendo seleção

**Passo 3 — Confirmar:**
- [ ] Resumo em rows: Serviço, Data e hora, Profissional, Local, **Valor (em negrito)**
- [ ] Radio group "Forma de pagamento" com 3 opções: **No local (default)**, Pix, Cartão
- [ ] Link "Trocar horário" volta ao Passo 2
- [ ] Botão "Confirmar agendamento" violet com ícone CheckCircle
- [ ] Sucesso: notification verde + redireciona para `/cliente`
- [ ] **Anti-race-condition (P003-2):** Abrir 2 abas, pegar mesmo slot na primeira, tentar confirmar na segunda → segunda recebe erro "Esse horário foi ocupado enquanto você decidia" e volta ao Passo 2

## T1.6 — Perfil cliente (#84)
Tap em "Perfil" no bottom nav.

- [ ] URL: `/cliente/perfil`
- [ ] Card com Nome, E-mail, ID do cliente
- [ ] Seção "Ajuda" com botão "Refazer tour" (ícone RefreshCw)
- [ ] Tap em "Refazer tour" → limpa flag, redireciona para `/cliente`, modal reaparece, tour dispara
- [ ] Seção "Conta" com botão "Sair" (vermelho)
- [ ] Tap em "Sair" abre ConfirmDialog
- [ ] Confirmar leva para `/cliente/login` e limpa sessão (verificar `localStorage`)

---

## Critérios de aceite do Sprint 1
- [ ] Cliente NUNCA vê menus de gestão, lista de outros clientes, relatórios
- [ ] Tempo médio para criar agendamento: medir manualmente — esperado < 60s
- [ ] Cadastro inicial em < 30s (apenas 7 campos)

## Pontos críticos do Discovery
- **P028-1 (sev 4):** ✅ Cadastro 7 campos
- **P027-1, P027-2, P027-3:** ✅ Login tem logo, "Esqueci senha", título amigável
- **P003-2 (sev 3):** ✅ Wizard revalida slot antes de confirmar

## Formato pra reportar bugs
```
Story: #80-#84
Tela: ...
Dispositivo: Mobile 375px / Desktop
Passos: ...
Esperado: ...
Obtido: ...
Severidade: 0-4 (escala Nielsen do Discovery §2.2)
Screenshot anexado.
```

Abrir issue com label `qa-feedback` referenciando a story.
