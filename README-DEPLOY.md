# 🚀 Guia Rápido de Deploy - Easypanel

Este é o guia rápido para deploy em produção usando **Easypanel**.

## ⚡ Deploy Rápido

### 1. Pré-requisitos

- ✅ Easypanel instalado e acessível
- ✅ Repositório Git com o código
- ✅ Domínio configurado apontando para o servidor

### 2. Criar Serviços no Easypanel

Siga a ordem abaixo:

1. **PostgreSQL** → Database → PostgreSQL
2. **Redis** → Database → Redis  
3. **Backend** → App → Docker (usar `Dockerfile.backend`)
4. **Frontend** → App → Docker (usar `frontend/Dockerfile`)

### 3. Configurar Variáveis de Ambiente

No serviço **Backend**, adicione:

```bash
SPRING_PROFILES_ACTIVE=prod
SPRING_DATASOURCE_URL=jdbc:postgresql://agenda-postgres:5432/agenda_inteligente
SPRING_DATASOURCE_USERNAME=[usuário do PostgreSQL]
SPRING_DATASOURCE_PASSWORD=[senha do PostgreSQL]
SPRING_REDIS_HOST=agenda-redis
SPRING_REDIS_PORT=6379
JWT_SECRET=[gerar com: openssl rand -base64 64]
NFSE_MANAUS_AMBIENTE=producao
NFSE_CERTIFICADO_PATH=/app/certificados/certificado.pfx
NFSE_CERTIFICADO_SENHA=[senha do certificado]
NFSE_USAR_ASSINATURA=true
PAYMENT_PROVIDER=stripe
PAYMENT_API_KEY=[sua chave]
PAYMENT_WEBHOOK_SECRET=[webhook secret]
```

No serviço **Frontend**, adicione:

```bash
VITE_API_URL=https://api.seudominio.com.br/api
```

### 4. Configurar Domínio e SSL

No serviço **Frontend**:
- Domínio: `seudominio.com.br`
- ✅ Habilitar SSL (Let's Encrypt automático)

## 📋 Checklist Mínimo

- [ ] JWT_SECRET alterado (não usar o padrão)
- [ ] Senhas do banco fortes
- [ ] Certificado digital NFS-e configurado (se necessário)
- [ ] Chaves de API de pagamento configuradas
- [ ] Domínio e SSL configurados
- [ ] Backups automáticos configurados no PostgreSQL

## 🔧 Comandos Úteis

### Ver Logs

No Easypanel, cada serviço tem aba "Logs" para visualizar em tempo real.

### Atualizar Aplicação

1. Faça push das alterações para o Git
2. No Easypanel, vá ao serviço
3. Clique em **"Redeploy"** → **"Rebuild"**

Ou configure **"Auto Deploy"** para atualizar automaticamente.

### Backup

No serviço PostgreSQL, configure backups automáticos:
- Frequência: Diário
- Horário: 02:00
- Retenção: 30 dias

## ⚠️ Problemas Comuns

### Backend não inicia
- Verificar logs no Easypanel
- Verificar variáveis de ambiente (especialmente JWT_SECRET)
- Verificar conectividade com PostgreSQL e Redis

### Frontend não carrega API
- Verificar variável `VITE_API_URL`
- Verificar se backend está rodando
- Verificar CORS no backend

### Erro de conexão com banco
- Verificar nome do serviço PostgreSQL (deve ser `agenda-postgres`)
- Verificar credenciais
- Verificar se PostgreSQL está rodando

## 📚 Documentação Completa

Para instruções detalhadas, consulte:
- **[GUIA_DEPLOY_GITHUB.md](GUIA_DEPLOY_GITHUB.md)** - Guia específico para repositório GitHub ⭐
- **[DEPLOY_EASYPANEL.md](DEPLOY_EASYPANEL.md)** - Guia completo passo a passo
- [RESUMO_DEPLOY.md](RESUMO_DEPLOY.md) - Resumo executivo

**Repositório**: https://github.com/christopheScantelbury/agendaInteligente
