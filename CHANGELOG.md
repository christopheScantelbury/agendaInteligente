# Changelog (pendente de commit)

## 2026-04-30

### Frontend - Area de clientes (nova tela e fluxo dedicado)
- Nova opcao de menu `Clientes` adicionada acima de `Usuarios`, seguindo o padrao de navegacao existente.
- Nova tela de listagem de clientes em `frontend/src/pages/Clientes.tsx`, com:
  - padrao visual alinhado com a tela de usuarios,
  - filtros de busca mantidos,
  - estado vazio com mensagem `Nenhum cliente cadastrado.`,
  - botao `Novo cliente`,
  - sem acoes por linha no escopo inicial.
- Rotas da area de clientes adicionadas em `frontend/src/App.tsx`:
  - `/clientes`
  - `/clientes/novo`
  - `/clientes/:id/editar`
- Criada pagina dedicada `frontend/src/pages/ClienteFormPage.tsx` para `Novo Cliente` e `Editar Cliente`, substituindo fluxo com excesso de informacao em modal.
- Ajustes de layout nas paginas de novo/edicao para melhor aproveitamento da largura da pagina.

### Frontend - Regras de formulario de cliente
- Removida a necessidade de credenciais de acesso na area administrativa de clientes:
  - secao de credenciais removida da tela,
  - senha/confirmacao de senha removidas do fluxo de cadastro/edicao,
  - email mantido apenas como contato e sem obrigatoriedade.
- Campo `CPF/CNPJ` alterado para opcional no formulario de cliente.
- Regra de unidade unica aplicada:
  - quando existir apenas uma unidade disponivel, ela e selecionada automaticamente,
  - secao de selecao de unidades e ocultada nesse cenario.

### Frontend - Acoes de cliente
- Inclusao de acao para excluir cliente.
- Inclusao de acao para editar cliente via pagina dedicada.

### Backend - Correcao em edicao de cliente
- Correcao no mapeamento de atualizacao em `src/main/java/br/com/agendainteligente/mapper/ClienteMapper.java`:
  - `id` passou a ser ignorado em `toEntity(...)` e `updateEntityFromDTO(...)`.
- Ajuste elimina erro `500` na edicao de cliente causado por alteracao indevida de identificador da entidade no Hibernate.

## 2026-04-17

### Frontend - Agendamentos (modais e Safari)
- Ajuste de compatibilidade Safari para os botoes `Adicionar cliente` e `Adicionar servico` nos campos de busca:
  - Fechamento de dropdown com `requestAnimationFrame` + `document.activeElement` (evita perder clique por blur antecipado).
  - Abertura de modal via `onMouseDown` com `preventDefault` para manter interacao estavel no Safari.
- Modal `Novo Servico` padronizado no mesmo layout do modal `Novo Cliente`:
  - Estrutura com corpo rolavel e footer fixo.
  - Espacamentos, inputs e botoes alinhados ao mesmo padrao visual.
- Remocao do campo `Descricao` no modal de `Novo Servico` quando aberto a partir de Agendamentos.

### Frontend - Agendamentos (cadastro rapido por busca)
- Para cliente e servico, quando a busca nao encontra resultado digitado, agora exibe botao `Adicionar`.
- Ao clicar em `Adicionar`, o texto digitado e pre-preenchido no campo `Nome` do modal correspondente.
- Fluxo aplicado em ambos os contextos:
  - Novo agendamento.
  - Editar agendamento.
- Ajuste de origem do modal (`create`/`edit`) para que o item criado retorne e selecione no formulario correto.
- `ClienteForm` e `ServicoForm` passaram a aceitar `initialNome` para prefill de cadastro.

## 2026-03-28

### Frontend - Tela de agendamentos (layout e UX)
- Tela de agendamentos com foco em visual mais moderno e fluxo em portugues.
- Vista padrao definida para calendario.
- Ajustes no cabecalho da agenda com botoes mais compactos/modernos e reorganizacao de acoes.
- Melhorias no grid e na timeline para leitura mais limpa, incluindo ajuste visual de cards, bordas e espacamentos.
- Calendario em pt-BR com cabecalhos curtos de dia da semana e formatos locais de data.
- Slots de horario configurados para intervalos de 30 minutos.
- Card do evento no calendario com melhor tratamento de quebra de texto e exibicao de observacao.

### Frontend - Novo/Editar/Detalhes de agendamento
- Modal de novo agendamento reformulado para padrao mais compacto e intuitivo.
- Modal de editar agendamento alinhado ao mesmo padrao visual e de comportamento.
- Campo Unidade ocultado quando usuario (admin/gerente/atendente) possui apenas uma unidade, mantendo selecao automatica no salvamento.
- Campo Profissional reposicionado e ajustado para selecao dos profissionais do studio.
- Campos Cliente e Servico com fluxo digitavel (busca por texto), incluindo estado de lista, selecao e re-pesquisa ao editar o texto.
- Campo de telefone do cliente com mascara de exibicao.
- Modal de detalhes redesenhado no mesmo padrao visual dos modais principais.
- Topo do modal de detalhes atualizado com acoes (WhatsApp, Editar, Deletar) em vez do titulo antigo.
- Inclusao de fluxo de observacao clicavel (abrir modal, salvar observacao e refletir no card/evento).
- Ajustes de alinhamento/espacamento de botoes e blocos internos para reduzir excesso de area vazia.

### Frontend - Status, timeline e acoes
- Inclusao e ajustes de etapas no timeline do atendimento:
  - Agendado
  - Confirmado
  - Procedimento em andamento
  - Procedimento finalizado
  - Finalizado
- Inclusao de status `NO_SHOW` (nao compareceu) com cor laranja e padronizacao visual nas telas.
- Inclusao de status `CONFIRMADO` no fluxo visual e nos detalhes.
- Ajuste da cor de `AGENDADO` para preto.
- Regras visuais do modal de detalhes por status (borda do modal por etapa do fluxo).
- Ajuste das acoes por etapa:
  - Confirmar
  - Voltar
  - Cancelar
  - Nao compareceu
  - Iniciar procedimento
  - Finalizar procedimento
  - Finalizar atendimento
- Mensagem de confirmacao de alteracao de status com tempo reduzido para 2 segundos.

### Frontend - Pagamentos no fluxo de agendamento
- Novo servico de pagamentos no frontend: `frontend/src/services/pagamentoService.ts`.
- Confirmacao de agendamento com opcoes "sem sinal" e "com sinal", com campos de valor, data e forma de pagamento.
- Modal de "historico de pagamento" para ajuste de valor pago durante etapa confirmada.
- Formas de pagamento no frontend padronizadas para:
  - PIX
  - DINHEIRO
  - CARTAO_CREDITO
  - CARTAO_DEBITO
- Modal de finalizar agendamento ajustado para exibir resumo (cliente, servico, sinal e restante) e concluir com emissao de NFS-e.
- Modal de nao compareceu ajustado para decidir emissao com base na existencia de sinal.
- Modal de cancelar com observacao e checkbox de devolucao de sinal.
- Ajustes de mascara de valor monetario e consistencia de campos/formulario.

### Backend - Agendamentos
- Novo endpoint para observacao de agendamento:
  - `PATCH /api/agendamentos/{id}/observacao`
- Regra de transicao de status endurecida em `AgendamentoService.atualizarStatus`:
  - Validacao explicita de transicoes permitidas.
  - Bloqueio de saltos indevidos via endpoint generico de status.
  - Bloqueio de conclusao/cancelamento direto por endpoint de status (exigir fluxo dedicado).
  - Estados encerrados sem permitir novas mudancas indevidas.
- Ao iniciar atendimento (`EM_ANDAMENTO`), vinculacao automatica do atendente autenticado no agendamento.
- Inclusao de `NO_SHOW` como status invalido para conflito de horario ativo (nao bloqueia nova agenda).
- Bloqueio de exclusao de agendamento quando existe sinal/pagamento ja registrado.
- Ajuste no finalizar agendamento para trabalhar com valor restante e acumulacao de pagamentos previos.
- Remocao da validacao que proibia atualizar agendamento com data/hora no passado.
- Inclusao de status `PROCEDIMENTO_FIM` no enum de status do agendamento.

### Backend - Pagamentos
- Novos endpoints:
  - `POST /api/pagamentos/agendamento/{agendamentoId}/registrar`
  - `PATCH /api/pagamentos/agendamento/{agendamentoId}/ajustar`
- Novos DTOs:
  - `RegistrarPagamentoAgendamentoDTO`
  - `AjustarPagamentoAgendamentoDTO`
- Ajustes no DTO de finalizacao:
  - `FinalizarAgendamentoDTO` agora aceita `tipoPagamento`.
  - Valor final aceitando `>= 0.00` para compor com sinal ja existente.
- `PagamentoService` atualizado para:
  - Registrar pagamento manual por agendamento.
  - Ajustar pagamento (inclusive ajuste para zero).
  - Evitar exceder valor total do agendamento.
  - Corrigir fluxo de remocao total sem erro de merge em entidade removida.
  - Processar pagamento considerando valor restante.
- Confirmacao de pagamento nao dispara mais emissao de NFS-e automaticamente; emissao segue no fluxo de finalizacao.

### Backend - Mapeamento e listagens auxiliares
- `AtendenteMapper` passou a preencher `nomeUsuario` e `nomeUnidade` no DTO.
- `AgendamentoRepository` atualizado para ignorar `NO_SHOW` nas consultas de conflito de horario.

### Infra e ambiente de desenvolvimento
- `docker-compose.yml` atualizado para frontend em modo desenvolvimento com hot reload:
  - Container Node para frontend.
  - `npm run dev` exposto na porta 5173.
  - Volume do codigo frontend e volume dedicado de `node_modules`.
  - Variaveis `VITE_API_URL` e `VITE_PROXY_TARGET`.
- `frontend/vite.config.ts` ajustado para carregar proxy dinamico via `loadEnv`.
- Adicao de `FIX_ADMIN_KEY` em `docker-compose.yml`.
- Guia `GUIA_EASYPANEL_PASSO_A_PASSO.md` atualizado com `FIX_ADMIN_KEY`.

### Arquivos adicionados
- `frontend/src/services/pagamentoService.ts`
- `src/main/java/br/com/agendainteligente/dto/RegistrarPagamentoAgendamentoDTO.java`
- `src/main/java/br/com/agendainteligente/dto/AjustarPagamentoAgendamentoDTO.java`
- `src/main/java/br/com/agendainteligente/dto/AtualizarObservacaoAgendamentoDTO.java`
- `package.json` (raiz)
- `package-lock.json` (raiz)

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
