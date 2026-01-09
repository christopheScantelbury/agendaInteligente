# 🔐 Variáveis de Ambiente - EasyPanel

## 📋 Backend (agenda_backend)

### Obrigatórias
```bash
SPRING_PROFILES_ACTIVE=prod
SPRING_DATASOURCE_URL=jdbc:postgresql://agenda_postgres:5432/agenda_inteligente
SPRING_DATASOURCE_USERNAME=agenda_user
SPRING_DATASOURCE_PASSWORD=[SENHA DO POSTGRES]
SPRING_REDIS_HOST=agenda_redis
SPRING_REDIS_PORT=6379
JWT_SECRET=[GERAR COM: openssl rand -base64 64]
```

### Opcionais (NFS-e)
```bash
NFSE_MANAUS_AMBIENTE=producao
NFSE_CERTIFICADO_PATH=/app/certificados/certificado.pfx
NFSE_CERTIFICADO_SENHA=[senha do certificado]
NFSE_USAR_ASSINATURA=true
```

### Opcionais (Pagamento)
```bash
PAYMENT_PROVIDER=stripe
PAYMENT_API_KEY=[sua chave]
PAYMENT_WEBHOOK_SECRET=[webhook secret]
```

---

## 📋 Frontend (agenda_frontend)

### Obrigatórias
```bash
VITE_API_URL=https://api.seudominio.com.br/api
# OU se usar proxy no mesmo domínio:
VITE_API_URL=/api
```

### Build Arguments (mesmo valor)
```bash
VITE_API_URL=https://api.seudominio.com.br/api
```

---

## ⚠️ Importante

1. **JWT_SECRET**: Gere uma chave segura:
   ```bash
   openssl rand -base64 64
   ```

2. **Nomes dos Serviços**: Use exatamente:
   - PostgreSQL: `agenda_postgres`
   - Redis: `agenda_redis`
   - Backend: `agenda_backend`
   - Frontend: `agenda_frontend`

3. **Portas**:
   - Backend: `8080`
   - Frontend: `80`
