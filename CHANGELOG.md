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

#### Fixed
- Corrigida a ausência do perfil `ADMINISTRADOR` na tela web de profissionais.

### Documentação

#### Added
- Criado o arquivo `CHANGELOG.md` no padrão Keep a Changelog.

#### Changed
- Adicionada referência ao `CHANGELOG.md` no `README.md`.
