# 🚀 Quick Start - Agenda Inteligente

## Início Rápido com Docker

### 1. Subir a infraestrutura

```bash
docker-compose up -d
```

Isso irá iniciar:
- ✅ PostgreSQL (porta 5432)
- ✅ Redis (porta 6379)
- ✅ Backend Spring Boot (porta 8080)
- ✅ Frontend React (porta 5173)

### 2. Aguardar inicialização

```bash
# Verificar logs
docker-compose logs -f backend

# Aguardar mensagem: "Started AgendaInteligenteApplication"
```

### 3. Acessar a aplicação

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8080/api
- **Swagger**: http://localhost:8080/swagger-ui.html
- **Health Check**: http://localhost:8080/actuator/health

### 4. Fazer login

**Credenciais padrão:**
- Email: `admin@agendainteligente.com`
- Senha: `admin123`

### 5. Dados já populados

O sistema já vem com:
- ✅ 1 Clínica (Clínica Saúde Total)
- ✅ 2 Unidades (Centro e Zona Norte)
- ✅ 3 Usuários (1 admin, 2 atendentes)
- ✅ 8 Serviços cadastrados
- ✅ 3 Clientes de exemplo
- ✅ Atendentes vinculados aos serviços

## 📋 Fluxo de Uso

### 1. Criar Agendamento

1. Acesse "Novo Agendamento"
2. Selecione:
   - Cliente
   - Unidade
   - Atendente (filtrado por unidade)
   - **Múltiplos Serviços** (novo!)
   - Data/Hora
3. Sistema calcula valor total automaticamente

### 2. Finalizar Agendamento

1. Na lista de agendamentos, clique no botão "Finalizar" (✓)
2. Informe o valor final
3. Sistema:
   - Marca como CONCLUIDO
   - **Emite NFS-e automaticamente** (assíncrono)
   - Inclui todos os serviços na nota

### 3. Verificar NFS-e

- A nota fiscal é processada em background
- Verifique o status na lista de agendamentos
- URL da NFS-e disponível após emissão

## 🔧 Comandos Úteis

```bash
# Parar serviços
docker-compose down

# Parar e limpar dados
docker-compose down -v

# Ver logs de um serviço específico
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f redis

# Reiniciar um serviço
docker-compose restart backend

# Ver status dos serviços
docker-compose ps
```

## 🐛 Troubleshooting

### Backend não inicia
```bash
docker-compose logs backend
# Verificar se PostgreSQL está pronto
```

### Erro de conexão com banco
```bash
docker-compose restart postgres
# Aguardar 10 segundos
docker-compose restart backend
```

### Limpar tudo e recomeçar
```bash
docker-compose down -v
docker-compose up -d
```

## 📊 Verificar Performance

```bash
# Ver métricas do Redis
docker exec -it agenda-redis redis-cli INFO stats

# Ver conexões do PostgreSQL
docker exec -it agenda-postgres psql -U postgres -d agenda_inteligente -c "SELECT count(*) FROM pg_stat_activity;"
```

## 🎯 Próximos Passos

1. ✅ Sistema está rodando
2. ✅ Fazer login
3. ✅ Criar um agendamento com múltiplos serviços
4. ✅ Finalizar e ver NFS-e sendo emitida
5. ✅ Explorar outras funcionalidades

**Pronto para usar!** 🎉

