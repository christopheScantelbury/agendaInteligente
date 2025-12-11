# Docker - Agenda Inteligente

## 🐳 Executar com Docker

### Pré-requisitos
- Docker 20.10+
- Docker Compose 2.0+

### Executar toda a infraestrutura

```bash
# Subir todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar serviços
docker-compose down

# Parar e remover volumes (limpar dados)
docker-compose down -v
```

### Serviços disponíveis

- **Backend**: http://localhost:8080
- **Frontend**: http://localhost:5173
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### Credenciais padrão

**Banco de Dados:**
- Host: localhost:5432
- Database: agenda_inteligente
- User: postgres
- Password: postgres

**Login:**
- Email: admin@agendainteligente.com
- Senha: admin123

### Dados iniciais

O sistema já vem com dados populados:
- 1 Clínica (Clínica Saúde Total)
- 2 Unidades (Centro e Zona Norte)
- 3 Usuários (admin, 2 atendentes)
- 8 Serviços cadastrados
- 3 Clientes de exemplo

### Otimizações implementadas

**PostgreSQL:**
- Shared buffers: 256MB
- Effective cache: 1GB
- Work mem: 4MB
- WAL otimizado

**Redis:**
- Cache de 10 minutos para listagens
- Cache de 1 hora para entidades principais
- Política LRU para gerenciamento de memória

**Backend:**
- Thread pools configurados
- Processamento assíncrono para NFS-e
- Batch processing habilitado

### Monitoramento

Health checks configurados para todos os serviços. Verificar status:

```bash
docker-compose ps
```

### Troubleshooting

**Backend não inicia:**
```bash
docker-compose logs backend
```

**Banco não conecta:**
```bash
docker-compose restart postgres
```

**Limpar tudo e recomeçar:**
```bash
docker-compose down -v
docker-compose up -d
```

