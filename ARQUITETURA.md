# Arquitetura - Agenda Inteligente

## 📐 Modelo de Dados

### Hierarquia
```
Clínica (1)
  └── Unidades (N)
        └── Atendentes (N)
              └── Serviços (N:N) - Atendente pode prestar múltiplos serviços
```

### Relacionamentos

- **Clínica** → **Unidades** (1:N)
- **Unidade** → **Atendentes** (1:N)
- **Atendente** ↔ **Serviços** (N:N) - Tabela `atendente_servicos`
- **Agendamento** → **AgendamentoServicos** (1:N) - Um agendamento pode ter múltiplos serviços

## 🏗️ Arquitetura de Performance

### Cache (Redis)
- **Clientes**: Cache de 1 hora
- **Serviços**: Cache de 1 hora
- **Unidades**: Cache de 1 hora
- **Atendentes**: Cache de 1 hora
- **Clínicas**: Cache de 1 hora
- **Listagens**: Cache de 10 minutos

### Processamento Assíncrono

**Thread Pools:**
- `taskExecutor`: Pool geral (5-10 threads)
- `nfseExecutor`: Pool específico para NFS-e (2-5 threads)

**Fluxos Assíncronos:**
- Emissão de NFS-e (não bloqueia a resposta)
- Processamento de pagamentos
- Notificações

### Otimizações de Banco

**PostgreSQL:**
- Shared buffers: 256MB
- Effective cache: 1GB
- Batch processing habilitado
- Índices estratégicos
- Connection pooling (HikariCP)

**JPA/Hibernate:**
- Batch size: 20
- Order inserts/updates
- Lazy loading otimizado

## 🔄 Fluxo de Agendamento

1. **Criar Agendamento**
   - Seleciona Cliente
   - Seleciona Unidade
   - Seleciona Atendente
   - Seleciona Serviços (múltiplos)
   - Sistema calcula valor total

2. **Finalizar Agendamento**
   - Atendente informa valor final
   - Status muda para CONCLUIDO
   - Dispara emissão assíncrona de NFS-e

3. **Emissão NFS-e**
   - Processa em thread separada
   - Monta XML com todos os serviços
   - Inclui descrições e valores
   - Envia para API de Manaus

## 📋 Estrutura de Serviços na NFS-e

A NFS-e inclui:
- Descrição de cada serviço
- Quantidade
- Valor unitário
- Valor total por serviço
- Valor total da nota

## 🚀 Performance

### Métricas Esperadas
- Tempo de resposta API: < 200ms (com cache)
- Emissão NFS-e: Assíncrona (não bloqueia)
- Throughput: 100+ requisições/segundo
- Latência banco: < 50ms (com índices)

### Escalabilidade
- Horizontal: Múltiplas instâncias do backend
- Vertical: Ajuste de recursos no Docker
- Cache distribuído: Redis compartilhado
- Banco: Read replicas (futuro)

## 🔒 Segurança

- JWT com expiração
- Senhas criptografadas (BCrypt)
- Validação de dados
- SQL Injection protegido (JPA)
- CORS configurado

## 📊 Monitoramento

- Health checks (Actuator)
- Logs estruturados
- Métricas de cache
- Thread pool monitoring

