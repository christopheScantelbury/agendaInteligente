# Changelog

Todas as mudanças relevantes deste projeto serão documentadas neste arquivo.

O formato segue o padrão [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adota versionamento semântico quando aplicável.

## [Unreleased]

### Backend

#### Added
- Adicionado o campo `nomePerfil` no `UsuarioDTO` para expor o nome real do perfil do usuário.

#### Changed
- Ajustada a listagem de usuários no backend para o perfil `ADMINISTRADOR`, incluindo o próprio administrador logado, administradores vinculados, profissionais, secretárias e registros legados compatíveis.
- Ajustada a serialização de usuários no backend para retornar o nome real do perfil, preservando perfis customizados como `SECRETARIA`.

### Mobile

#### Added
- Adicionado o suporte no mobile para consumir `nomePerfil` na tipagem de usuário.

#### Changed
- Atualizada a tela mobile de usuários para exibir e filtrar pelo nome real do perfil.

#### Fixed
- Corrigida a exibição incorreta de perfis customizados, como `SECRETARIA`, que apareciam como `PROFISSIONAL`.

### Frontend Web

#### Changed
- Atualizada a tela web de profissionais para combinar administradores e profissionais/secretárias na mesma listagem.
- Atualizada a tela web de profissionais para identificar visualmente o `ADMINISTRADOR` e evitar ações indevidas de edição/exclusão nesse tipo de registro.
- Ajustado o rodapé da tela web de profissionais para refletir o total real da listagem combinada.
- Removida a opção `Usuários` do menu lateral para o perfil `ADMINISTRADOR`.
- Ajustado o redirecionamento automático do frontend para evitar navegação para `/usuarios` quando o perfil logado for `ADMINISTRADOR`.
- Ajustados os atalhos internos da tela de unidades para redirecionar o perfil `ADMINISTRADOR` para `/profissionais` em vez de `/usuarios`.
- Ajustado o fluxo de abertura da tela de profissionais a partir de unidades para preservar o `unidadeId` recebido via navegação e manter o pré-preenchimento correto do formulário.
- Atualizada a tela web de agendamentos para iniciar por padrão na visualização `Calendário`.
- Modernizada a interface da tela web de agendamentos, com foco nas áreas de `Visão de calendário` e `Visão diária em linha do tempo`.
- Removido o bloco textual superior da tela web de agendamentos para deixar o cabeçalho mais limpo.
- Ajustados os controles principais da tela web de agendamentos (`Linha do tempo`, `Calendário` e `Novo agendamento`) para um formato mais compacto no topo da seção.
- Atualizada a navegação do calendário para o formato visual `< Hoje >`.
- Ajustada a visualização do calendário para português do Brasil (`pt-BR`), incluindo títulos e cabeçalhos de datas.
- Padronizado o cabeçalho dos dias do calendário no formato abreviado, como `Dom 01/03`, `Seg 02/03`.
- Configurado o calendário para exibir intervalos de horário de 30 em 30 minutos.
- Refinado o estilo visual do calendário, incluindo toolbar, botões, bordas, sombras e legenda.

#### Fixed
- Corrigida a ausência do perfil `ADMINISTRADOR` na tela web de profissionais.
- Corrigida a inconsistência do status de conclusão no frontend web de agendamentos, padronizando a exibição para `FINALIZADO`.
- Corrigidos erros de estrutura JSX e ajustes de tipagem identificados durante a build do frontend na tela web de agendamentos.

### Documentação

#### Added
- Criado o arquivo `CHANGELOG.md` no padrão Keep a Changelog.

#### Changed
- Adicionada referência ao `CHANGELOG.md` no `README.md`.
