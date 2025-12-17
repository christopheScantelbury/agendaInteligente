# 🚀 Deploy no Easypanel - Agenda Inteligente

## 📋 Sobre o Easypanel

O [Easypanel](https://easypanel.io/docs) é uma plataforma de gerenciamento de servidores baseada em Docker que oferece interface web para deploy e gerenciamento de aplicações. É uma excelente alternativa ao Docker Compose tradicional.

**Vantagens:**
- Interface web intuitiva
- Gerenciamento de múltiplos serviços
- SSL automático (Let's Encrypt)
- Backups automáticos
- Monitoramento integrado
- Deploy via Git

---

## 🎯 Pré-requisitos

### Servidor com Easypanel Instalado

- ✅ Easypanel instalado e acessível
- ✅ Docker Builder configurado (padrão "default")
- ✅ Portas 80 e 443 disponíveis
- ✅ Acesso SSH ao servidor (para configurações iniciais)

### Requisitos do Servidor

- **CPU**: Mínimo 2 cores (recomendado 4+)
- **RAM**: Mínimo 8GB (recomendado 16GB)
- **Disco**: 50GB+ SSD
- **SO**: Linux (Ubuntu 22.04 LTS recomendado)

---

## 📦 Estrutura de Serviços no Easypanel

Vamos criar os seguintes serviços:

1. **PostgreSQL** - Banco de dados
2. **Redis** - Cache
3. **Backend** - API Spring Boot
4. **Frontend** - Aplicação React

---

## 🔧 Configuração Passo a Passo

### 1. Preparar Repositório Git

Certifique-se de que o código está em um repositório Git acessível:

```bash
# Se ainda não estiver em um repositório
git init
git add .
git commit -m "Initial commit"
git remote add origin <seu-repositorio>
git push -u origin main
```

### 2. Criar Serviço PostgreSQL

1. No Easypanel, clique em **"Novo Serviço"** ou **"Create Service"**
2. Selecione **"Database"** → **"PostgreSQL"**
3. Configure:
   - **Nome**: `agenda-postgres`
   - **Versão**: `16-alpine`
   - **Database**: `agenda_inteligente`
   - **Usuário**: `agenda_user` (ou outro de sua escolha)
   - **Senha**: `[GERAR SENHA FORTE]` ⚠️ **IMPORTANTE: Salvar esta senha!**
   - **Porta**: Deixe padrão (5432 interno)
4. Clique em **"Deploy"**

**Variáveis importantes:**
- `POSTGRES_DB=agenda_inteligente`
- `POSTGRES_USER=agenda_user`
- `POSTGRES_PASSWORD=[senha gerada]`

> 💡 **Para deploy usando o repositório GitHub**, consulte o [GUIA_DEPLOY_GITHUB.md](GUIA_DEPLOY_GITHUB.md) com instruções específicas para o repositório: https://github.com/christopheScantelbury/agendaInteligente

### 3. Criar Serviço Redis

1. Clique em **"Novo Serviço"**
2. Selecione **"Database"** → **"Redis"**
3. Configure:
   - **Nome**: `agenda-redis`
   - **Versão**: `7-alpine`
   - **Porta**: Deixe padrão (6379 interno)
4. Clique em **"Deploy"**

### 4. Criar Serviço Backend (Spring Boot)

1. Clique em **"Novo Serviço"**
2. Selecione **"App"** → **"Docker"**
3. Configure:

#### Aba "Source"
- **Nome**: `agenda-backend`
- **Source Type**: `Git Repository`
- **Repository URL**: `https://github.com/christopheScantelbury/agendaInteligente`
- **Branch**: `main`
- **Dockerfile Path**: `Dockerfile.backend`
- **Build Context**: `.` (raiz do projeto)

#### Aba "Environment Variables"
Adicione as seguintes variáveis:

```bash
# Spring Profile
SPRING_PROFILES_ACTIVE=prod

# Database
SPRING_DATASOURCE_URL=jdbc:postgresql://agenda-postgres:5432/agenda_inteligente
SPRING_DATASOURCE_USERNAME=agenda_user
SPRING_DATASOURCE_PASSWORD=[senha do PostgreSQL criada anteriormente]

# Redis
SPRING_REDIS_HOST=agenda-redis
SPRING_REDIS_PORT=6379

# JWT (OBRIGATÓRIO ALTERAR)
JWT_SECRET=[gerar com: openssl rand -base64 64]

# NFS-e Manaus
NFSE_MANAUS_AMBIENTE=producao
NFSE_CERTIFICADO_PATH=/app/certificados/certificado.pfx
NFSE_CERTIFICADO_SENHA=[senha do certificado]
NFSE_USAR_ASSINATURA=true

# Gateway de Pagamento
PAYMENT_PROVIDER=stripe
PAYMENT_API_KEY=[sua chave de API]
PAYMENT_WEBHOOK_SECRET=[webhook secret]
```

#### Aba "Resources"
- **CPU**: 1-2 cores
- **RAM**: 1-2GB

#### Aba "Networking"
- **Porta Interna**: `8080`
- **Domínio**: `api.seudominio.com.br` (opcional, se quiser subdomínio separado)
- Ou deixe sem domínio e use proxy reverso no frontend

#### Aba "Volumes"
Adicione volumes para:
- **Logs**: `/app/logs` → `./logs` (ou volume persistente)
- **Certificados**: `/app/certificados` → `./certificados` (ou volume persistente)

4. Clique em **"Deploy"**

### 5. Criar Serviço Frontend (React)

1. Clique em **"Novo Serviço"**
2. Selecione **"App"** → **"Docker"**
3. Configure:

#### Aba "Source"
- **Nome**: `agenda-frontend`
- **Source Type**: `Git Repository`
- **Repository URL**: `https://github.com/christopheScantelbury/agendaInteligente`
- **Branch**: `main`
- **Dockerfile Path**: `frontend/Dockerfile`
- **Build Context**: `frontend`

#### Aba "Environment Variables"
```bash
# URL da API Backend
VITE_API_URL=https://api.seudominio.com.br/api
# OU se usar mesmo domínio:
# VITE_API_URL=https://seudominio.com.br/api
```

#### Aba "Build Arguments"
Adicione:
```bash
VITE_API_URL=https://api.seudominio.com.br/api
```

#### Aba "Resources"
- **CPU**: 0.5 cores
- **RAM**: 512MB

#### Aba "Networking"
- **Porta Interna**: `5173`
- **Domínio**: `seudominio.com.br`
- ✅ Habilitar **SSL** (Let's Encrypt automático)

4. Clique em **"Deploy"**

---

## 🔗 Configurar Dependências entre Serviços

No Easypanel, você pode configurar dependências:

1. No serviço **Backend**, adicione dependências:
   - `agenda-postgres` (aguardar healthy)
   - `agenda-redis` (aguardar healthy)

2. No serviço **Frontend**, adicione dependência:
   - `agenda-backend` (aguardar healthy)

---

## 📝 Configurar Certificado Digital NFS-e

### Opção 1: Via Volume

1. No servidor, crie diretório:
```bash
mkdir -p /var/lib/docker/volumes/agenda-certificados/_data
```

2. Copie o certificado:
```bash
scp certificado.pfx user@servidor:/var/lib/docker/volumes/agenda-certificados/_data/
```

3. No Easypanel, no serviço Backend:
   - Adicione volume: `/app/certificados` → `agenda-certificados`

### Opção 2: Via Git (NÃO RECOMENDADO para produção)

Se o certificado estiver no repositório (não recomendado por segurança):
- O Dockerfile já copia de `./certificados/`

---

## 🔒 Configurar SSL/HTTPS

O Easypanel gerencia SSL automaticamente via Let's Encrypt:

1. No serviço **Frontend**, configure:
   - **Domínio**: `seudominio.com.br`
   - ✅ Habilitar **SSL**
   - Easypanel irá gerar certificado automaticamente

2. Para o **Backend** (se usar subdomínio separado):
   - **Domínio**: `api.seudominio.com.br`
   - ✅ Habilitar **SSL**

---

## 🗄️ Executar Migrations do Banco

Após o primeiro deploy do backend:

1. Acesse o terminal do serviço `agenda-backend` no Easypanel
2. Ou via SSH no servidor:
```bash
docker exec -it agenda-backend sh
```

3. Verifique se as migrations foram executadas (Flyway executa automaticamente)
4. Se necessário, execute manualmente:
```bash
# As migrations são executadas automaticamente pelo Flyway na inicialização
# Verifique os logs para confirmar
```

---

## 🔍 Verificar Deploy

### 1. Health Checks

No Easypanel, verifique o status de cada serviço:
- ✅ Verde = Rodando
- ⚠️ Amarelo = Iniciando
- ❌ Vermelho = Erro

### 2. Testar API

```bash
# Health check
curl https://api.seudominio.com.br/actuator/health

# Ou se usar mesmo domínio
curl https://seudominio.com.br/api/actuator/health
```

### 3. Testar Frontend

Acesse: `https://seudominio.com.br`

### 4. Verificar Logs

No Easypanel, cada serviço tem aba "Logs":
- Verifique logs do backend para erros
- Verifique logs do frontend
- Verifique logs do PostgreSQL se houver problemas de conexão

---

## 🔄 Atualizar Aplicação

### Via Easypanel (Recomendado)

1. No serviço que deseja atualizar, clique em **"Redeploy"**
2. Ou configure **"Auto Deploy"** para atualizar automaticamente no push

### Via Git Push (Auto Deploy)

1. Configure webhook no repositório Git
2. No Easypanel, habilite **"Auto Deploy"** no serviço
3. A cada push na branch configurada, o serviço será atualizado automaticamente

### Manual

1. Faça push das alterações para o repositório
2. No Easypanel, vá ao serviço
3. Clique em **"Redeploy"** → **"Rebuild"**

---

## 💾 Backup do Banco de Dados

### Configurar Backup Automático no Easypanel

1. No serviço **PostgreSQL**, vá em **"Backups"**
2. Configure:
   - **Frequência**: Diário
   - **Horário**: 02:00 (recomendado)
   - **Retenção**: 30 dias
3. Salve configuração

### Backup Manual

1. No serviço PostgreSQL, clique em **"Backup"**
2. Ou via terminal:
```bash
docker exec agenda-postgres pg_dump -U agenda_user agenda_inteligente > backup.sql
```

---

## 🔧 Configurações Avançadas

### 1. Variáveis de Ambiente por Ambiente

No Easypanel, você pode ter múltiplos ambientes:
- **Production**: Variáveis de produção
- **Staging**: Variáveis de homologação

### 2. Recursos e Limites

Configure limites de recursos em cada serviço:
- **Backend**: 1-2 CPU, 1-2GB RAM
- **Frontend**: 0.5 CPU, 512MB RAM
- **PostgreSQL**: 1-2 CPU, 2-4GB RAM
- **Redis**: 0.5 CPU, 512MB-1GB RAM

### 3. Health Checks

O Easypanel já configura health checks básicos. Para customizar:

**Backend:**
- **Path**: `/actuator/health`
- **Interval**: 30s
- **Timeout**: 10s

**Frontend:**
- **Path**: `/`
- **Interval**: 30s

### 4. Restart Policies

Configure restart automático:
- **Always**: Reinicia sempre que parar
- **On Failure**: Reinicia apenas em caso de erro

---

## 🐛 Troubleshooting

### Backend não inicia

1. **Verificar logs** no Easypanel
2. **Verificar variáveis de ambiente** (especialmente JWT_SECRET e senhas)
3. **Verificar conectividade** com PostgreSQL e Redis
4. **Verificar certificado digital** (se usar NFS-e)

### Frontend não carrega API

1. **Verificar variável** `VITE_API_URL`
2. **Verificar CORS** no backend
3. **Verificar proxy** no nginx (se configurado)

### Erro de conexão com banco

1. **Verificar nome do serviço** PostgreSQL (deve ser `agenda-postgres`)
2. **Verificar credenciais** (usuário e senha)
3. **Verificar se PostgreSQL está rodando**
4. **Verificar rede** (todos devem estar na mesma rede Docker)

### Certificado NFS-e não encontrado

1. **Verificar caminho** do certificado
2. **Verificar volume** montado corretamente
3. **Verificar permissões** do arquivo
4. **Verificar senha** do certificado

---

## 📊 Monitoramento

### Métricas no Easypanel

O Easypanel oferece:
- Uso de CPU e RAM por serviço
- Uso de disco
- Logs em tempo real
- Status de saúde dos serviços

### Métricas da Aplicação

Acesse via API:
- **Health**: `https://api.seudominio.com.br/actuator/health`
- **Metrics**: `https://api.seudominio.com.br/actuator/metrics`
- **Info**: `https://api.seudominio.com.br/actuator/info`

---

## 🔐 Segurança

### Checklist de Segurança

- [ ] JWT_SECRET alterado (não usar padrão)
- [ ] Senhas do banco fortes
- [ ] SSL/HTTPS habilitado
- [ ] Swagger desabilitado em produção
- [ ] Certificado digital protegido
- [ ] Firewall configurado
- [ ] Backups automáticos configurados
- [ ] Logs não expõem informações sensíveis

### Desabilitar Swagger em Produção

O arquivo `application-prod.yml` já desabilita o Swagger. Certifique-se de que:
- `SPRING_PROFILES_ACTIVE=prod` está configurado
- O perfil `prod` está ativo

---

## 📚 Recursos Adicionais

- [Documentação Easypanel](https://easypanel.io/docs)
- [README-DEPLOY.md](README-DEPLOY.md) - Guia rápido
- [RESUMO_DEPLOY.md](RESUMO_DEPLOY.md) - Resumo executivo

---

## 🎯 Resumo do Deploy no Easypanel

1. ✅ Criar serviço PostgreSQL
2. ✅ Criar serviço Redis
3. ✅ Criar serviço Backend (com variáveis de ambiente)
4. ✅ Criar serviço Frontend (com domínio e SSL)
5. ✅ Configurar dependências entre serviços
6. ✅ Configurar certificado digital (se necessário)
7. ✅ Configurar backups automáticos
8. ✅ Testar aplicação
9. ✅ Monitorar logs e métricas

---

**Última atualização**: 2024  
**Versão**: 1.0

