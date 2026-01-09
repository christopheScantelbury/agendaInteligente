# 🚀 Guia Passo a Passo - Deploy no EasyPanel

Este guia é baseado na interface do EasyPanel que você está usando. Siga os passos na ordem apresentada.

---

## 📋 **PASSO 1: Criar Serviço PostgreSQL**

1. No EasyPanel, clique em **"+ Serviço"** (ou **"Add Service"**)
2. Selecione **"Database"** → **"PostgreSQL"**
3. Configure:
   - **Nome do Serviço**: `agenda_postgres`
   - **Versão**: `16-alpine`
   - **Database Name**: `agenda_inteligente` ⚠️ **IMPORTANTE: Deve ser exatamente este nome!**
   - **Username**: `agenda_user` (ou outro de sua escolha)
   - **Password**: ⚠️ **GERE UMA SENHA FORTE E ANOTE!**
   - **Porta**: Deixe padrão (5432 interno)
4. Clique em **"Deploy"** ou **"Create"**
5. ⏳ Aguarde o serviço ficar **verde** (rodando)

**📝 Anote:**
- Nome do serviço: `agenda_postgres`
- Username: `agenda_user`
- Password: `Scantelbury1`
- Database: `agenda_inteligente`

**🔧 Se aparecer erro "database agenda_user does not exist":**
O EasyPanel pode estar usando o username como database. Para corrigir:
1. Acesse o terminal do serviço PostgreSQL no EasyPanel
2. Execute:
```sql
CREATE DATABASE agenda_inteligente;
GRANT ALL PRIVILEGES ON DATABASE agenda_inteligente TO agenda_user;
```
3. Ou recrie o serviço garantindo que o **Database Name** seja `agenda_inteligente` e não o username

---

## 📋 **PASSO 2: Criar Serviço Redis**

1. Clique em **"+ Serviço"**
2. Selecione **"Database"** → **"Redis"**
3. Configure:
   - **Nome do Serviço**: `agenda_redis`
   - **Versão**: `7-alpine`
   - **Porta**: Deixe padrão (6379 interno)
4. Clique em **"Deploy"**
5. ⏳ Aguarde o serviço ficar **verde**

**📝 Anote:**
- Nome do serviço: `agenda_redis`

---

## 📋 **PASSO 3: Criar Serviço Backend (Spring Boot)**

1. Clique em **"+ Serviço"**
2. Selecione **"App"** → **"Dockerfile"** (ou **"Docker"**)
3. Configure:

### **Aba "Source" (Fonte)**
- **Nome do Serviço**: `agenda_backend`
- **Source Type**: Selecione uma das opções:
  - **Opção A - GitHub/Git**: 
    - Repository URL: `https://github.com/christopheScantelbury/agendaInteligente`
    - Branch: `main` (ou sua branch)
    - Dockerfile Path: `Dockerfile.backend`
    - Build Context: `.` (ponto, raiz do projeto)
  - **Opção B - Upload**:
    - Faça upload de um ZIP do projeto
    - Dockerfile Path: `Dockerfile.backend`
    - Build Context: `.`

### **Aba "Environment Variables" (Variáveis de Ambiente)**
Adicione estas variáveis (substitua os valores entre `[]`):

```bash
# Spring Profile
SPRING_PROFILES_ACTIVE=prod

# Database - Use os valores anotados no PASSO 1
SPRING_DATASOURCE_URL=jdbc:postgresql://agenda_postgres:5432/agenda_inteligente
SPRING_DATASOURCE_USERNAME=agenda_user
SPRING_DATASOURCE_PASSWORD=[SENHA DO POSTGRES ANOTADA NO PASSO 1]

# Redis
SPRING_REDIS_HOST=agenda_redis
SPRING_REDIS_PORT=6379

# JWT - GERE UMA CHAVE SEGURA (obrigatório alterar!)
JWT_SECRET=[GERE COM: openssl rand -base64 64]

# NFS-e Manaus (se necessário)
NFSE_MANAUS_AMBIENTE=producao
NFSE_CERTIFICADO_PATH=/app/certificados/certificado.pfx
NFSE_CERTIFICADO_SENHA=[senha do certificado]
NFSE_USAR_ASSINATURA=true

# Gateway de Pagamento (se necessário)
PAYMENT_PROVIDER=stripe
PAYMENT_API_KEY=[sua chave de API]
PAYMENT_WEBHOOK_SECRET=[webhook secret]
```

### **Aba "Resources" (Recursos)**
- **CPU**: 1-2 cores
- **RAM**: 1-2GB

### **Aba "Networking" (Rede)**
- **Porta Interna**: `8080`
- **Domínio**: (opcional) `api.seudominio.com.br` ou deixe sem domínio

### **Aba "Dependencies" (Dependências)**
Adicione dependências:
- `agenda_postgres` (aguardar healthy)
- `agenda_redis` (aguardar healthy)

4. Clique em **"Deploy"**
5. ⏳ Aguarde o build e o serviço ficar **verde**

**🔍 Verificar:**
- Acesse os logs do serviço para ver se iniciou corretamente
- Procure por: `Started AgendaInteligenteApplication`

---

## 📋 **PASSO 4: Criar Serviço Frontend (React)**

1. Clique em **"+ Serviço"**
2. Selecione **"App"** → **"Dockerfile"** (ou **"Docker"**)
3. Configure:

### **Aba "Source" (Fonte)**
- **Nome do Serviço**: `agenda_frontend`
- **Source Type**: Selecione uma das opções:
  - **Opção A - GitHub/Git**:
    - Repository URL: `https://github.com/christopheScantelbury/agendaInteligente`
    - Branch: `main` (ou sua branch)
    - Dockerfile Path: `frontend/Dockerfile`
    - Build Context: `frontend`
  - **Opção B - Upload**:
    - Faça upload de um ZIP do projeto
    - Dockerfile Path: `frontend/Dockerfile`
    - Build Context: `frontend`

### **Aba "Environment Variables" (Variáveis de Ambiente)**
Adicione:

```bash
# URL da API Backend
# Se o backend tiver domínio próprio:
VITE_API_URL=https://api.seudominio.com.br/api
# OU se usar mesmo domínio com proxy:
VITE_API_URL=/api
```

### **Aba "Build Arguments" (Argumentos de Build)**
Adicione (mesmo valor da variável de ambiente):

```bash
VITE_API_URL=https://api.seudominio.com.br/api
# OU
VITE_API_URL=/api
```

### **Aba "Resources" (Recursos)**
- **CPU**: 0.5 cores
- **RAM**: 512MB

### **Aba "Networking" (Rede)**
- **Porta Interna**: `80`
- **Domínio**: `seudominio.com.br` (seu domínio)
- ✅ **Habilitar SSL** (Let's Encrypt automático)

### **Aba "Dependencies" (Dependências)**
Adicione dependência:
- `agenda_backend` (aguardar healthy)

4. Clique em **"Deploy"**
5. ⏳ Aguarde o build e o serviço ficar **verde**

---

## 🔧 **PASSO 5: Configurar Proxy Reverso (Opcional)**

Se você quiser que o frontend faça proxy para o backend no mesmo domínio:

1. No serviço **Frontend**, vá em **"Networking"**
2. Configure **Proxy Rules** ou **Reverse Proxy**:
   - Path: `/api`
   - Target: `http://agenda_backend:8080`
   - Ou use a funcionalidade de proxy do EasyPanel

**OU** ajuste o `nginx.conf` do frontend para usar o nome correto do serviço backend.

---

## ✅ **PASSO 6: Verificar Deploy**

### 1. Verificar Health Checks
- Todos os serviços devem estar **verde** no EasyPanel

### 2. Testar Backend
```bash
# Se tiver domínio:
curl https://api.seudominio.com.br/actuator/health

# Ou via IP interno do EasyPanel
```

### 3. Testar Frontend
- Acesse: `https://seudominio.com.br`
- Verifique se a página carrega
- Teste fazer login

### 4. Verificar Logs
- No EasyPanel, acesse a aba **"Logs"** de cada serviço
- Verifique se há erros

---

## 🐛 **Troubleshooting**

### Backend não inicia
1. Verifique os **logs** no EasyPanel
2. Verifique se as **variáveis de ambiente** estão corretas
3. Verifique se o **PostgreSQL** e **Redis** estão rodando
4. Verifique se o nome do serviço PostgreSQL está correto: `agenda_postgres`

### Frontend não carrega API
1. Verifique a variável `VITE_API_URL`
2. Se usar proxy, verifique a configuração do proxy
3. Verifique o console do navegador (F12) para erros CORS

### Erro de conexão com banco
1. Verifique o **nome do serviço** PostgreSQL (deve ser exatamente `agenda_postgres`)
2. Verifique **credenciais** (username e password)
3. Verifique se o PostgreSQL está **verde** (rodando)

### Build falha
1. Verifique se o **Dockerfile Path** está correto
2. Verifique se o **Build Context** está correto
3. Verifique os **logs de build** no EasyPanel

---

## 📝 **Checklist Final**

- [ ] PostgreSQL criado e rodando (verde)
- [ ] Redis criado e rodando (verde)
- [ ] Backend criado, buildado e rodando (verde)
- [ ] Frontend criado, buildado e rodando (verde)
- [ ] Variáveis de ambiente configuradas corretamente
- [ ] Domínio configurado (se aplicável)
- [ ] SSL habilitado (se aplicável)
- [ ] Health checks passando
- [ ] Aplicação acessível via navegador

---

## 🔄 **Atualizar Aplicação**

### Via EasyPanel
1. Vá no serviço que deseja atualizar
2. Clique em **"Redeploy"** → **"Rebuild"**

### Via Git (Auto Deploy)
1. Configure **webhook** no repositório Git
2. No EasyPanel, habilite **"Auto Deploy"** no serviço
3. A cada push, o serviço será atualizado automaticamente

---

## 📚 **Recursos Adicionais**

- [Documentação Completa](DEPLOY_EASYPANEL.md)
- [README Principal](README.md)

---

**Última atualização**: 2024  
**Versão**: 2.0 - Guia Simplificado
