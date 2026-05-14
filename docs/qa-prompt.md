# Prompt para Agente QA — Agenda Inteligente

## Contexto do Sistema

**Produto:** Agenda Inteligente — sistema SaaS de agendamento para clínicas e salões  
**URL Produção (frontend):** https://agendainteligenteapp.cloud (ou URL configurada)  
**URL Produção (backend):** https://agendainteligentebackend.agendainteligenteapp.cloud  
**Swagger:** `GET /swagger-ui.html`

O sistema possui **5 perfis de usuário** com permissões distintas:

| Perfil | Descrição |
|--------|-----------|
| `ADMIN` | Super-admin — acesso total a todas as empresas |
| `ADMINISTRADOR` | Admin da empresa — gerencia 1 empresa/unidade |
| `GERENTE` | Gerencia uma unidade específica |
| `PROFISSIONAL` | Atendente — vê seus agendamentos e horários |
| `CLIENTE` | Cliente final — vê apenas seus próprios agendamentos |

---

## Credenciais de Teste

> Crie os usuários abaixo antes de iniciar os testes, ou use os já cadastrados no ambiente de homologação.

```
ADMIN
  email: admin@agendainteligente.com
  senha: Admin@1234

ADMINISTRADOR (dono da empresa "Clínica Teste")
  email: adm@clinicateste.com
  senha: Admin@1234

GERENTE (unidade "Unidade Centro")
  email: gerente@clinicateste.com
  senha: Gerente@1234

PROFISSIONAL (atendente "Carlos")
  email: carlos@clinicateste.com
  senha: Prof@1234

CLIENTE
  email: maria@email.com
  senha: Cliente@1234
```

---

## Roteiros de Teste por Perfil

---

### 🔴 PERFIL: ADMIN

**Acesso:** `/login` → autenticar com credenciais ADMIN

#### 1. Dashboard
- [ ] Verificar se o Dashboard carrega com KPIs (agendamentos hoje, faturamento, taxa de retorno)
- [ ] Verificar se a seção "Agenda de Hoje" exibe a linha do tempo corretamente
- [ ] Verificar se o painel "Insights Semanais" (IA-2) aparece com texto gerado
- [ ] Verificar se o painel "Clientes em Risco" (IA-3) lista clientes ausentes >30 dias
- [ ] Verificar se o painel "Churn por Profissional" (IA-7) exibe alertas de churn ≥30%

#### 2. Empresas (`/empresas`)
- [ ] Listar empresas cadastradas
- [ ] Criar nova empresa com dados válidos → espera `201 Created`
- [ ] Editar empresa existente
- [ ] Tentar criar empresa sem CNPJ → espera erro de validação `422`

#### 3. Unidades (`/unidades`)
- [ ] Listar todas as unidades de todas as empresas
- [ ] Criar unidade vinculada a empresa existente
- [ ] Editar unidade

#### 4. Perfis customizados (`/perfis`)
- [ ] Listar perfis disponíveis
- [ ] Criar novo perfil com permissões específicas
- [ ] Editar permissões de perfil existente

#### 5. Usuários (`/usuarios`)
- [ ] Listar todos os usuários
- [ ] Criar usuário com perfil GERENTE vinculado a uma unidade
- [ ] Criar usuário com perfil PROFISSIONAL
- [ ] Tentar criar usuário com e-mail já cadastrado → espera `409` ou erro de conflito

#### 6. Relatórios (`/relatorios`)
- [ ] Acessar página de Relatórios (sem restrição de unidade — vê global)
- [ ] Filtrar por período: 3 meses / 6 meses / 12 meses
- [ ] Verificar gráfico de faturamento mensal (BarChart)
- [ ] Verificar ranking Top Serviços
- [ ] Verificar gráfico de Taxa de Retorno (LineChart)

#### 7. Segurança — o ADMIN NÃO deve conseguir:
- [ ] ~~Acessar endpoints de clientes de outras empresas sem passar por empresa~~ (testar isolamento)

---

### 🟠 PERFIL: ADMINISTRADOR

**Acesso:** `/login` → autenticar com credenciais ADMINISTRADOR

#### 1. Dashboard
- [ ] Dashboard exibe dados apenas da empresa/unidade do administrador
- [ ] KPIs, agenda do dia e painéis de IA carregam corretamente

#### 2. Clientes (`/clientes`)
- [ ] Listar clientes da empresa
- [ ] Cadastrar novo cliente com CPF, nome, e-mail, telefone
- [ ] Editar cliente existente
- [ ] Buscar cliente por CPF/CNPJ
- [ ] Tentar cadastrar cliente com CPF duplicado → espera erro

#### 3. Profissionais (`/profissionais`)
- [ ] Listar profissionais da unidade
- [ ] Cadastrar novo profissional vinculando a um usuário existente
- [ ] Associar serviços ao profissional
- [ ] Editar percentual de comissão

#### 4. Serviços (`/servicos`)
- [ ] Listar serviços cadastrados
- [ ] Criar novo serviço com nome, duração e preço
- [ ] Editar serviço existente
- [ ] Verificar se serviço aparece ao criar agendamento

#### 5. Agendamentos (`/agendamentos`)
- [ ] Listar agendamentos da unidade
- [ ] Criar novo agendamento:
  - Selecionar cliente → profissional → serviço → data/hora
  - Verificar badge 🔥 em horários populares (IA-6)
  - Verificar chips de serviços complementares sugeridos (IA-5)
  - Confirmar criação → espera `201`
- [ ] Verificar badge de risco de no-show (🔴/🟡) nos agendamentos (IA-1)
- [ ] Alterar status de agendamento (CONFIRMADO → EM_ANDAMENTO → CONCLUIDO)
- [ ] Cancelar agendamento → espera status `CANCELADO`
- [ ] Marcar como NO_SHOW

#### 6. Convites (`/convites-acesso`, `/convites-cliente`)
- [ ] Gerar convite de acesso para novo usuário
- [ ] Gerar convite para cliente se auto-cadastrar
- [ ] Verificar que o link de convite é válido e redireciona corretamente

#### 7. Relatórios (`/relatorios`)
- [ ] Relatórios exibem dados apenas da empresa do administrador (não vê outras empresas)

---

### 🟡 PERFIL: GERENTE

**Acesso:** `/login` → autenticar com credenciais GERENTE

#### 1. Dashboard
- [ ] Dashboard carrega KPIs da unidade gerenciada
- [ ] Painéis de IA (Insights, Clientes em Risco, Churn) são visíveis

#### 2. Agendamentos — fluxo completo
- [ ] Criar agendamento como gerente
- [ ] Editar observação de agendamento
- [ ] Finalizar agendamento com serviços e valores
- [ ] Verificar que não consegue ver agendamentos de outras unidades

#### 3. Clientes e Profissionais
- [ ] Listar e editar clientes (sem deletar — verificar se botão existe)
- [ ] Listar profissionais da unidade

#### 4. Reclamações (`/reclamacoes`)
- [ ] Listar reclamações da unidade
- [ ] Abrir reclamação e ver detalhes
- [ ] Usar sugestão de resposta via IA (Groq)
- [ ] Marcar reclamação como resolvida

#### 5. Notificações (`/notificacoes`)
- [ ] Verificar notificações pendentes
- [ ] Marcar notificação como lida

#### 6. Segurança — o GERENTE NÃO deve conseguir:
- [ ] Acessar `/empresas` → deve retornar `403` ou redirecionar
- [ ] Criar/deletar usuários de outro perfil admin
- [ ] Ver dados de outras unidades

---

### 🟢 PERFIL: PROFISSIONAL

**Acesso:** `/login` → autenticar com credenciais PROFISSIONAL

#### 1. Dashboard
- [ ] Dashboard exibe apenas agendamentos do próprio profissional
- [ ] "Agenda de Hoje" mostra a linha do tempo pessoal
- [ ] KPIs refletem apenas os dados do profissional logado

#### 2. Agendamentos
- [ ] Listar apenas os agendamentos vinculados a este profissional
- [ ] Criar agendamento selecionando a si mesmo como atendente
- [ ] Alterar status de agendamento próprio
- [ ] Verificar badge de risco de no-show nos seus agendamentos

#### 3. Horários Disponíveis
- [ ] Acessar configuração de horários disponíveis (`/api/horarios-disponiveis/meus-horarios`)
- [ ] Adicionar slots de disponibilidade
- [ ] Remover slot de disponibilidade

#### 4. Segurança — o PROFISSIONAL NÃO deve conseguir:
- [ ] Acessar `/empresas` → `403`
- [ ] Acessar `/perfis` → `403`
- [ ] Deletar agendamentos → `403`
- [ ] Ver agendamentos de outros profissionais (validar isolamento)

---

### 🔵 PERFIL: CLIENTE

**Acesso:** `/cliente/login` (portal do cliente, rota separada)

#### 1. Auto-cadastro
- [ ] Acessar `/cliente/cadastro`
- [ ] Preencher nome, e-mail, CPF, senha e confirmar
- [ ] Verificar login com as novas credenciais

#### 2. Agendamento pelo Portal do Cliente
- [ ] Acessar `/cliente/agendar`
- [ ] Selecionar serviço → escolher data/hora disponível
- [ ] Confirmar agendamento → espera confirmação

#### 3. Meus Agendamentos
- [ ] Acessar `/cliente/meus-agendamentos`
- [ ] Verificar lista de agendamentos pessoais
- [ ] Cancelar agendamento futuro
- [ ] Verificar que não consegue ver agendamentos de outros clientes

#### 4. Segurança — o CLIENTE NÃO deve conseguir:
- [ ] Acessar `/dashboard` (painel interno) → deve redirecionar para portal
- [ ] Acessar `/agendamentos` (listagem geral) → `403`
- [ ] Acessar `/clientes` → `403`
- [ ] Acessar `/relatorios` → `403`
- [ ] Acessar `/api/relatorios/*` diretamente via curl/Postman → `403`

---

## Testes de API (Backend direto)

Use o Swagger em `/swagger-ui.html` ou Postman para os testes abaixo.

### Autenticação
```
POST /api/auth/login
Body: { "email": "...", "senha": "..." }
Espera: { "token": "...", "usuario": { "perfil": "..." } }
```

### Isolamento de dados (crítico)
```bash
# Como GERENTE da Unidade A, tente buscar agendamentos da Unidade B:
GET /api/agendamentos?unidadeId=<ID_UNIDADE_B>
Espera: lista vazia ou 403 (nunca dados de outra unidade)

# Como PROFISSIONAL, tente alterar status de agendamento de outro profissional:
PATCH /api/agendamentos/<ID_DE_OUTRO>/status
Espera: 403 Forbidden

# Como CLIENTE, tente cancelar agendamento de outro cliente:
POST /api/agendamentos/<ID_DE_OUTRO>/cancelar
Espera: 403 Forbidden
```

### Endpoints de IA
```bash
# Horários populares (IA-6)
GET /api/inteligencia/horarios-populares?unidadeId=1
Espera: lista de { hora, diaSemana, total, popular: true/false }

# Risco de no-show (IA-1)
GET /api/inteligencia/risco-no-show?unidadeId=1
Espera: lista de { agendamentoId, score, nivel: "MEDIO"|"ALTO" }

# Serviços complementares (IA-5)
GET /api/inteligencia/servicos-complementares?servicoId=1
Espera: lista de { servicoId, nome, coOcorrencias }

# Insights semanais (IA-2)
GET /api/inteligencia/insights-semanais?unidadeId=1
Espera: lista de { semana, texto } (pode ser vazio se não rodou o scheduler ainda)

# Clientes em risco de churn (IA-3)
GET /api/inteligencia/clientes-risco?unidadeId=1
Espera: lista de { clienteId, nome, diasAusente, mensagemReengajamento }

# Churn por profissional (IA-7)
GET /api/inteligencia/churn-profissional?unidadeId=1
Espera: lista de { profissionalId, nome, taxaChurn } apenas para taxaChurn >= 30
```

### Relatórios
```bash
GET /api/relatorios/faturamento-mensal?meses=6&unidadeId=1
GET /api/relatorios/top-servicos?meses=6&unidadeId=1
GET /api/relatorios/taxa-retorno?meses=6&unidadeId=1
# Todos exigem autenticação e perfil != CLIENTE
```

---

## Casos de Borda

| Cenário | Ação | Resultado Esperado |
|---------|------|-------------------|
| Agendamento no passado | Criar agendamento com data anterior a hoje | Erro de validação |
| Horário já ocupado | Criar 2 agendamentos para o mesmo profissional/horário | Segundo recebe erro de conflito |
| Cliente sem e-mail | Cadastrar cliente sem campo de e-mail | Aceita (e-mail opcional para clientes) |
| Token expirado | Usar JWT expirado em qualquer endpoint | `401 Unauthorized` |
| Endpoint sem autenticação | Acessar `/api/agendamentos` sem Bearer token | `401 Unauthorized` |
| Rota inexistente | Acessar `/api/inexistente` | `404 Not Found` |
| SQL injection | `email=test' OR '1'='1` no login | Nenhuma injeção; `401` ou erro de validação |

---

## Checklist Final de Sanidade

- [ ] Build do frontend sem erros TypeScript (`npm run build`)
- [ ] Backend sobe sem erros de migração Flyway
- [ ] Login funciona para todos os 5 perfis
- [ ] JWT é validado em todos os endpoints protegidos
- [ ] CORS não bloqueia frontend em produção
- [ ] Dados de uma empresa não vazam para outra
- [ ] Swagger disponível em `/swagger-ui.html`
- [ ] Health check responde: `GET /actuator/health` → `{ "status": "UP" }`

---

## Notas para o Agente QA

1. **Escopo de dados:** O sistema filtra dados por `unidadeId` do usuário logado. Sempre verificar se um usuário vê APENAS dados da sua unidade.
2. **Funcionalidades de IA:** Os endpoints `/api/inteligencia/*` podem retornar listas vazias se não houver dados históricos suficientes — isso é comportamento esperado, não bug.
3. **Insights semanais (IA-2):** São gerados por um job `@Scheduled` toda segunda-feira às 8h. Em ambiente de teste, chamar manualmente `GET /api/inteligencia/insights-semanais` para verificar a estrutura.
4. **Email (FEAT-1):** Lembretes automáticos por e-mail dependem de `EMAIL_HABILITADO=true` no ambiente. Em homologação pode estar desabilitado.
5. **WhatsApp (IA-9):** Chatbot desabilitado por padrão (`CHATBOT_HABILITADO=false`). Não testar em homologação sem configuração do Evolution API.
6. **Horários populares (IA-6):** Badge 🔥 só aparece se houver volume mínimo de dados (≥50% do slot máximo). Com base de dados vazia, não aparece — comportamento correto.
