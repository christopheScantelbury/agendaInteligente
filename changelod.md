# Changelog (pendente de commit)

## 2026-03-10

### Frontend - Tela de agendamentos
- Refatoracao ampla em `frontend/src/pages/Agendamentos.tsx`.
- Vista padrao alterada para `calendar`.
- Layout modernizado para as visoes de calendario e linha do tempo.
- Modal `Novo Agendamento` reestruturado para layout mais compacto e moderno.
- Modal `Editar Agendamento` alinhado ao mesmo padrao visual e de interacao do modal de criacao.
- Regra de unidade unica aplicada no editar (campo unidade oculto quando aplicavel, com unidade preenchida por padrao).
- Campo de cliente no editar com busca digitavel e pre-preenchimento do cliente atual.
- Campo de servicos no editar com busca digitavel, chips de selecionados e resumo de duracao/total.
- Ajuste para nao perder o profissional selecionado ao trocar/remover/adicionar servicos no editar.
- Inclusao de acao para excluir agendamento via interface.

### Frontend - Componentes de calendario
- Atualizacoes em:
  - `frontend/src/components/CalendarView.tsx`
  - `frontend/src/components/CalendarView.css`
  - `frontend/src/components/CalendarMonth.tsx`
  - `frontend/src/components/TimelineView.tsx`
- Toolbar customizada no calendario.
- Ajustes de rotulos e formatos para pt-BR.
- Melhorias visuais gerais (cards, bordas, estados e legibilidade).
- Ajustes de slot/grade para experiencia mais consistente.

### Frontend - Area do cliente
- Atualizacao de `frontend/src/pages/MeusAgendamentosCliente.tsx`:
  - Separacao entre agendamentos ativos e historico de cancelamentos.
  - Mensagem e fluxo de cancelamento atualizados.
- Atualizacao de `frontend/src/services/clientePublicoService.ts`:
  - Novo metodo `meusCancelamentos()`.
- Atualizacao de `frontend/src/services/agendamentoService.ts`:
  - Novo metodo `excluir(id)`.
- Atualizacao de `frontend/src/services/atendenteService.ts`:
  - Inclusao de `perfilUsuario` no tipo `Atendente`.

### Backend - Agendamentos e cancelamentos
- `src/main/java/br/com/agendainteligente/controller/AgendamentoController.java`:
  - Novo endpoint `DELETE /api/agendamentos/{id}`.
- `src/main/java/br/com/agendainteligente/service/AgendamentoService.java`:
  - Nova regra de exclusao de agendamento com limpeza de dependencias relacionadas.
  - Filtragem para nao listar agendamentos cancelados em listagens ativas.
- `src/main/java/br/com/agendainteligente/controller/ClientePublicoController.java`:
  - Novo endpoint de historico `GET /api/publico/clientes/meus-cancelamentos`.
  - Reuso de metodo para obter cliente autenticado.
  - Ajuste para listar apenas agendamentos ativos em `meus-agendamentos`.
- `src/main/java/br/com/agendainteligente/repository/AgendamentoRepository.java`:
  - Metodo `findByClienteIdAndStatusOrderByDataHoraInicioDesc(...)`.
- `src/main/java/br/com/agendainteligente/repository/NotaFiscalRepository.java`:
  - Metodo `deleteByAgendamentoId(...)`.
- `src/main/java/br/com/agendainteligente/repository/PagamentoRepository.java`:
  - Metodo `deleteByAgendamentoId(...)`.
- `src/main/java/br/com/agendainteligente/dto/AtendenteDTO.java` e `src/main/java/br/com/agendainteligente/service/AtendenteService.java`:
  - Inclusao e preenchimento de `perfilUsuario`.

### Infra e documentacao
- `docker-compose.yml`:
  - Inclusao da variavel `FIX_ADMIN_KEY`.
- `GUIA_EASYPANEL_PASSO_A_PASSO.md`:
  - Inclusao da variavel `FIX_ADMIN_KEY`.
- `ARQUITETURA.md`:
  - Ajuste de nomenclatura de status para `FINALIZADO`.

### Observacoes
- Existem arquivos novos na raiz:
  - `package.json`
  - `package-lock.json`
- Esses arquivos devem ser validados antes do commit final para confirmar se fazem parte do escopo.
