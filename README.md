# Agenda Inteligente

Sistema completo de agendamento inteligente com suporte a multiplos tipos de empresas (academias, consultorios, saloes, etc.), controle de acesso por perfis e interface publica para clientes.

## 📘 Changelog

O histórico de alterações do projeto está documentado em [`CHANGELOG.md`](./CHANGELOG.md).

## 🚀 Deploy com Docker

### Pré-requisitos

- Docker 20.10+ instalado
- Docker Compose 2.0+ instalado
- Portas disponíveis: 8080 (backend), 5173 (frontend), 5432 (PostgreSQL), 6380 (Redis)

### Deploy Rápido

```bash
# 1. Subir toda a infraestrutura
docker-compose up -d

# 2. Verificar logs (aguardar inicialização completa)
docker-compose logs -f backend

# Aguardar mensagem: "Started AgendaInteligenteApplication"
```

### Serviços Disponíveis

Após o deploy, os seguintes serviços estarão disponíveis:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8080/api
- **Swagger UI**: http://localhost:8080/swagger-ui.html
- **Health Check**: http://localhost:8080/actuator/health
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6380

### Comandos Úteis

```bash
# Ver status dos serviços
docker-compose ps

# Ver logs de todos os serviços
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Parar todos os serviços
docker-compose down

# Parar e remover volumes (limpar dados)
docker-compose down -v

# Reiniciar um serviço específico
docker-compose restart backend
docker-compose restart frontend

# Reconstruir imagens (após mudanças no código)
docker-compose up -d --build
```

### Troubleshooting

**Backend não inicia:**
```bash
# Verificar logs
docker-compose logs backend

# Verificar se PostgreSQL está pronto
docker-compose ps postgres

# Reiniciar serviços
docker-compose restart postgres
docker-compose restart backend
```

**Erro de conexão com banco:**
```bash
# Aguardar PostgreSQL inicializar completamente
docker-compose restart postgres
# Aguardar 10 segundos
docker-compose restart backend
```

**Login do admin falha (Bad credentials) em produção:**
- Use a senha **123456** (não admin123). A migration V37 garante o hash correto após o deploy.
- Faça um novo deploy para rodar as migrations pendentes (V37) e tente novamente.

**Limpar tudo e recomeçar:**
```bash
# ⚠️ ATENÇÃO: Isso apaga todos os dados!
docker-compose down -v
docker-compose up -d
```

## 🔐 Dados de Primeiro Acesso

### Login Administrativo (Admin)

**Interface Administrativa**: http://localhost:5173/login

- **Email**: `admin@agendainteligente.com`
- **Senha**: `123456` (conforme DADOS_ACESSO.md; migration V37 garante este hash em produção)

**Perfil**: ADMIN (acesso total a todas as empresas e funcionalidades)

### Login de Gerente

**Interface Administrativa**: http://localhost:5173/login

- **Email**: `gerente@clinicasaudetotal.com.br`
- **Senha**: `123456`

**Perfil**: GERENTE (gerencia uma unidade específica)

### Login de Atendentes/Profissionais

**Interface Administrativa**: http://localhost:5173/login

**Atendente 1:**
- **Email**: `atendente1@clinicasaudetotal.com.br`
- **Senha**: `123456`

**Atendente 2:**
- **Email**: `atendente2@clinicasaudetotal.com.br`
- **Senha**: `123456`

**Perfil**: PROFISSIONAL/ATENDENTE (pode criar horários disponíveis)

### Perfis de Acesso

O sistema possui 4 níveis de acesso:

#### 1. **ADMIN**
- Acesso total a todas as unidades
- Pode criar/editar/excluir qualquer entidade
- Gerenciar usuários e permissões

#### 2. **GERENTE**
- Gerencia uma unidade específica
- Pode cadastrar atendentes e serviços
- Pode gerenciar horários disponíveis
- Pode ver e atualizar seu perfil
- Pode alterar senha

#### 3. **PROFISSIONAL** (Atendente)
- Pode criar e gerenciar seus horários disponíveis
- Pode ver e atualizar seu perfil
- Pode alterar senha
- Acesso limitado às funcionalidades do seu atendimento

#### 4. **CLIENTE**
- Interface pública: http://localhost:5173/cliente/login
- Pode agendar horários disponíveis
- Pode ver seus agendamentos
- Pode cancelar seus agendamentos
- Pode ver e atualizar seu perfil
- Pode alterar senha
- Pode recuperar senha

### Interface Pública para Clientes

**URLs:**
- Login: http://localhost:5173/cliente/login
- **Cadastro**: http://localhost:5173/cliente/cadastro
- Agendar: http://localhost:5173/cliente/agendar
- Meus Agendamentos: http://localhost:5173/cliente/meus-agendamentos

**Cadastro de Cliente:**
- Os clientes podem se cadastrar através da interface pública em http://localhost:5173/cliente/cadastro
- Ou podem ser cadastrados por um admin/gerente/profissional

**Clientes de Teste (já cadastrados):**

**Cliente 1 - José da Silva:**
- **Email/CPF**: `jose.silva@email.com` ou `12345678901`
- **Senha**: `123456`

**Cliente 2 - Maria Oliveira:**
- **Email/CPF**: `maria.oliveira@email.com` ou `98765432100`
- **Senha**: `123456`

**Cliente 3 - Pedro Costa:**
- **Email/CPF**: `pedro.costa@email.com` ou `11122233344`
- **Senha**: `123456`

**Cliente 4 - Ana Paula Santos:**
- **Email/CPF**: `ana.santos@email.com` ou `55566677788`
- **Senha**: `123456`

**Cliente 5 - Carlos Eduardo Lima:**
- **Email/CPF**: `carlos.lima@email.com` ou `99988877766`
- **Senha**: `123456`

### Recuperação de Senha

**Para Usuários:**
- Endpoint: `/api/publico/recuperacao-senha/usuario/solicitar`
- Envia token por email (configurar serviço de email em produção)

**Para Clientes:**
- Endpoint: `/api/publico/recuperacao-senha/cliente/solicitar`
- Envia token por email (configurar serviço de email em produção)

## 📊 Dados Iniciais Populados

O sistema já vem com dados de exemplo:

- ✅ **1 Clínica**: Clínica Saúde Total
- ✅ **2 Unidades**: Unidade Centro e Unidade Zona Norte
- ✅ **4 Usuários**:
  - 1 Admin (admin@agendainteligente.com)
  - 1 Gerente (gerente@clinicasaudetotal.com.br)
  - 2 Profissionais/Atendentes
- ✅ **8 Serviços** cadastrados
- ✅ **5 Clientes** de exemplo (todos com senha cadastrada)
- ✅ Atendentes vinculados aos serviços e unidades

## 🔧 Configurações do Docker

### Variáveis de Ambiente

As configurações padrão estão no `docker-compose.yml`. Para produção, altere:

**Backend:**
- `JWT_SECRET`: Gerar com `openssl rand -base64 64`
- `SPRING_DATASOURCE_PASSWORD`: Senha forte para PostgreSQL
- `SPRING_REDIS_HOST`: Host do Redis

**Frontend:**
- `VITE_API_URL`: URL da API backend

### Volumes Persistentes

Os dados são persistidos em volumes Docker:
- `postgres_data`: Dados do PostgreSQL
- `redis_data`: Dados do Redis
- `./logs`: Logs da aplicação

### Portas

- **8080**: Backend Spring Boot
- **5173**: Frontend React
- **5432**: PostgreSQL
- **6380**: Redis (mapeado da porta interna 6379)

## 📚 Documentação da API

Após iniciar o backend, acesse:

- **Swagger UI**: http://localhost:8080/swagger-ui.html
- **OpenAPI JSON**: http://localhost:8080/v3/api-docs

## 🏗️ Arquitetura

### Componentes

```
┌─────────────┐
│  Frontend   │ React + Vite + TypeScript
│  (Nginx)    │ Porta 5173
└──────┬──────┘
       │
┌──────▼──────┐
│   Backend   │ Spring Boot 3.3 + Java 21
│             │ Porta 8080
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
┌──▼──┐ ┌─▼───┐
│PostgreSQL│ │Redis│
│  :5432   │ │:6380│
└─────────┘ └─────┘
```

### Stack Tecnológica

**Backend:**
- Java 21
- Spring Boot 3.3
- PostgreSQL 16
- Redis 7
- Flyway (Migrations)
- MapStruct
- JWT Security

**Frontend:**
- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Query
- Axios

## 🔒 Segurança

- Autenticação JWT
- Controle de acesso baseado em perfis (RBAC)
- Senhas criptografadas (BCrypt)
- Validação de dados
- SQL Injection protegido (JPA)
- CORS configurado

## 📝 Migrations

As migrations do Flyway são executadas automaticamente na inicialização:
- `V1` a `V9`: Estrutura inicial
- `V10`: Gerentes, horários disponíveis e recuperação de senha

## 🎯 Funcionalidades Principais

### Para Administradores
- ✅ Gerenciar todas as unidades
- ✅ Gerenciar usuários e permissões
- ✅ Acesso total ao sistema
- ✅ Ver e atualizar perfil
- ✅ Alterar senha
- ✅ Recuperar senha

### Para Gerentes
- ✅ Gerenciar sua unidade específica
- ✅ Cadastrar atendentes e serviços
- ✅ Gerenciar horários disponíveis
- ✅ Ver relatórios da unidade
- ✅ Ver e atualizar perfil
- ✅ Alterar senha
- ✅ Recuperar senha

### Para Profissionais
- ✅ Criar horários disponíveis para agendamento
- ✅ Gerenciar seus próprios horários (criar, editar, excluir)
- ✅ Ver agendamentos
- ✅ Ver e atualizar perfil
- ✅ Alterar senha
- ✅ Recuperar senha

### Para Clientes
- ✅ Agendar horários online (interface pública)
- ✅ Ver horários disponíveis
- ✅ Ver seus agendamentos
- ✅ Cancelar agendamentos próprios
- ✅ Ver e atualizar perfil
- ✅ Alterar senha
- ✅ Recuperar senha

## 🚧 Próximos Passos

1. ✅ Sistema de perfis implementado
2. ✅ Interface pública para clientes
3. ✅ Recuperação de senha (backend pronto, configurar email)
4. ⏳ Personalizar interface por categoria de empresa
5. ⏳ Implementar notificações (email/SMS)
6. ⏳ Adicionar relatórios e dashboards
7. ⏳ Configurar backups automáticos

## 📖 Guia Rápido de Uso

### 1. Primeiro Acesso (Admin)

1. Acesse: http://localhost:5173/login
2. Use as credenciais: `admin@agendainteligente.com` / `admin123`
3. Explore o sistema administrativo

### 2. Gerenciar Unidade

1. Vá em "Unidades" → "Editar"
2. Preencha os dados e horários
3. Salve

### 3. Criar Atendentes

1. Vá em "Atendentes" → "Novo Atendente"
2. Associe à unidade e selecione os serviços que o atendente presta

### 4. Profissional Criar Horários Disponíveis

1. Faça login como profissional
2. Acesse "Meus Horários Disponíveis"
3. Clique em "Novo Horário"
4. Defina data/hora início e fim
5. Salve

### 5. Cliente Agendar

1. Acesse: http://localhost:5173/cliente/login
2. Se não tiver conta, cadastre-se
3. Vá em "Agendar"
4. Selecione unidade, serviço e período
5. Clique em "Buscar Horários Disponíveis"
6. Selecione um horário e confirme

## 📚 Documentação Adicional

Para informações mais detalhadas, consulte:

- **[ARQUITETURA.md](ARQUITETURA.md)** - Arquitetura técnica e modelo de dados
- **[DEPLOY_EASYPANEL.md](DEPLOY_EASYPANEL.md)** - Guia de deploy em produção com Easypanel
- **[TESTES.md](TESTES.md)** - Informações sobre testes
- **[MELHORES_PRATICAS.md](MELHORES_PRATICAS.md)** - Boas práticas implementadas

## 📄 Licença

Este projeto é privado e de uso interno.

---

**Versão**: 1.0  
**Última atualização**: 2024
