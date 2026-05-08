# Changelog

Todas as mudanças relevantes deste projeto serão documentadas neste arquivo.

O formato segue o padrão [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adota versionamento semântico quando aplicável.

## [Unreleased]

### Backend

#### Added
- Adicionado o campo `nomePerfil` no `UsuarioDTO` para expor o nome real do perfil do usuário.
- Novo endpoint `PATCH /api/agendamentos/{id}/observacao` para edição de observação.
- Novo endpoint `DELETE /api/agendamentos/{id}` para exclusão de agendamento.
- Novo endpoint `GET /api/publico/clientes/meus-cancelamentos` (histórico do cliente).
- Novos endpoints de pagamento:
  - `POST /api/pagamentos/agendamento/{agendamentoId}/registrar`
  - `PATCH /api/pagamentos/agendamento/{agendamentoId}/ajustar`
- Novos DTOs: `RegistrarPagamentoAgendamentoDTO`, `AjustarPagamentoAgendamentoDTO`, `AtualizarObservacaoAgendamentoDTO`.
- Inclusão dos status `NO_SHOW`, `CONFIRMADO` e `PROCEDIMENTO_FIM` no enum de agendamento.

#### Changed
- Listagem de usuários no perfil `ADMINISTRADOR` agora inclui o próprio admin logado, administradores vinculados, profissionais, secretárias e registros legados compatíveis.
- Serialização de usuários retorna o nome real do perfil, preservando customizações como `SECRETARIA`.
- `AgendamentoService.atualizarStatus` com regras de transição endurecidas (validação de transições, bloqueio de saltos e de finalização via endpoint genérico).
- Ao iniciar atendimento (`EM_ANDAMENTO`), vincula automaticamente o atendente autenticado.
- `NO_SHOW` ignorado nas consultas de conflito de horário ativo.
- Bloqueio de exclusão de agendamento com pagamento já registrado.
- `FinalizarAgendamentoDTO` aceita `tipoPagamento`; valor final aceita `>= 0,00` para compor com sinal existente.
- `PagamentoService` consolidado: registrar manual, ajustar (inclusive zerar), evitar exceder o total e processar valor restante.
- Confirmação de pagamento não dispara mais NFS-e — emissão apenas no fluxo de finalização.
- `AtendenteMapper` passou a preencher `nomeUsuario`, `nomeUnidade` e `perfilUsuario`.
- `AgendamentoRepository` recebeu `findByClienteIdAndStatusOrderByDataHoraInicioDesc(...)`.
- `NotaFiscalRepository` e `PagamentoRepository` ganharam `deleteByAgendamentoId(...)`.
- Removida a validação que proibia atualizar agendamento com data/hora no passado.

#### Fixed
- Mapeamento de cliente: `id` ignorado em `toEntity(...)` e `updateEntityFromDTO(...)`, eliminando `500` na edição.

### Frontend Web

#### Added
- Nova área de **Clientes** com listagem, formulário em página dedicada (`ClienteFormPage`) e ações de editar/excluir.
- Tela dedicada de **Profissionais** combinando administradores e profissionais/secretárias na mesma listagem.
- Confirmação de agendamento com opções "sem sinal"/"com sinal", campos de valor, data e forma de pagamento.
- Modal de histórico de pagamento e modal de finalização com resumo + emissão de NFS-e.
- Modal de "não compareceu" decide emissão por existência de sinal; cancelar com observação e devolução de sinal opcional.
- Novo serviço `frontend/src/services/pagamentoService.ts`.
- Cadastro rápido de cliente/serviço a partir do campo de busca em Agendamentos (botão "Adicionar" pré-preenche o nome).

#### Changed
- Tela de agendamentos modernizada (calendário pt-BR como vista padrão, slots de 30 min, cabeçalhos `Dom 01/03`, toolbar `< Hoje >`, cards limpos).
- Modais "Novo/Editar/Detalhes de Agendamento" reformulados para padrão compacto e consistente.
- Modal "Novo Serviço" padronizado no mesmo layout do "Novo Cliente"; descrição removida quando aberto a partir de Agendamentos.
- Campo Unidade ocultado quando o usuário tem apenas uma — selecionado automaticamente.
- Cliente/Serviço com busca digitável, chips de selecionados e resumo de duração/total ao editar.
- Fluxo de observação clicável (modal, salvar, refletir no card).
- Status visuais: `AGENDADO` em preto; `NO_SHOW` em laranja; bordas do modal por etapa do fluxo.
- Formas de pagamento padronizadas: PIX, DINHEIRO, CARTAO_CREDITO, CARTAO_DEBITO.
- Removido `Usuários` do menu lateral para `ADMINISTRADOR`; redirecionamentos atualizados para `/profissionais`.
- Compatibilidade Safari para "Adicionar cliente/serviço" (`requestAnimationFrame` + `onMouseDown` com `preventDefault`).
- Área do cliente: separação entre agendamentos ativos e histórico de cancelamentos; novo método `meusCancelamentos()`.

#### Fixed
- Ausência do `ADMINISTRADOR` na tela de profissionais.
- Inconsistência do status de conclusão (padronizado para `FINALIZADO`).
- Erros de JSX/tipagem na tela de agendamentos durante build.

### Mobile

#### Added
- Suporte ao `nomePerfil` na tipagem de usuário.

#### Changed
- Tela de usuários exibe e filtra pelo nome real do perfil.

#### Fixed
- Exibição incorreta de perfis customizados (`SECRETARIA` aparecia como `PROFISSIONAL`).

### Infra & DX
- `docker-compose.yml` atualizado para frontend em modo dev (hot reload), volume de `node_modules` dedicado, vars `VITE_API_URL` e `VITE_PROXY_TARGET`, e `FIX_ADMIN_KEY`.
- `frontend/vite.config.ts` carrega proxy dinâmico via `loadEnv`.
- `GUIA_EASYPANEL_PASSO_A_PASSO.md` atualizado com `FIX_ADMIN_KEY`.

### Documentação
- Criado o `CHANGELOG.md` no padrão Keep a Changelog.
- Adicionada referência ao `CHANGELOG.md` no `README.md`.
