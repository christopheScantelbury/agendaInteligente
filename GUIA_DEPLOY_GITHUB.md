# 🚀 Guia de Deploy - Repositório GitHub

Este guia mostra como fazer deploy da aplicação **Agenda Inteligente** no Easypanel usando o repositório GitHub.

**Repositório**: https://github.com/christopheScantelbury/agendaInteligente

---

## 📋 Pré-requisitos

- ✅ Easypanel instalado e acessível
- ✅ Acesso ao repositório GitHub
- ✅ Domínio configurado apontando para o servidor

---

## 🔧 Passo 1: Configurar PostgreSQL

1. No Easypanel, clique em **"Novo Serviço"** ou **"Create Service"**
2. Selecione **"Database"** → **"PostgreSQL"**
3. Configure:
   - **Nome**: `agenda-postgres`
   - **Versão**: `16-alpine`
   - **Database**: `agenda_inteligente`
   - **Usuário**: `agenda_user` (ou outro de sua escolha)
   - **Senha**: `[GERAR SENHA FORTE]` ⚠️ **SALVAR ESTA SENHA!**
4. Clique em **"Deploy"**

**Anote as credenciais:**
- Usuário: `agenda_user`
- Senha: `[senha gerada]`
- Database: `agenda_inteligente`

---

## 🔧 Passo 2: Configurar Redis

1. Clique em **"Novo Serviço"**
2. Selecione **"Database"** → **"Redis"**
3. Configure:
   - **Nome**: `agenda-redis`
   - **Versão**: `7-alpine`
4. Clique em **"Deploy"**

---

## 🔧 Passo 3: Configurar Backend (Spring Boot)

### 3.1. Criar Serviço

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
Adicione as seguintes variáveis (substitua os valores entre `[]`):

```bash
# Spring Profile
SPRING_PROFILES_ACTIVE=prod

# Database (use as credenciais do PostgreSQL criado)
SPRING_DATASOURCE_URL=jdbc:postgresql://agenda-postgres:5432/agenda_inteligente
SPRING_DATASOURCE_USERNAME=agenda_user
SPRING_DATASOURCE_PASSWORD=[senha do PostgreSQL criada no Passo 1]

# Redis
SPRING_REDIS_HOST=agenda-redis
SPRING_REDIS_PORT=6379

# JWT (OBRIGATÓRIO: gerar chave forte)
JWT_SECRET=[gerar com: openssl rand -base64 64]

# NFS-e Manaus
NFSE_MANAUS_AMBIENTE=producao
NFSE_CERTIFICADO_PATH=/app/certificados/certificado.pfx
NFSE_CERTIFICADO_SENHA=[senha do certificado digital]
NFSE_USAR_ASSINATURA=true

# Gateway de Pagamento
PAYMENT_PROVIDER=stripe
PAYMENT_API_KEY=[sua chave de API do Stripe]
PAYMENT_WEBHOOK_SECRET=[webhook secret do Stripe]
```

**⚠️ IMPORTANTE:**
- Substitua `[senha do PostgreSQL]` pela senha gerada no Passo 1
- Gere o `JWT_SECRET` com: `openssl rand -base64 64` (ou use um gerador online)
- Configure as chaves de pagamento se já tiver

#### Aba "Resources"
- **CPU**: 1-2 cores
- **RAM**: 1-2GB

#### Aba "Networking"
- **Porta Interna**: `8080`
- **Domínio**: `api.seudominio.com.br` (opcional, se quiser subdomínio separado)
- Ou deixe sem domínio e use proxy reverso no frontend

#### Aba "Volumes" (Opcional)
Se precisar de certificado digital NFS-e:
- **Caminho no Container**: `/app/certificados`
- **Volume**: Criar volume persistente ou montar diretório do servidor

#### Aba "Dependencies"
Adicione dependências:
- `agenda-postgres` (aguardar healthy)
- `agenda-redis` (aguardar healthy)

4. Clique em **"Deploy"**

---

## 🔧 Passo 4: Configurar Frontend (React)

### 4.1. Criar Serviço

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

#### Aba "Build Arguments"
Adicione:
```bash
VITE_API_URL=https://api.seudominio.com.br/api
# OU se usar mesmo domínio:
# VITE_API_URL=https://seudominio.com.br/api
```

#### Aba "Environment Variables"
```bash
VITE_API_URL=https://api.seudominio.com.br/api
```

#### Aba "Resources"
- **CPU**: 0.5 cores
- **RAM**: 512MB

#### Aba "Networking"
- **Porta Interna**: `5173`
- **Domínio**: `seudominio.com.br` (seu domínio)
- ✅ Habilitar **SSL** (Let's Encrypt automático)

#### Aba "Dependencies"
Adicione dependência:
- `agenda-backend` (aguardar healthy)

4. Clique em **"Deploy"**

---

## ⏱️ Aguardar Deploy

Após criar os serviços:

1. **PostgreSQL** e **Redis** devem iniciar rapidamente (1-2 minutos)
2. **Backend** vai fazer build (pode levar 5-10 minutos na primeira vez)
3. **Frontend** vai fazer build (pode levar 3-5 minutos na primeira vez)

**Monitore os logs** de cada serviço para verificar o progresso.

---

## ✅ Verificar Deploy

### 1. Verificar Status dos Serviços

No Easypanel, verifique se todos os serviços estão com status **verde** (rodando):
- ✅ `agenda-postgres` - Rodando
- ✅ `agenda-redis` - Rodando
- ✅ `agenda-backend` - Rodando
- ✅ `agenda-frontend` - Rodando

### 2. Testar Backend

```bash
# Health check
curl https://api.seudominio.com.br/actuator/health

# Ou se não tiver subdomínio separado
curl https://seudominio.com.br/api/actuator/health
```

Resposta esperada:
```json
{"status":"UP"}
```

### 3. Testar Frontend

Acesse no navegador:
```
https://seudominio.com.br
```

### 4. Verificar Logs

No Easypanel, em cada serviço, clique na aba **"Logs"**:
- Verifique se há erros no backend
- Verifique se o frontend está servindo corretamente
- Verifique se as migrations foram executadas (no log do backend)

---

## 🔄 Atualizar Aplicação

### Opção 1: Deploy Manual

1. Faça push das alterações para o GitHub:
```bash
git add .
git commit -m "Atualização"
git push origin main
```

2. No Easypanel, vá ao serviço que deseja atualizar
3. Clique em **"Redeploy"** → **"Rebuild"**

### Opção 2: Auto Deploy (Recomendado)

1. No serviço, vá em **"Settings"** → **"Source"**
2. Habilite **"Auto Deploy"**
3. Configure:
   - **Branch**: `main`
   - **Webhook**: O Easypanel fornecerá uma URL de webhook
4. No GitHub:
   - Vá em **Settings** → **Webhooks** → **Add webhook**
   - Cole a URL do webhook fornecida pelo Easypanel
   - Eventos: `Just the push event`
   - Salve

Agora, a cada push na branch `main`, o serviço será atualizado automaticamente!

---

## 💾 Backup do Banco de Dados

### Configurar Backup Automático

1. No serviço **PostgreSQL** (`agenda-postgres`), vá em **"Backups"**
2. Configure:
   - **Frequência**: Diário
   - **Horário**: 02:00 (recomendado)
   - **Retenção**: 30 dias
3. Salve

### Backup Manual

1. No serviço PostgreSQL, clique em **"Backup"**
2. O backup será criado e você poderá baixá-lo

---

## 🔐 Configurar Certificado Digital NFS-e

Se você precisa usar certificado digital para assinar as NFS-e:

### Opção 1: Via Volume no Easypanel

1. No serviço **Backend**, vá em **"Volumes"**
2. Adicione volume:
   - **Caminho no Container**: `/app/certificados`
   - **Tipo**: Volume persistente ou diretório do servidor
3. Via SSH no servidor, copie o certificado:
```bash
# Conectar ao servidor
ssh user@seu-servidor

# Copiar certificado para o volume
# (ajuste o caminho conforme sua configuração de volume)
cp certificado.pfx /caminho/do/volume/
```

### Opção 2: Adicionar ao Repositório (NÃO RECOMENDADO)

⚠️ **NÃO recomendado por segurança**, mas se necessário:
1. Adicione o certificado em `certificados/certificado.pfx` no repositório
2. O Dockerfile já copia de `./certificados/`

---

## 🐛 Troubleshooting

### Backend não inicia

**Verificar logs:**
1. No Easypanel, vá ao serviço `agenda-backend`
2. Clique em **"Logs"**
3. Procure por erros

**Problemas comuns:**
- ❌ Erro de conexão com banco → Verificar credenciais do PostgreSQL
- ❌ Erro de JWT → Verificar se `JWT_SECRET` está configurado
- ❌ Erro de certificado → Verificar se certificado existe e senha está correta

### Frontend não carrega

**Verificar:**
1. Variável `VITE_API_URL` está configurada corretamente
2. Backend está rodando e acessível
3. CORS está configurado no backend (deve permitir o domínio do frontend)

### Erro de build

**Verificar:**
1. Dockerfile correto (`Dockerfile.backend` para backend, `frontend/Dockerfile` para frontend)
2. Build context correto (`.` para backend, `frontend` para frontend)
3. Repositório acessível (público ou com credenciais configuradas)

### Migrations não executam

As migrations são executadas automaticamente pelo Flyway quando o backend inicia. Verifique os logs do backend para ver se houve erro nas migrations.

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

## 📝 Checklist Final

- [ ] PostgreSQL criado e rodando
- [ ] Redis criado e rodando
- [ ] Backend criado com todas as variáveis de ambiente
- [ ] Frontend criado com domínio e SSL
- [ ] Dependências configuradas entre serviços
- [ ] Health checks passando
- [ ] Frontend acessível
- [ ] Backups automáticos configurados
- [ ] Auto Deploy configurado (opcional)

---

## 🎯 Resumo Rápido

1. ✅ Criar PostgreSQL (`agenda-postgres`)
2. ✅ Criar Redis (`agenda-redis`)
3. ✅ Criar Backend (`agenda-backend`) com repositório GitHub
4. ✅ Criar Frontend (`agenda-frontend`) com repositório GitHub
5. ✅ Configurar variáveis de ambiente
6. ✅ Configurar domínio e SSL
7. ✅ Aguardar deploy
8. ✅ Testar aplicação

---

## 📚 Links Úteis

- **Repositório**: https://github.com/christopheScantelbury/agendaInteligente
- **Documentação Easypanel**: https://easypanel.io/docs
- **Guia Completo**: [DEPLOY_EASYPANEL.md](DEPLOY_EASYPANEL.md)

---

**Última atualização**: 2024  
**Versão**: 1.0

