# Agenda Inteligente

Sistema completo de agendamento com pagamento e emissão automática de NFS-e para Manaus.

## 🐳 Executar com Docker (Recomendado)

```bash
# Subir toda a infraestrutura
docker-compose up -d

# Ver logs
docker-compose logs -f

# Acessar:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:8080
# - Swagger: http://localhost:8080/swagger-ui.html
```

**Login padrão:**
- Email: `admin@agendainteligente.com`
- Senha: `admin123`

Veja [README-DOCKER.md](README-DOCKER.md) para mais detalhes.

## 🚀 Stack Tecnológica

### Backend
- **Java 21** (LTS mais recente)
- **Spring Boot 3.2**
- **Spring Data JPA**
- **PostgreSQL**
- **Flyway** (Migrations)
- **MapStruct** (DTOs)
- **Lombok**
- **WebFlux** (Integração NFS-e)
- **OpenAPI/Swagger**

### Frontend
- **React 18** com **TypeScript**
- **Vite** (Build tool)
- **React Router** (Roteamento)
- **React Query** (Gerenciamento de estado)
- **Axios** (HTTP Client)
- **Tailwind CSS** (Estilização)
- **Lucide React** (Ícones)

## 📋 Pré-requisitos

- Java 21+
- Maven 3.8+
- PostgreSQL 14+
- Node.js 18+ (para frontend)
- npm ou yarn

## ⚡ Quick Start

Para começar rapidamente, veja [QUICKSTART.md](QUICKSTART.md)

## 🛠️ Configuração

### 1. Banco de Dados

Crie um banco de dados PostgreSQL:

```sql
CREATE DATABASE agenda_inteligente;
```

### 2. Configuração do Backend

Edite o arquivo `src/main/resources/application.yml` ou crie um arquivo `application-local.yml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/agenda_inteligente
    username: seu_usuario
    password: sua_senha
```

### 3. Executar o Backend

```bash
# Compilar o projeto
mvn clean install

# Executar a aplicação
mvn spring-boot:run
```

O backend estará disponível em: `http://localhost:8080`

### 4. Executar o Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev
```

O frontend estará disponível em: `http://localhost:5173`

## 📚 Documentação da API

Após iniciar o backend, a documentação Swagger estará disponível em:
- **Swagger UI**: `http://localhost:8080/swagger-ui.html`
- **OpenAPI JSON**: `http://localhost:8080/v3/api-docs`

## 📊 Modelo de Dados

**Hierarquia:**
```
Clínica (1)
  └── Unidades (N)
        └── Atendentes (N)
              └── Serviços (N:N)
```

**Agendamento:**
- Um agendamento pode ter múltiplos serviços
- Cada serviço tem descrição, quantidade e valor
- NFS-e inclui todos os serviços com detalhes

## 🏗️ Arquitetura

O projeto segue uma arquitetura em camadas com separação clara de responsabilidades:

```
src/main/java/br/com/agendainteligente/
├── domain/           # Entidades de domínio
│   ├── entity/      # Entidades JPA
│   └── enums/       # Enumeradores
├── repository/      # Repositórios JPA
├── service/         # Lógica de negócio
├── dto/             # Data Transfer Objects
├── mapper/          # MapStruct mappers
├── controller/      # REST Controllers
├── config/          # Configurações
├── integration/     # Integrações externas (NFS-e, Pagamento)
└── exception/       # Tratamento de exceções
```

## 🔄 Fluxo Principal

1. **Agendamento**: Cliente agenda um serviço
2. **Pagamento**: Processamento do pagamento via gateway
3. **Confirmação**: Após pagamento aprovado, agendamento é confirmado
4. **NFS-e**: Emissão automática da nota fiscal de Manaus

## ⚡ Performance e Otimizações

### Cache (Redis)
- Cache de 1 hora para entidades principais
- Cache de 10 minutos para listagens
- Invalidação automática em updates

### Processamento Assíncrono
- Emissão de NFS-e em thread separada
- Thread pools configurados
- Não bloqueia resposta da API

### Banco de Dados
- PostgreSQL 16 otimizado
- Índices estratégicos
- Batch processing
- Connection pooling

Veja [ARQUITETURA.md](ARQUITETURA.md) para detalhes completos.

## 🔌 Integrações

### NFS-e Manaus
- Integração com a API oficial de NFS-e de Manaus
- Documentação: https://nfse-prd.manaus.am.gov.br/nfse/temp/DOC_102.%20DO
- Emissão assíncrona após confirmação de pagamento

### Gateway de Pagamento
- Estrutura preparada para integração com múltiplos gateways
- Suporte para: Stripe, PagSeguro, Mercado Pago, etc.
- Configurável via `application.yml`

## 📝 Migrations

As migrations do Flyway estão em `src/main/resources/db/migration/`:
- `V1__create_initial_schema.sql`: Criação das tabelas
- `V2__insert_initial_data.sql`: Dados iniciais

## 🧪 Testes

```bash
# Executar testes
mvn test
```

## 📦 Build

```bash
# Backend
mvn clean package

# Frontend
cd frontend
npm run build
```

## 🔒 Segurança

- Spring Security configurado (pode ser customizado)
- Validação de dados com Bean Validation
- Tratamento centralizado de exceções

## 🚧 Próximos Passos

- [ ] Implementar autenticação e autorização
- [ ] Adicionar testes unitários e de integração
- [ ] Implementar integração real com gateway de pagamento
- [ ] Finalizar integração com NFS-e de Manaus (baseado na documentação oficial)
- [ ] Adicionar notificações por email/SMS
- [ ] Dashboard com relatórios
- [ ] Exportação de relatórios

## 📄 Licença

Este projeto é privado e de uso interno.

## 👥 Contribuidores

Desenvolvido seguindo as melhores práticas de desenvolvimento Java.
