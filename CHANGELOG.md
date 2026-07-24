# Changelog

Todas as mudanças relevantes deste projeto serão documentadas neste arquivo.

O formato segue o padrão [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adota versionamento semântico quando aplicável.

## [Unreleased]

### Frontend Web

#### Agendamentos
- A tela web de agendamentos passou a abrir na visão **Semana** por padrão.
- Os atalhos de intervalo foram reorganizados para aparecerem antes das abas `Dia`, `Semana` e `Mês`.
- As abas de período e os botões `15m`, `30m` e `60m` passaram a usar o mesmo padrão de tipografia.
- O cabeçalho de profissionais foi alinhado ao mesmo bloco visual do calendário.
- O bloco de seleção de profissionais passou a manter o mesmo padrão entre os modos dia e semana.
- O layout semanal passou a distribuir corretamente os agendamentos quando mais de um profissional está selecionado.
- A seleção de profissionais no modo semana passou a lembrar a última escolha ao alternar de aba ou sair e voltar.
- No modo dia, a seleção de profissionais passou a limitar o número máximo de escolhas e manter o profissional anteriormente marcado.
- A timeline do dia foi ajustada para não cortar o primeiro horário visível no topo.
- A timeline foi estendida quando um procedimento ultrapassa o horário de fechamento da unidade.
- O layout dos dias e semanas foi padronizado para mostrar o horário de início de forma completa.
- O card de agendamento foi reorganizado para seguir a ordem:
  1. hora inicial e final
  2. nome da cliente
  3. nome do procedimento
  4. tempo desde o último procedimento
- Quando a cliente não possui histórico, o card passa a mostrar `cliente nova`.
- O card de agendamento confirmado passou a usar a cor azul.
- O card do modo mobile foi ajustado para seguir o padrão visual do perfil profissional.
- A visualização do card semanal e diária recebeu ajustes de espaçamento, alinhamento e corpo do bloco.
- O card de detalhes do agendamento passou a remover o nome da profissional do topo.
- O texto `Quando` foi removido da área de data/hora do detalhe.
- A hora de início e término do atendimento passou a aparecer antes dos demais dados do bloco.
- O bloco de cliente deixou de exibir o rótulo `Cliente` e passou a usar apenas ícone e conteúdo.
- O nome completo da cliente e o telefone com máscara passaram a aparecer no bloco principal.
- O bloco `Serviços` foi removido do detalhe do agendamento.
- O valor do procedimento passou a aparecer abaixo do nome do serviço.
- O card de valor foi removido do detalhe do agendamento.
- A seção `Ações` foi removida do layout de detalhes.
- O botão `Editar agendamento` passou a ser o primeiro da lista e com cor preta.
- Ao editar um agendamento, o fluxo passa a abrir direto na etapa do procedimento.
- O botão `Receber sinal` só aparece quando a unidade está configurada para cobrar sinal.
- O texto auxiliar com valor/percentual sugerido foi removido do botão de receber sinal.
- O fluxo de receber sinal não mostra mais sugestão de valor ou percentual ao lado do texto.
- O botão de novo agendamento passou a respeitar a configuração de sinal da unidade.
- O novo agendamento passou a iniciar já com a forma de pagamento `PIX` selecionada.
- O campo de cliente em novo agendamento passou a mostrar o último procedimento realizado e há quantos dias foi feito.
- O modo de visualização e edição passou a destacar o último procedimento do cliente em toda a jornada.
- O fluxo de agendamento passou a considerar o horário de abertura da empresa configurada.
- A área de agendamento no perfil administrador passou a preservar a seleção de profissionais ao alternar entre abas.

#### Clientes
- O modal do cliente passou a abrir ao clicar em qualquer parte da linha, e não apenas no nome.
- O modal de acesso rápido teve o título principal removido.
- A linha divisória abaixo do título do acesso rápido foi removida.
- O botão `X` do acesso rápido foi removido.
- O topo do modal foi reposicionado para ficar mais próximo da borda superior.
- O bloco principal do acesso rápido passou a usar ícone em vez de nome textual na primeira linha.
- Telefone e data de nascimento passaram a usar o mesmo padrão de ícone, espaçamento e alinhamento.
- O item `Informações do cliente` passou a ser clicável e a ficar alinhado com os demais itens do bloco.
- O ícone `i` e a seta de navegação foram adicionados no item `Informações do cliente`.
- O item `Crédito do cliente` foi adicionado como nova linha no mesmo padrão visual.
- O item `Anotações` foi adicionado como nova linha no mesmo padrão visual.
- O bloco `Histórico` foi substituído por `Último atendimento` e `Procedimento realizado`.
- O fluxo de clientes no web recebeu ajustes de abertura do modal em toda a área clicável.
- O novo cliente passou a receber data de nascimento digitável, em vez de seletor.
- O fluxo de edição de cliente passou por refinamentos de alinhamento e espaçamento para manter o padrão da tela de clientes.
- No modal do cliente, o botão `Ligar` foi removido para web e WhatsApp.

#### Informações do cliente
- Foi criada a tela `Informações do cliente`.
- A tela recebeu abas `HOME` e `ATENDIMENTOS`.
- O botão de voltar foi reposicionado ao lado do título da página.
- A escrita `Voltar` foi removida.
- O nome e o telefone deixaram de aparecer abaixo do título da tela.
- O bloco `Dados cadastrais` teve o fundo cinza removido da área geral e passou a usar fundo cinza apenas nas linhas de nome e telefone.
- A linha `Resumo do cliente e Acessos rápidos` foi reorganizada para não quebrar o padrão visual da tela.
- A aba `HOME` passou a reunir dados cadastrais, receita esperada, último atendimento, procedimento realizado e atalhos rápidos.
- O bloco `Receita Esperada em 2026` foi incluído no resumo da cliente.
- O atalho `ANAMNESES` foi adicionado como item clicável.
- O atalho `FOTOS` foi adicionado como item clicável.
- A aba `ATENDIMENTOS` passou a seguir um layout em lista/tabela com filtros semelhantes ao padrão dos relatórios.
- O cabeçalho da aba `ATENDIMENTOS` foi alinhado ao padrão visual da tela de clientes.

#### Anamneses
- O fluxo de edição de anamnese passou a tentar recuperar os dados já preenchidos da ficha.
- O texto `Selecione um template` foi alterado para `Template padrão`.
- Ao salvar uma ficha em modo de edição, a navegação volta para a lista de anamneses.
- A visualização da anamnese foi ajustada para leitura em formato de lista, como solicitado no layout de exemplo.
- O modo de visualização passou a bloquear edição dos campos do questionário.
- A listagem web de anamneses passou a ser apresentada em formato de tabela/lista.
- A listagem passou a exibir `Nome`, `Primeiro atendimento`, `Nome ficha` e `Último atendimento`.
- O rótulo `Data` foi removido do cabeçalho da listagem.
- O primeiro e o último atendimento passaram a ser calculados com base em agendamentos concluídos do cliente.
- O cálculo deixou de considerar a data de criação da ficha como referência principal.
- A tela de anamneses passou a trazer o primeiro agendamento realizado e o último agendamento realizado da cliente.
- Na visualização da anamnese, os dados apresentados passaram a refletir os agendamentos concluídos exibidos em `Informações do cliente`.
- O layout de lista da anamnese foi aplicado também às telas de profissionais e perfis, mantendo o mesmo padrão visual.

#### Serviços
- A tela de serviços no web passou a seguir o padrão visual da tela de clientes.
- A listagem foi convertida para modo tabela/lista.
- A lista passou a exibir `Nome`, `Duração`, `Preço` e `Custo do serviço`.
- O campo de busca por nome ou descrição foi posicionado acima do bloco principal da tabela.
- O botão `Todos os status` foi removido da interface.
- O texto `Ativo` foi removido da listagem.
- O texto `Unidade principal` foi removido da listagem.
- Os valores de duração, preço e custo passaram a ficar alinhados com os respectivos títulos.
- O traço do custo do serviço passou a ficar centralizado com o texto da coluna.

#### Profissionais
- A tela web de profissionais passou a usar o mesmo padrão da tela de clientes.
- A listagem foi convertida para modo tabela/lista.
- O espaçamento, alinhamento e ações foram padronizados com o restante das telas em lista.

#### Perfis
- A tela web de perfis passou a usar o mesmo padrão da tela de clientes.
- A listagem foi convertida para modo tabela/lista.
- A busca e os cabeçalhos passaram a seguir a mesma hierarquia visual das demais listagens.

#### Comissões
- A tela de comissões no mobile foi simplificada para reduzir a poluição visual.
- O título `Comissões` foi removido da versão mobile.
- O subtítulo da tela foi removido da versão mobile.
- O ícone do topo foi removido da versão mobile.
- Os cards `Comissão pendente`, `Comissão paga`, `Atend. pendentes` e `Atend. Pagos` foram compactados em uma única linha de quatro blocos.
- O texto `Selecionado: R$0,00` foi removido.
- O texto de seleção passou a exibir `Selecione registros` quando nada estiver selecionado.
- Quando há itens marcados, o texto passa a mostrar `x de x selecionados`.
- O total a pagar passou a aparecer logo abaixo do texto de seleção.
- As ações `Desmarcar todos` e `Limpar seleção` foram removidas da interface.
- O bloco `Vales` foi mantido sem ícone e alinhado à esquerda.
- A indicação de `Pagar comissão` foi mantida ao lado direito do bloco.
- O bloco principal ganhou mais proximidade com o topo e mais largura lateral.
- O modal de pagamento de comissão teve o botão `X` removido.
- O título `Pagamento de comissão` foi centralizado.
- O campo de observação foi reduzido para ocupar uma única linha.
- A seção de vales foi adicionada abaixo da observação, com seleção influenciando o cálculo.
- A data de pagamento foi colocada ao lado da forma de pagamento para economizar espaço.

#### Configurações
- A tela web de configurações passou a remover o título principal e o ícone superior.
- O botão `Voltar para o inicio` foi removido.
- O texto `Gerencie sua conta, senha e os dados da empresa.` foi mantido.
- Os cards `Conta` e `Alterar senha` passaram a aparecer lado a lado.
- O card de empresa passou a usar dropdown.
- Quando já existe empresa preenchida, o card inicia fechado.
- A seção `Outras configurações` passou a mostrar o botão `Fluxo de atendimento` acima de `Horários de funcionamento`.
- Foi criada a nova tela `Fluxo de atendimento`.
- A tela de fluxo reúne as regras operacionais do agendamento.
- Foram adicionadas as opções de cobrança de sinal/adiantamento.
- Foram adicionadas as opções de exigir sinal pago para iniciar atendimento.
- Foram adicionadas as opções de exigir confirmação para iniciar atendimento.
- O fluxo de atendimento passou a ficar visível apenas para o perfil administrador.

#### Clientes e agendamento, ajustes de comportamento
- O novo agendamento passou a exibir o último procedimento da cliente embaixo do nome.
- O fluxo de edição do agendamento passou a abrir com o procedimento já selecionado, facilitando alterações.
- O layout do agendamento em detalhe passou a refletir a ordem de informações pedida em toda a jornada.
- A listagem e os cards de clientes passaram a seguir o mesmo padrão visual da tela de clientes em todo o sistema.

### Mobile

#### Agendamentos
- O texto de seleção de profissionais foi mantido no formato esperado pelo perfil e limite correspondente.
- O modal de escolha de profissionais passou a preservar a seleção ao trocar entre dias, semanas e outras visualizações.
- O card do modo mobile foi ajustado para seguir o padrão visual do perfil profissional.
- O perfil secretaria passou a manter a seleção de profissionais sem carregar todos por padrão.

#### Clientes
- Os botões `Editar` e `Excluir` do cliente foram removidos, deixando apenas o atalho de informação.
- O campo inteiro do cliente passou a ser clicável para abrir o modal diretamente.
- O filtro abaixo do título `Clientes` foi removido.
- A aba de clientes passou a exibir apenas `Gerenciamento`, `Retornos` e `Sumidos`.
- Os textos de status, contagem e identificação da lista foram simplificados.
- A listagem de clientes passou a exibir apenas nome e telefone com máscara.

#### Informações do cliente
- A tela teve o botão `Exportar` removido.
- A escolha de tipo de período foi removida da tela.
- O seletor de data passou a trabalhar de forma compacta ao lado da busca por serviço.
- O componente de data passou a permitir seleção por mês/ano ou apenas ano dentro do próprio calendário.
- A escrita superior do componente de data foi removida para reduzir repetição visual.

#### Comissões
- A tela de comissões teve o título `Comissões` removido da versão mobile.
- O subtítulo da tela foi removido da versão mobile.
- O ícone do topo foi removido da versão mobile.
- Os cards `Comissão pendente`, `Comissão paga`, `Atend. pendentes` e `Atend. Pagos` foram compactados em uma única linha de quatro blocos.
- O texto `Selecionado: R$0,00` foi removido.
- O texto de seleção passou a exibir `Selecione registros` quando nada estiver selecionado.
- Quando há itens marcados, o texto passa a mostrar `x de x selecionados`.
- O total a pagar passou a aparecer logo abaixo do texto de seleção.
- As ações `Desmarcar todos` e `Limpar seleção` foram removidas da interface.
- O bloco `Vales` foi mantido sem ícone e alinhado à esquerda.
- A indicação de `Pagar comissão` foi mantida ao lado direito do bloco.
- O bloco principal ganhou mais proximidade com o topo e mais largura lateral.
- O modal de pagamento de comissão teve o botão `X` removido.
- O título `Pagamento de comissão` foi centralizado.
- O campo de observação foi reduzido para ocupar uma única linha.
- A seção de vales foi adicionada abaixo da observação, com seleção influenciando o cálculo.
- A data de pagamento foi colocada ao lado da forma de pagamento para economizar espaço.

### Backend

#### Changed
- O resumo de anamnese passou a carregar `clienteId`, `primeiroAtendimento` e `ultimoAtendimento`.
- A origem desses campos agora considera os agendamentos concluídos do cliente, em vez da data da própria ficha.
