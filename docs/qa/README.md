# Prompts de QA por sprint

Cada arquivo abaixo é um prompt independente para o agente de QA. Cole em uma sessão nova do agente.

| Sprint | Arquivo | Stories |
|---|---|---|
| 1 — Cliente | [sprint-1-cliente.md](sprint-1-cliente.md) | #80, #81, #82, #83, #84 |
| 2 — Profissional / Modo Dia | [sprint-2-profissional.md](sprint-2-profissional.md) | #87, #88, #89, #90, #91 |
| 3 — Gerente / Dashboard | [sprint-3-gerente.md](sprint-3-gerente.md) | #96, #97, #98, #99, #100 |
| 4 — Admin / Plataforma | [sprint-4-admin.md](sprint-4-admin.md) | #92, #93 (parcial; #94/#95 follow-up) |

## Sprint 0 — Discovery
Não tem QA funcional. Entregáveis são documentos:
- [`docs/discovery/rotas.md`](../discovery/rotas.md) — inventário de rotas
- [`docs/discovery/matriz.md`](../discovery/matriz.md) — matriz heurística

## Sprint 5 — Polimento
Em andamento. QA será adicionado quando o sprint fechar.

## Pré-requisito comum a todos os sprints
Rodar `POST /api/admin/seed-demo` com header `X-Seed-Token` em prod uma vez antes de começar.
Token está em `ACESSOS.local.md` na máquina do Chris.

## Identidade visual de referência
- Cor primária: violet-600 (`#7C3AED`)
- Cores semânticas: emerald (sucesso), red (erro/no-show), amber (aviso), blue (em andamento)
- Fonte display: Outfit · Fonte corpo: Inter
- Min área de toque: 44×44px (WCAG)

## Doc-base do redesign
`AgendaInteligente_Redesign_UX.docx` na raiz do repo (Maio/2026, ScantelburyDevs).
