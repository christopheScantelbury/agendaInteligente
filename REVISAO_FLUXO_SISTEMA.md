# Revisão do fluxo do sistema – Perfis, Usuários, Serviços e Agendamento

## Ordem recomendada de configuração

1. **Perfis** → Definir tipos (Atendente, Cliente, Gerente) e permissões de menu  
2. **Empresas** (se aplicável) → **Unidades** → Vincular unidades às empresas  
3. **Serviços** → Cadastrar por unidade (cada serviço pertence a uma unidade)  
4. **Usuários** → Cadastrar com perfil e unidades; se perfil for Atendente, preencher CPF e serviços que presta  
5. **Agendamento** → Cliente + Unidade + Serviços (da unidade) + Atendente + Data/hora  

---

## 1. Criação de Perfil

- **Onde:** Menu **Perfis** → **Novo Perfil**
- **Campos:** Nome, Descrição, **Tipo de perfil** (Atendente / Cliente / Gerente), Permissões de menu (Editar / Visualizar / Sem acesso)
- **Usabilidade:**
  - Badges na lista: exibem **Atendente**, **Cliente** ou **Gerente** conforme as flags
  - Validação: ao salvar perfil customizado sem nenhum tipo marcado, o sistema pergunta se deseja continuar
  - Perfis de sistema (ADMIN, GERENTE, etc.) têm tipo e nome bloqueados

---

## 2. Criação de Usuários (tipos)

- **Onde:** Menu **Usuários** → **Novo**
- **Fluxo:** Nome → Email → Senha → **Perfil** → **Unidades** (obrigatório exceto para ADMIN) → Se perfil for **Atendente**, preencher CPF, telefone, comissão e **Serviços que presta**
- **Usabilidade:**
  - Texto de ajuda: "Selecione pelo menos uma unidade onde este usuário atua."
  - Mensagem de erro clara: "Apenas o perfil Administrador não exige unidade."
  - Filtro de busca na seleção de serviços do atendente (por nome ou descrição)
  - Identificação de perfil atendente pela **flag** do perfil (não mais pelo nome)

---

## 3. Criação de Serviços

- **Onde:** Menu **Serviços** → **Novo Serviço**
- **Campos:** Nome, Descrição, **Unidade** (obrigatória), Valor, Duração (min), Ativo
- **Usabilidade:**
  - Texto: "O serviço ficará disponível apenas nesta unidade."
  - Unidades disponíveis respeitam o perfil (Admin vê todas; Gerente/Profissional vê só as suas)
  - Validações no front: unidade, nome, valor e duração obrigatórios e válidos

---

## 4. Agendamento

- **Onde:** Menu **Agendamentos** → **Novo** ou pela tela **Novo Agendamento**
- **Fluxo:** Cliente → Unidade → Atendente → **Serviços (filtrados pela unidade)** → Data/hora → Observações
- **Usabilidade:**
  - **Serviços por unidade:** só são listados os serviços ativos da unidade selecionada
  - **Filtro de serviços:** campo "Buscar serviço por nome ou descrição" para muitas opções
  - Ao trocar de unidade: lista de serviços e atendentes é atualizada; seleção de serviços é limpa
  - Mensagem quando não há unidade: "Selecione primeiro uma unidade para ver os serviços disponíveis."
  - **Feedback de erro:** em falha na criação, exibe notificação com a mensagem retornada pela API
  - Validação antes de enviar: unidade, pelo menos um serviço, cliente, atendente e data/hora

---

## Resumo das melhorias aplicadas

| Área        | Melhoria |
|------------|----------|
| **Perfis** | Badges Atendente/Cliente/Gerente na lista; confirmação ao salvar perfil sem tipo |
| **Usuários** | Hint de unidade; mensagem clara quando falta unidade; filtro na seleção de serviços do atendente |
| **Serviços** | Hint "O serviço ficará disponível apenas nesta unidade." |
| **Novo Agendamento** | Serviços filtrados por unidade; filtro de busca de serviços; feedback de erro ao criar; limpeza de seleção ao trocar unidade; validações e mensagens objetivas |

---

## Fluxo técnico (backend)

- **Perfis:** `POST/PUT /api/perfis` com `atendente`, `cliente`, `gerente`
- **Usuários:** `POST/PUT /api/usuarios` com `perfilId`, `unidadesIds`; se perfil for atendente, `POST/PUT /api/atendentes` com `servicosIds`
- **Serviços:** `GET /api/servicos/unidade/{id}/ativos` para listar por unidade; `POST/PUT /api/servicos` com `unidadeId`
- **Agendamento:** `POST /api/agendamentos` com `clienteId`, `unidadeId`, `atendenteId`, `dataHoraInicio`, `servicos[]` (o backend valida se o atendente presta os serviços e se a unidade confere)
