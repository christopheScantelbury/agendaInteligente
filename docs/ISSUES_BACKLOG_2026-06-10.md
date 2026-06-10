# Backlog de issues — 10/06/2026

> 3 issues redigidas em sessão mas não criadas no GitHub (API estava fora).
> Pra criar: `gh issue create --title "..." --body "$(cat <<'EOF' ... EOF)"`.

---

## ISSUE A — feat: reorganizar modal Editar Empresa (plano, slug público, fiscal, stats)

### Contexto

O modal **Editar Empresa** (`frontend/src/pages/Empresas.tsx` + `Configuracoes.tsx`) tem campos órfãos (`logo`, `corApp`) que não são aplicados em lugar nenhum visível, e está faltando dados importantes da PJ que estão dispersos em outras telas. Esta issue reorganiza pra centralizar.

### Decisões (sessão 10/06/2026)

- **Branding (logo/cor)**: TIRA do modal, mantém no banco. Aplicação visual fica pra Issue C (landing pública).
- **Multi-tenant**: ADMIN global edita qualquer empresa. ADMINISTRADOR só a própria. GERENTE+ não acessa.

### Backend

**1. `GET /api/empresas/{id}/estatisticas`**
```json
{ "unidades": 3, "profissionais": 12, "agendamentosMesAtual": 458,
  "nfseMesAtual": 47, "nfseLimiteMes": 100,
  "planoNome": "Pro", "planoVencimento": "2026-07-15", "clientesAtivos": 230 }
```
- Service `EmpresaEstatisticasService` consultando repositórios existentes (sem cache).
- Permissão: ADMIN ou ADMINISTRADOR da própria empresa.

**2. `POST /api/empresas/{id}/plano { planoId }`** (placeholder, sem Stripe)
- Só ADMIN global por enquanto.
- Atualiza `empresa.plano`, `planoInicio`, recalcula `planoExpiracao` (NULL pra pagos, +N dias pra Trial conforme `duracao_trial_dias` da V74).

**3. EmpresaDTO**
- Confirmar campos: `slugPublico`, `razaoSocial`, `inscricaoEstadual`, `categoria`, `dataExpiracaoAcesso`, `plano`, `planoInicio`, `planoExpiracao`.

### Frontend — modal em 5 SectionCards violet

**1. Identificação** (mantém + reorganiza): Nome, Razão Social, CNPJ, IE, Categoria, Email, Telefone.

**2. Endereço** (já tem — só agrupa visualmente em SectionCard).

**3. Link público** (nova):
- Slug editável (validação `a-z 0-9 hífen`, 3-60 chars)
- Preview clicável da URL completa `{base}/e/{slug}`
- Botão "Copiar link"
- Reutilizar lógica de `LinkPublicoConfig.tsx`

**4. Plano comercial** (nova):
- Card mostrando nome do plano + preço + status:
  - Trial: "X dias restantes" (amber)
  - Pago: "Vence em DD/MM/YYYY"
  - Vencido: vermelho
- Barra de uso NFS-e do mês: "47/100 emitidas"
- ADMIN global: select com planos ativos + botão "Aplicar plano"
- ADMINISTRADOR: botão "Solicitar upgrade" (placeholder mailto ou link futuro)

**5. Estatísticas** (nova, read-only):
- Grid `grid-cols-2 sm:grid-cols-4`: 4 KPIs (unidades, profissionais, agendamentos/mês, clientes ativos)
- Hidratada por `GET /api/empresas/{id}/estatisticas` ao abrir modal

**Remover do modal:** Logo + Cor principal. Mantém campos no DTO e no banco.

**Atualizar:** `Empresas.tsx` + `Configuracoes.tsx` simetricamente.

### Permissões UI

| Perfil | Vê | Edita |
|---|---|---|
| ADMIN global | qualquer empresa | tudo + trocar plano |
| ADMINISTRADOR | só própria | exceto plano (read-only) |
| GERENTE | ❌ | ❌ |
| PROFISSIONAL/CLIENTE | ❌ | ❌ |

### Critérios de aceite

- ✅ Modal em 5 SectionCards
- ✅ Logo/cor sumiram do modal, continuam no DTO/banco
- ✅ Estatísticas hidratam ao abrir
- ✅ Slug com preview clicável + copiar
- ✅ ADMIN pode mudar plano (sem billing real)
- ✅ ADMINISTRADOR vê plano read-only
- ✅ Mobile-first 430px

### Out of scope

- Stripe / billing real
- Aplicação visual de logo/cor (Issue C)
- Permissões granulares por papel extra
- Histórico de mudanças de plano

### Referências

- `src/main/java/br/com/agendainteligente/domain/entity/Empresa.java`
- `src/main/resources/db/migration/V74__create_planos.sql`
- `frontend/src/pages/Empresas.tsx`, `Configuracoes.tsx`, `configuracoes/LinkPublicoConfig.tsx`
- Padrão SectionCard: `Unidades.tsx` aba "Fluxo de atendimento" (issue #157)

### Esforço

M (~ 1-2 dias)

---

## ISSUE B — feat: auto-provisionamento NotaFácil por unidade (botão manual)

### Contexto

Hoje (`frontend/src/pages/Unidades.tsx:580+`) o admin precisa colar manualmente uma `sk_live_...` no form da unidade pra emissão de NFS-e funcionar. Ninguém sabe de onde vem essa key — é fricção alta + risco de segurança (key vazada por screenshot, copy/paste errado, etc).

O backend **já tem** o código pra provisionar automaticamente: `NotaFacilClient.registerMei(...)` em `src/main/java/br/com/agendainteligente/integration/notafacil/NotaFacilClient.java:107-128`. Chama o gateway parceiro com CNPJ+dados, recebe a api_key. Mas **não é invocado em lugar nenhum**.

### Decisão (sessão 10/06/2026)

- Vamos com **botão manual "Provisionar emissão de NFS-e"** na unidade (não automático no cadastro).
- Discoverable, dá controle, sem dependência de billing.
- Evolução pra automático ao pagar plano fica pra issue futura (depende de Stripe).

### Backend

**1. `NotaFacilProvisioningService` novo**
```java
public class NotaFacilProvisioningService {
    public NotaFacilProvisionResult provisionar(Long unidadeId) {
        // Valida pré-requisitos:
        // - empresa.plano != null && plano != TRIAL (cota > 0)
        // - unidade.cnpj preenchido (14 dígitos válidos)
        // - unidade.inscricaoMunicipal preenchida
        // - unidade.regimeTributario preenchido
        // - unidade.municipioIbge preenchido (7 dígitos)
        // - unidade.notafacilApiKey == null (não re-provisiona)
        // Chama notaFacilClient.registerMei(request) → recebe api_key
        // Grava unidade.notafacilApiKey + notafacilAtivo=true + data
    }
}
```

**2. Adicionar coluna `notafacil_provisionado_em TIMESTAMP` em `unidades`** (migration V79)
- Pra exibir "Ativo desde DD/MM/YYYY" no frontend.

**3. `POST /api/unidades/{id}/notafacil/provisionar`**
- Endpoint que chama o service.
- Permissão: ADMIN, ADMINISTRADOR da empresa-mãe, GERENTE da unidade.
- Retorna `{ provisionadoEm, apiKeyMascarada: "sk_live_***1234" }` (NUNCA a key completa).
- Erros estruturados: `{ error: "MISSING_CNPJ", message: "...", camposFaltando: ["cnpj","im"] }`.

**4. `DELETE /api/unidades/{id}/notafacil`** (revogar)
- Apaga api_key local + chama gateway pra revogar (se endpoint existir).
- Permissão: só ADMIN + ADMINISTRADOR.

**5. `GET /api/unidades/{id}/notafacil/status`**
- Retorna se está provisionado, quando, e api_key mascarada.

### Frontend

**1. Substituir input manual de API key**

Localização: `frontend/src/pages/Unidades.tsx` na seção NotaFácil (linhas ~570-600).

**Quando `notafacilApiKey == null`:**
- Card amarelo "Emissão de NFS-e não está ativa"
- Lista de pré-requisitos com check ✅/❌:
  - "CNPJ cadastrado: ✅ 12.345.678/0001-91"
  - "Inscrição Municipal: ❌ falta cadastrar"
  - "Regime Tributário: ✅ MEI"
  - "Código IBGE: ✅ 3550308"
  - "Plano com cota NFS-e: ✅ Pro (100/mês)"
- Botão "Provisionar emissão de NFS-e" — **disabled se algum check falhar**
- Tooltip explicando o que vai acontecer ao clicar

**Quando `notafacilApiKey != null`:**
- Card verde "✅ Emissão de NFS-e ativa"
- "Conta ativa desde DD/MM/YYYY"
- "Chave: sk_live_***1234" (mascarada)
- Toggle "Emitir NFS-e automaticamente ao concluir agendamento" (já existe — manter)
- Botão "Revogar" (destrutivo, vermelho, com confirmação)

**2. Remover input manual da api_key**
- Em produção, ninguém deveria digitar isso à mão.
- Mas... e os legados que já têm key colada? Mantém valor mas não permite editar via UI.

### Permissões

| Perfil | Provisionar | Revogar | Ver status |
|---|---|---|---|
| ADMIN global | ✅ | ✅ | ✅ |
| ADMINISTRADOR | ✅ | ✅ | ✅ |
| GERENTE da unidade | ✅ | ❌ | ✅ |
| PROFISSIONAL/CLIENTE | ❌ | ❌ | ❌ |

### Critérios de aceite

- ✅ Migration V79 adiciona `notafacil_provisionado_em`
- ✅ Service valida 5 pré-requisitos antes de chamar gateway
- ✅ Endpoint provisiona e grava api_key + data
- ✅ Frontend mostra checklist de pré-requisitos antes do botão
- ✅ Botão disabled enquanto faltam pré-requisitos
- ✅ Após provisionar, card verde com api_key mascarada
- ✅ Revogar funciona com confirmação destrutiva
- ✅ Input manual da api_key removido do form
- ✅ API key NUNCA retornada completa pelo backend pra frontend

### Out of scope

- Auto-provisionamento ao pagar plano (issue futura)
- Re-provisionamento automático após revogação
- Integração com Stripe pra cobrança de excedente NFS-e
- Webhook do gateway parceiro pra eventos (status emissão)

### Referências

- `NotaFacilClient.java:100-128` (método `registerMei` já pronto)
- `NfseNotaFacilIntegration.java:62` (consumo da api_key)
- `Unidade.java` campos `notafacilApiKey`, `notafacilAtivo`, `municipioIbge`
- Plano cota: `V74__create_planos.sql` (limite_nfse_mes por plano)
- Endpoint gateway: `https://www.emitirnotafacil.com.br/v1/auth/register` (POST, sem auth)

### Esforço

M (~ 2 dias)

---

## ISSUE C — feat: branding na landing pública `/e/{slug}` (logo + cor)

### Contexto

Os campos `empresas.logo` (TEXT base64) e `empresas.cor_app` (VARCHAR 7) já existem no banco e são gravados nos forms. Mas **nunca foram aplicados na UI** — coletam dado morto.

Decisão (sessão 10/06/2026): aplicar SÓ na landing pública `/e/{slug}` (`EmpresaPublica` component). App interno do operador continua identidade Agenda Inteligente violet — consistência > customização aqui. White-label total no app interno fica pra plano Business futuro.

### Backend

Nada novo (campos já existem). Garantir que `GET /api/publico/empresa/{slug}` ou equivalente devolve `logo` e `corApp` no payload da empresa pública.

### Frontend

**1. `EmpresaPublica.tsx` (landing pública)**
- Header da página: mostra `logo` no topo (fallback: nome em texto em fonte grande)
- Cor primária dos botões/destaques: usa `corApp` (variável CSS escopada nessa página, NÃO sobrescreve violet global)
- Footer: mantém "Powered by Agenda Inteligente" (não tira identidade do produto)

**2. Variável CSS escopada**
```tsx
<div style={{ '--cor-marca': empresa.corApp ?? '#7C3AED' } as React.CSSProperties}>
  {/* botões usam bg-[var(--cor-marca)] */}
</div>
```
- Tailwind arbitrary values: `bg-[var(--cor-marca)]`, `text-[var(--cor-marca)]`, `border-[var(--cor-marca)]`.
- Fallback violet se a empresa não definir.

**3. Modal "Editar Empresa" (revertendo a remoção da Issue A se acontecer)**
- A Issue A remove os campos do modal. Esta Issue **reintroduz** logo+cor **dentro de um SectionCard específico "Aparência da landing pública"**, com preview da landing.
- ADMIN global + ADMINISTRADOR podem editar.

**Ordem de execução:** Issue A primeiro (limpa), Issue C depois (volta com escopo claro de "landing pública").

### Validações

- Logo: aceitar PNG/JPG/SVG, max 500KB (compressão client-side antes do base64 se possível), preview ao subir.
- Cor: input hex `#RRGGBB` validado (regex `^#[0-9A-Fa-f]{6}$`), color picker visual.

### Critérios de aceite

- ✅ Landing `/e/{slug}` exibe logo no header (com fallback nome)
- ✅ Botões da landing usam a `corApp` da empresa
- ✅ Variável CSS escopada — não vaza pro resto do sistema
- ✅ Modal "Aparência" no Editar Empresa permite trocar logo+cor com preview
- ✅ Reset pra padrão funciona (cor → violet, logo → nada)
- ✅ Mobile-first: logo responsiva, cor não quebra contraste

### Out of scope

- White-label do app interno do operador (sidebar, dashboard, etc.)
- Customização de fonte
- Customização do email transacional (lembretes, recibos)
- Domínio próprio da empresa (CNAME `agenda.minhaclinica.com.br`)

### Referências

- `Empresa.java` campos `logo`, `corApp`
- `frontend/src/pages/EmpresaPublica.tsx` (componente da landing)
- `frontend/src/App.tsx:438` rota `/e/:slug`
- Padrão de aplicação de cor escopada via CSS var (sem tema global)

### Esforço

P (~ 4-6h)
