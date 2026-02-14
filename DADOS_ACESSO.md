# Dados de Acesso - Sistema Agenda Inteligente

**Senha padrão para todos os usuários: `123456`**

---

## 👤 ADMINISTRADOR

### Acesso Total ao Sistema

| Email | Senha | Nome | Acesso |
|-------|------|------|--------|
| `admin@agendainteligente.com` | `123456` | Administrador Sistema | Todas as empresas e unidades |

---

## 🏢 EMPRESA: ForFit

### 📋 Gerente

| Email | Senha | Nome | Acesso |
|-------|------|------|--------|
| `charles@forfit.com` | `123456` | Charles | Apenas ForFit (Unidade Principal) |

**Permissões:**

- ✅ Visualizar e editar agendamentos da ForFit
- ✅ Visualizar e editar serviços da ForFit
- ✅ Visualizar unidades da ForFit
Vizualizar perfil
- ❌ **NÃO** pode ver dados do Salão Alef

---

### 👩‍💼 Atendente/Profissional

| Email | Senha | Nome | Acesso |
|-------|------|------|--------|
| `maria@forfit.com` | `123456` | Maria - ForFit | Apenas Unidade ForFit |

**Permissões:**
- ✅ Visualizar e editar agendamentos da ForFit
- ✅ Visualizar Usuario da ForFit
- ✅ Visualizar serviços da ForFit
- ❌ **NÃO** pode ver dados do Salão Alef
- ❌ **NÃO** pode ver dados de outras unidades

**Isolamento:** Maria da ForFit **NÃO** consegue ver nenhum dado do Salão Alef ou de outras empresas.

---

### 👥 Clientes

| Email | Senha | Nome | CPF | Acesso |
|-------|------|------|-----|--------|
| `cliente1@forfit.com` | `123456` | João Silva | 555.555.555-55 | Unidade ForFit |
| `cliente2@forfit.com` | `123456` | Ana Costa | 666.666.666-66 | Unidade ForFit |

**Permissões:**
- ✅ Visualizar seus próprios agendamentos
- ✅ Criar novos agendamentos na ForFit
- ❌ **NÃO** pode ver dados de outros clientes
- ❌ **NÃO** pode ver dados do Salão Alef

---

### 🏋️ Serviços Disponíveis (ForFit)

| Serviço | Descrição | Valor | Duração |
|---------|-----------|-------|---------|
| Avaliação Física | Avaliação completa de condicionamento físico | R$ 150,00 | 60 min |
| Personal Trainer | Aula individual com personal trainer | R$ 100,00 | 60 min |
| Massagem Relaxante | Massagem para relaxamento muscular | R$ 120,00 | 50 min |

---

## 💇 EMPRESA: Salão Alef

### 📋 Gerente

| Email | Senha | Nome | Acesso |
|-------|------|------|--------|
| `alef@salaoalef.com` | `123456` | Alef | Apenas Salão Alef (Unidade Principal) |

**Permissões:**
- ✅ Visualizar e editar usuários do Salão Alef
- ✅ Visualizar e editar agendamentos do Salão Alef
- ✅ Visualizar e editar serviços do Salão Alef
Vizualizar peril
- ✅ Visualizar unidades do Salão Alef
- ❌ **NÃO** pode ver dados da ForFit

---

### 👩‍💼 Atendente/Profissional

| Email | Senha | Nome | Acesso |
|-------|------|------|--------|
| `maria@salaoalef.com` | `123456` | Maria - Salão Alef | Apenas Unidade Salão Alef |

**Permissões:**
- ✅ Visualizar e editar agendamentos do Salão Alef
- ✅ Visualizar usuarios do Salão Alef
- ✅ Visualizar serviços do Salão Alef
- ❌ **NÃO** pode ver dados da ForFit
- ❌ **NÃO** pode ver dados de outras unidades

**Isolamento:** Maria do Salão Alef **NÃO** consegue ver nenhum dado da ForFit ou de outras empresas.

---

### 👥 Clientes

| Email | Senha | Nome | CPF | Acesso |
|-------|------|------|-----|--------|
| `cliente1@salaoalef.com` | `123456` | Pedro Alves | 777.777.777-77 | Unidade Salão Alef |
| `cliente2@salaoalef.com` | `123456` | Julia Ferreira | 888.888.888-88 | Unidade Salão Alef |

**Permissões:**
- ✅ Visualizar seus próprios agendamentos
- ✅ Criar novos agendamentos no Salão Alef
- ❌ **NÃO** pode ver dados de outros clientes
- ❌ **NÃO** pode ver dados da ForFit

---

### 💅 Serviços Disponíveis (Salão Alef)

| Serviço | Descrição | Valor | Duração |
|---------|-----------|-------|---------|
| Corte de Cabelo | Corte de cabelo feminino/masculino | R$ 80,00 | 45 min |
| Coloração | Coloração completa de cabelo | R$ 200,00 | 120 min |
| Manicure e Pedicure | Manicure e pedicure completo | R$ 60,00 | 60 min |

---

## 🔒 Garantias de Isolamento

### ✅ Isolamento por Empresa

- **Charles (Gerente ForFit):** Só vê dados da ForFit
- **Alef (Gerente Salão Alef):** Só vê dados do Salão Alef
- **Maria ForFit:** Só vê dados da ForFit
- **Maria Salão Alef:** Só vê dados do Salão Alef

### ✅ Isolamento por Unidade

- Cada atendente só vê dados de sua unidade específica
- Cada cliente só vê seus próprios agendamentos
- Serviços são isolados por unidade

### ✅ Isolamento de Dados

- Agendamentos isolados por unidade
- Clientes isolados por unidade
- Serviços isolados por unidade
- Usuários isolados por empresa/unidade

---

## 📊 Resumo de Usuários

| Perfil | Quantidade | Empresas |
|--------|------------|----------|
| ADMIN | 1 | Todas |
| GERENTE | 2 | 1 por empresa |
| PROFISSIONAL | 2 | 1 por empresa (Maria) |
| CLIENTE | 4 | 2 por empresa |
| **TOTAL** | **9** | **2 empresas** |

---

## 🎯 Testes de Isolamento

Para testar o isolamento:

1. **Login como Maria ForFit:**
   - ✅ Deve ver apenas serviços da ForFit
   - ✅ Deve ver apenas agendamentos da ForFit
   - ❌ **NÃO** deve ver serviços do Salão Alef
   - ❌ **NÃO** deve ver agendamentos do Salão Alef

2. **Login como Maria Salão Alef:**
   - ✅ Deve ver apenas serviços do Salão Alef
   - ✅ Deve ver apenas agendamentos do Salão Alef
   - ❌ **NÃO** deve ver serviços da ForFit
   - ❌ **NÃO** deve ver agendamentos da ForFit

3. **Login como Charles:**
   - ✅ Deve ver apenas dados da ForFit
   - ❌ **NÃO** deve ver dados do Salão Alef

4. **Login como Alef:**
   - ✅ Deve ver apenas dados do Salão Alef
   - ❌ **NÃO** deve ver dados da ForFit

---

## 📝 Notas Importantes

- Todos os usuários usam a mesma senha: `123456`
- O isolamento é garantido pelo sistema de permissões e filtros por unidade
- Cada empresa opera de forma completamente independente
- Os dados são isolados tanto no backend quanto no frontend

---

**Última atualização:** Migration V27
