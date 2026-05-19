---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete-with-stack-migration'
completedAt: '2026-05-13'
stackMigration:
  date: '2026-05-14'
  from: 'Next.js 16 App Router + Vercel'
  to: 'Vite 5 SPA + React 18 + Supabase Edge Functions'
  reason: 'App interno sem SEO; founder já domina stack Vite (Holanda Chat); reduz fricção do Next 16 (Cache Components, RSC mental model)'
  authoritativeSection: 'ADENDO DE MIGRAÇÃO (após "Sobre a ausência de PRD formal")'
inputDocuments:
  - "_bmad-output/planning-artifacts/product-brief-msc-catalogo.md"
  - "_bmad-output/planning-artifacts/product-brief-msc-catalogo-distillate.md"
  - "_bmad-output/planning-artifacts/ux-design-specification.md"
  - "_bmad-output/planning-artifacts/sprint-0-checklist.md"
  - "_bmad-output/planning-artifacts/visual-spike/v2/*.jpg (3 validações gpt-image-2)"
  - "_bmad-output/planning-artifacts/ux-design-directions.html (7-screen mockup)"
workflowType: architecture
project_name: MSC-Catalogo
user_name: David
date: 2026-05-12
architect: Winston
prdSubstitute: "UX Design Specification (Sally, 14 steps, ~1.300 linhas) atua como PRD-equivalente por decisão consciente — features, fluxos, critérios de aceitação e métricas já cravados ali"
---

# Architecture Decision Document — MSC-Catalogo

_Este documento é construído colaborativamente, decisão por decisão. Seções são apendadas conforme avançamos._

## Sobre a ausência de PRD formal

O protocolo BMAD canônico assume PRD (John, PM) entre UX (Sally) e Arquitetura (Winston). **Neste projeto, pulamos o passo do PM** por decisão consciente do founder:

- A **UX Design Specification** (Sally, 14 steps) cobre features, fluxos, critérios de aceitação implícitos, edge cases, priorização (MVP-1 vs MVP-2)
- O **Product Brief** (Mary) cobre visão, métricas, personas, riscos
- O **Sprint 0 Checklist** captura validações pendentes
- O **Visual Spike** (Amelia, 12/05) cravou tecnicamente a stack de IA generativa

**Decisão**: tratar **UX spec + brief + spike findings como PRD-equivalente** pra essa rodada. Se algum gap aparecer durante arquitetura, pausamos e John é chamado nas perguntas específicas — não numa rodada plena de PRD.

---

## ⚠️ ADENDO DE MIGRAÇÃO — Next.js → Vite SPA + Supabase Edge Functions (2026-05-14)

**Status do documento:** as seções abaixo (Project Context Analysis em diante) foram escritas assumindo Next.js 16 App Router + Vercel. Esse adendo é o **override autoritativo** — onde houver conflito entre uma seção abaixo e este adendo, **este adendo vence**.

### Motivação da mudança

- O MSC-Catalogo é ferramenta interna (1 usuária, atrás de login, sem SEO). RSC/SSR/App Router do Next 16 = complexidade que não traz benefício e custa fricção (Cache Components, Suspense obrigatório, "isso é server ou client component?").
- O founder já domina o stack de outro projeto produtivo (Holanda Chat). Reusar stack conhecido = menos risco, mais velocidade.
- Stories 1-6a no Next.js validaram banco + integrações; o frontend Next.js é descartado, a lógica de negócio é portada.

### Stack alvo (substitui o Step 3 Starter Template)

- **Build**: Vite 5 (`^5.4.8`)
- **Linguagem**: React 18 (`^18.3.1`) + TypeScript 5.6 (strict)
- **Gerenciador**: pnpm
- **UI**: Tailwind 3.4 + tailwindcss-animate + shadcn/ui sobre Radix + lucide-react + class-variance-authority + clsx + tailwind-merge
- **Server state**: TanStack Query v5 (`@tanstack/react-query`)
- **UI/client state**: Zustand 4
- **Roteamento**: React Router v6 (`react-router-dom`)
- **Forms**: react-hook-form + zod
- **Datas**: date-fns
- **Backend**: Supabase (Postgres 17 + RLS + Edge Functions Deno + Storage + Realtime + pg_cron)
- **PWA**: vite-plugin-pwa + workbox-window
- **Node**: ≥ 18.18

### Tabela de overrides (cada linha substitui o que está na seção/linha citada)

| Decisão original | Seção/linha original | Override (autoritativo) |
|---|---|---|
| **Step 3 — Starter:** `create-next-app --example with-supabase`, Next 16, Turbopack, App Router | linhas 277, 285-345 | Scaffold Vite 5 + React 18 + TS manual (Tailwind, shadcn, supabase-js, React Router, TanStack Query, Zustand). Pasta nova `msc-app/`; aposenta-se `msc-catalogo/`. |
| **Decisão 3a — Async pipeline:** Vercel Pro Functions 300s + Realtime | linhas 219, 353, 368-385, 618-620, 1144, 1162 | **Supabase Edge Function (Deno) no plano Supabase Pro — timeout 400s** + Realtime. gpt-image-2 (mediana 170s, pico 218s) cabe com folga maior que no Vercel 300s. Mesma lógica YAGNI: se degradar, migra pra Queues (pgmq) ou Trigger.dev. |
| **Decisão 3f — API style:** Next.js Server Actions default + route handlers pra externals | linhas 499, 556-561, 1087, 1141, 705-709, 831-832, 853, 881 | **CRUD = chamada client direta ao Supabase** (RLS protege) via TanStack Query mutations. **Operações com secret (Claude, OpenAI, Terasoft) = Supabase Edge Functions** (Deno). Server Actions deixam de existir. |
| **Decisão 4a/4b — Server vs Client Components / State:** Server Components default, server state via SC + revalidatePath | linhas 585-594, 805-808, 1094-1095 | Tudo é client (SPA). **Server state = TanStack Query v5** (cache, refetch, mutations, optimistic updates, `staleTime`). **UI state = Zustand 4** (auth, sidebar, editor Konva). |
| **Decisão 2b/2c — Auth/Secrets:** cookie auth `@supabase/ssr` + middleware + secrets em Vercel env | linhas 507, 529-530, 536-537, 1132 | **Auth client-side** via `@supabase/supabase-js` (session em `localStorage`) + Zustand store de auth. **Secrets** ficam nas Edge Functions (`Deno.env.get`) — `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `TERASOFT_USER`/`PASS`. **Chaves públicas** no client usam prefixo `VITE_` (ex.: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). `SUPABASE_SERVICE_ROLE_KEY` só em Edge Functions, nunca no bundle. |
| **Decisão 1d — Cache:** `unstable_cache` do Next.js (Terasoft TTL 10min) | linha 505 | **TanStack Query `staleTime: 10 * 60 * 1000`** pra queries de produtos. Edge Function `sync-terasoft` pode adicionar cache server-side em camada futura se necessário. |
| **Decisão 5a/5d — Hosting + CI/CD:** Vercel Pro hosting + `next build` + Vercel auto-deploy | linhas 618-620, 646-652, 1201-1208 | **Hosting SPA estático** (Vercel/Netlify/Cloudflare Pages — qualquer um serve no plano free; SPA é só HTML+JS+CSS estáticos). **Build:** `vite build`. **Edge Functions** deployadas via Supabase CLI (`supabase functions deploy`). **CI:** GitHub Actions roda `tsc --noEmit` + `vite build` + `supabase db push` + `supabase functions deploy`. |
| **Estrutura de projeto:** `app/` (App Router), `middleware.ts`, `lib/supabase/{server,middleware}` | linhas 733-745, 920, 992-993, 1185 | Estrutura Vite: `src/main.tsx`, `src/App.tsx`, `src/routes/` (componentes de rota React Router), `src/lib/supabase.ts` (cliente único), `src/lib/queries/` (TanStack hooks), `src/stores/` (Zustand), `src/components/`, `src/components/ui/` (shadcn). **Sem middleware** (route guards = componente wrapper que checa Zustand auth). Edge Functions em `supabase/functions/<nome>/index.ts`. |
| **Decisão 5c — Observability:** "Vercel Analytics" + Sentry + custom dashboard | linhas 234, 631-637, 1351 | **Sentry** (mantido, suporta Vite) + **dashboard custom** (mantido, é página do app) + **Supabase Studio** logs (substitui Vercel Analytics — Supabase já tem painel de Edge Functions com logs/latência/error rate). |

### Ponto aberto que NÃO finjo ter resposta agora

**Mini-site público de campanha (FR-9, linha 1313 menciona ISR):** numa SPA pura não tem SSR/ISR. As opções, a decidir quando chegarmos lá:

1. **Rota pública do SPA** — client-rendered, simples, mas sem SEO (suficiente se o link só circula em WhatsApp/Instagram).
2. **Página estática gerada no build** (Astro/script de export) — tem SEO, mas precisa rebuild a cada novo catálogo publicado.
3. **Edge Function que renderiza HTML** — SSR sob demanda, sem rebuild.

Decidir quando chegar na Fase 5 (Story 6c+). Por enquanto, marcado como ponto aberto.

### O que **continua valendo intacto** do documento abaixo

- **3-layer data model** (house_config + term_templates + CampaignSpec.creative) — sem mudança
- **Schema SQL** (migrations 0001/0002/0003 já aplicadas) — sem mudança
- **RLS multi-tenant-ready** — sem mudança
- **Defesa CDC em 4 camadas** (pré-LLM + Zod + OCR + gate humano) — sem mudança
- **Hard cap OpenAI $50/mês + rate limit 20/h + circuit breaker** — sem mudança
- **Tesseract.js puro como OCR** (Decisão 3b reformulada) — sem mudança
- **Patterns de naming/Result/Zod/audit_log** — sem mudança
- **Toda lógica de negócio** (schemas/campaign-spec.ts, claude-briefer.ts, terasoft/client.ts, helpers) — portada para Edge Functions/client

### Migration de banco 0004 (planejada — independente do pivot de stack)

Pra Tela 3 (Selecionar produtos) bater com o mockup aprovado pela Amanda:

```
products:  + grupo (text)         + subgrupo (text)
pieces:    + desconto_percent (numeric)
           + parcelas (int)
           + is_destaque (boolean)
```

+ re-sync Terasoft trazendo `GRUPO` e `SUBGRUPO` separados (hoje só `category`).

### Error handling / graceful degradation

Cada modo de falha tem um tratamento explícito — UI nunca trava, dados nunca corrompem, audit sempre captura.

**1. Edge Function `render-piece` timeout (gpt-image-2 > 400s) ou erro IA**

- `AbortController` cancela a chamada antes do limite Supabase. No `catch`/timeout: `pieces.status = 'failed'` + `pieces.audit_result.error = { code: 'AI_TIMEOUT' | 'AI_ERROR', message, retryable: true }`
- Notifica via **Supabase Realtime** no channel `tenant:<id>:catalog:<id>` → frontend atualiza o card pra estado de falha
- UI: card mostra ícone de erro + botão **"Tentar de novo"** (re-dispara a Edge Function com novo `idempotency_key`)
- Audit_log captura com `actor: 'worker:render-piece'`

**2. Edge Function `sync-terasoft` — API Terasoft down ou lenta**

- `withRetry` (3 tentativas, backoff exponencial 1s/2s/4s) já porta da implementação atual
- Se as 3 falharem: retorna `Result.err({ code: 'TERASOFT_UNAVAILABLE' })`
- Frontend (TanStack Query): mostra mensagem amigável **"Terasoft indisponível agora — exibindo produtos da última sincronização"**; os produtos no banco (último sync) continuam servíveis
- Job opcional via `pg_cron` (a cada 30min) tenta sync em background — usuário não precisa re-clicar

**3. OCR (Tesseract) ou Visual Auditor (CLIP) falha na peça**

- Não bloqueia visualização da peça (alinhado com adendo Sally na Decisão 3b: badge amarelo, gate só no publish)
- `ocr_runs` / `visual_audit_runs` registra com `passed: false` + `error` no JSONB
- Peça vai pra `status: 'ready'` mas com `audit_result.warnings: [...]` — UI mostra badge amarelo **"Texto suspeito — revisar antes de publicar"**
- Bloqueio acontece no fluxo `approveCatalog` (agora client mutation): se alguma peça tem warnings, exige confirmação explícita

**4. Hard cap OpenAI ($50/mês) atingido**

- Edge Function lê `metrics_daily.ai_cost_usd` (mês corrente) **antes** de chamar a OpenAI
- Se ≥ $50: retorna `Result.err({ code: 'COST_CAP_REACHED' })` sem chamar a API
- UI: mensagem amigável **"Limite mensal de IA atingido — contate David"**
- Audit_log com `actor: 'system'` registra a tentativa bloqueada

**5. Circuit breaker (3 falhas em 5min)**

- `circuit-breaker.ts` (helper portado) mantém estado em memória da Edge Function
- Estado `open` → falha rápida sem chamar provider por 10min; estado `half-open` → testa 1 chamada; sucesso → `closed`
- UI: mensagem **"Serviço de IA instável agora — tente em alguns minutos"**

### Como ler este documento daqui em diante

1. Este adendo é a **fonte autoritativa** pra qualquer conflito de stack/infra.
2. As decisões de **modelo de dados, regras de negócio, patterns de código, observabilidade conceitual, defesa CDC, hard caps** seguem válidas como escritas.
3. Stories de implementação **devem citar este adendo** quando tocarem em camada de backend, auth, hosting, ou async — não as seções pré-migração.

---

## Project Context Analysis (v3 — pós contribuição de campo do David, 2026-05-13)

### Princípio fundador (expandido)

🔒 **A IA generativa de imagem (gpt-image-2) NÃO escreve, NÃO inventa, NÃO altera texto.**
🔒 **A IA briefer (Claude Sonnet 4.5) também NÃO inventa marca, texto legal, condições comerciais.** Ela escolhe entre templates curados + preenche params + decide variáveis criativas dentro de enums fechados.

**Toda string que aparece na peça final tem 4 fontes possíveis:**

1. **`house_config`** (constantes versionadas — brand, lojas, legal, redes sociais)
2. **`term_templates` renderizados server-side** (curado pela MSC, IA escolhe `template_id` + passa params validados por JSONSchema)
3. **`CampaignSpec.creative`** (criativo puro — headline, slogan, paleta, decoração, mood)
4. **Product data** (Terasoft + edição manual de Amanda quando produto sem foto)

**Defesa em profundidade contra CDC art. 30:**
- **Pré-LLM**: IA briefer não conhece patterns de texto legal — só escolhe `template_id`
- **Pós-renderização**: server-side interpola com params validados (JSONSchema bloqueia inválidos)
- **Pós-IA imagem**: OCR auditor confirma string idêntica à esperada

### Evidência empírica que motivou a v3

Análise lado-a-lado de 2 PDFs oficiais MSC (Mês das Mães 2026 + Abril do Descontão 2026), comparando elemento por elemento. Encontrei 3 categorias bem distintas:

**🟢 Idêntico palavra-por-palavra entre campanhas** (=> `house_config`):
- Mascote MSC; Strip "LOJAS msc" ×6 (header+footer); Selos circulares 10X SEM JUROS; Tag 1+9X SEM JUROS por preço; Bloco "PARA MAIS OFERTAS / siga as nossas redes sociais"; Ícones Facebook+Instagram; @msaocarlos; www.lojasmsc.com.br; 9 endereços de loja com telefone DDD (44); "VENDA SUJEITA A APROVAÇÃO DE CRÉDITO."; "CONDIÇÕES DE PAGAMENTOS PARA MÓVEIS, ELETROS E CELULARES À PRAZO 10X (1+9) SEM JUROS NOS CARTÕES."; "Imagens ilustrativas. Salvo erros de impressão."

**🟡 Template parametrizado** (=> `term_templates`):
- `legal_validity` (params: start_date, end_date)
- `carne_msc` (params: parcelas)
- `cartao_sem_juros` (params: entrada, parcelas)
- `entrega_montagem_gratis`
- `parc_facilitado`
- `tv_polegadas` (params: polegadas)
- `selo_mdf` (params: subtitle?)
- `peso_colchao` (params: kg, altura)

**🔴 Realmente varia** (=> `CampaignSpec.creative`, ~12 campos): headline (top/main/sub/ornament/style), palette, decoration, slogan, cta_blocks[], terms_on_cover.render_mode, period.display_on_cover.

### Modelo de dados em 3 camadas

```typescript
// CAMADA 1 — CONSTANTES VERSIONADAS (house_config)
// Read-only no fluxo de geração; editável só por admin com audit log
// Versionada com snapshot por peça gerada (reprodução determinística)
HouseConfig {
  brand: { name, logo_url, mascot_url, tagline }
  social: { instagram_handle, facebook_handle, website }
  stores: [{ name, address, phone }]    // 9 lojas — 8 confirmadas, 9ª a validar com Amanda
  legal_strings: {
    credit_disclaimer,
    payment_terms,
    image_disclaimer,
    cta_more_offers
  }
  brand_strip: { text, repetitions, positions: ["header_each_page", "footer_each_page"] }
  version: string                       // bumped quando MSC mudar algo
}

// CAMADA 2 — TEMPLATES CURADOS (term_templates)
// Curado manualmente pela MSC; renderização determinística server-side
TermTemplate {
  template_id: string                   // "carne_msc"
  pattern: string                       // "Em {parcelas}X no carnê da loja"
  params_schema: JSONSchema             // valida tipos/ranges
  category: "parcelamento" | "entrega" | "promo" | "selo_produto" | "legal"
  scope: "cover_terms" | "footer_legal" | "product_seal"  // onde pode aparecer
  active: boolean
  version: number
}

// CAMADA 3 — CRIATIVO PURO (CampaignSpec)
// Único campo que a IA briefer preenche; ~12 chaves com enums fechados
CampaignSpec {
  campaign: { name, slug, theme_key }   // theme_key: "maes" | "abril" | "natal" | "black-friday" | custom

  creative: {
    headline: {
      top: string | null,               // "MÊS DAS" | null
      main: string,                     // "mães" | "ABRIL"
      sub: string | null,               // null | "do Descontão"
      ornament: "heart-in-tilde" | "balloon" | "flag-bunting" | "money-rain" | "none"
      lettering_style: "3d-bubble-glossy" | "3d-extrusion" | "neon" | "flat-bold"
    }
    palette: {
      mode: "light-warm" | "dark-cool" | "light-vibrant" | "dark-vibrant"
      primary, secondary, accent_seal   // hex
      bg_style: string                  // max 8 palavras livre: "rosa pop com bokeh de corações"
    }
    decoration: {
      elements: string[]                // 3-6 items, vocabulário livre limitado
      density: "baixa" | "média" | "alta"
      mood: string[]                    // 2-4 items: ["afetivo", "materno"]
    }
    slogan_on_cover: string | null      // "PREÇO NO CHÃO DINHEIRO NA MÃO" | null
  }

  cta_blocks: [                         // array 1-2
    {
      topline: string | null,
      value: string,
      label: string,
      shape: "stacked" | "square" | "torn-calendar" | "circle",
      color_scheme: "primary" | "secondary" | "white-on-transparent"
    }
  ]

  terms_on_cover: {
    render_mode: "text_list" | "side_seal" | "absorbed_in_cta" | "none"
    items: [{ template_id, params }]    // refs a term_templates
  }

  period: {
    start_date, end_date                // ISO date — alimenta template legal_validity
    display_on_cover: {
      enabled: boolean,
      lines: string[] | null            // ["Sorteio para...", "do dia..."] | null
    }
  }

  // Audit config derivado pra OCR auditor
  audit_config: {
    forbidden_strings: string[]         // gerado dinamicamente a partir de creative+cta
                                         // ex.: se cta.value="10X" → forbidden inclui "0%"
  }
}
```

### Functional Requirements (revisado)

**FR-1**: IA briefer (Claude Sonnet 4.5) preenche `CampaignSpec.creative` (~12 campos com enums fechados) + escolhe `term_templates` da biblioteca + passa params. **Nunca toca em** `house_config` ou produtos.

**FR-1b** (novo): Admin > House Config — CRUD com versioning + audit log; cada save bump `version` + snapshot.

**FR-1c** (novo): Admin > Term Templates — CRUD com versioning + JSONSchema validation; popular manualmente pela MSC no MVP-1, UI dedicada no MVP-2.

**FR-2 a FR-10**: preservados de v2 (seleção produtos, sketch generator, geração IA imagem, editor inline, auditoria, geração lazy, modo apresentação, mini-site, exportar).

### Editor inline com 3 zonas visualmente distintas (cravado pelo princípio de menor privilégio)

| Zona | Cor / chrome | O que Amanda pode fazer |
|---|---|---|
| 🟢 **Constantes** (house_config) | Cinza + lock icon | Read-only. Hover: "Editável só em Admin > House Config" |
| 🟡 **Templates** (terms, legal) | Amarelo claro | Add/remove/reorder templates + edita params (parcelas, datas). Texto final é preview, não editável diretamente |
| 🔴 **Criativo** (CampaignSpec.creative) | Branco | CRUD total. Headline, paleta (color picker), decoração (chip-toggle), mood, CTA blocks (drag-resize), slogan |

### OCR Auditor com 4 categorias

```typescript
interface AuditResult {
  required_strings_check: {             // house_config + term_templates renderizados (~30 strings)
    expected: string[]
    found: string[]
    missing: string[]                   // ⛔ qualquer ausência = BLOQUEANTE
  }

  forbidden_strings_check: {            // lista negra DINÂMICA por campanha (CampaignSpec.audit_config)
    forbidden: string[]                 // ex.: ["0%", "12x sem juros", "70% OFF"]
    found: string[]                     // ⛔ qualquer presença = BLOQUEANTE
  }

  prices_check: {                       // por produto (Terasoft)
    products: [{ code, expected_price, found_price, match: boolean }]
                                         // ⛔ match: false = BLOQUEANTE
  }

  campaign_creative_check: {            // headline, slogan, CTA — soft check
    expected_headline: string
    found_headline: string
    similarity: number                  // ⚠️ < 0.95 = WARNING (não bloqueante; Amanda decide)
  }
}
```

**Engine**: Tesseract local (~3-5s por peça 1080×1280; 16 peças paralelas ~1min). Decisão final do engine fica no Step 4 (decisões), mas Tesseract é forte candidato boring tech.

### Constraints técnicos (revisado)

| Constraint | Implicação |
|---|---|
| gpt-image-2 não escreve | Sketch + house_config + term_templates renderizados têm TODO texto; OCR valida preservação |
| gpt-image-2 ocasionalmente "moderniza" semântica | Política: subtração no sketch, não no output. Adicional: `forbidden_strings` dinâmico captura quebras |
| Vercel maxDuration 60s | Fila externa obrigatória (170s/peça IA) |
| API Terasoft self-signed | Server-only fetch + TLS bypass controlado |
| 3 provedores externos USD | Abstração de provedor |
| Supabase free 500MB | OK MVP; Pro $25 recomendado pra PITR |
| OpenAI Tier 1 rate limits | Tier 2+ pra produção |

### Cross-cutting concerns (revisado, 13 itens)

1. **Async job orchestration** — gpt-image-2 170s/peça (decisão Step 4)
2. **Auth + RLS multi-tenant-ready**
3. **Audit log expandido** — preço, qualquer campo CampaignSpec, IA, OCR, export, house_config edit, term_template edit
4. **OCR auditor obrigatório** com 4 categorias
5. **Rate limiting + cost tracking** IA
6. **Cache** — Terasoft (TTL 5-15min), ISR mini-site, session
7. **Error handling cross-provider** — circuit breaker + retry
8. **Observability** — Sentry + Vercel Analytics + custom IA metrics + custom OCR-divergence metrics
9. **Secrets management** — env vars, hard caps, rotação documentada
10. **CampaignSpec versioning** — schema migrations
11. **🆕 house_config versioning + snapshot** — peça armazena `house_config_version` usada
12. **🆕 term_templates registry** + JSONSchema params validation + scope enforcement
13. **🆕 forbidden_strings derivação dinâmica** — função pura de CampaignSpec → string[] na ativação do audit

### Scale & Complexity (revisado)

| Dimensão | Avaliação |
|---|---|
| Volume usuário | Baixíssimo (1 × 64/mês) |
| Multi-tenant | Single MVP, schema-ready |
| Compliance | **Alta** (CDC + fidelidade textual completa) |
| Integration | Média-alta (3 provedores) |
| Async jobs | Alta (170s/peça) |
| Data model | **Alta** (3 camadas: house_config + term_templates + CampaignSpec, todas versionadas, snapshot por peça) |
| Editor complexity | Alta (CRUD em 3 zonas com affordances distintas) |
| Admin complexity | **Nova categoria** (CRUD de house_config e term_templates) |

- **Primary domain**: Full-stack web data-intensive com governance de conteúdo
- **Complexity level**: Medium-high (sobe v2 por causa de 3 camadas versionadas + admin UI)
- **Architectural components**: ~14 (frontend editor + frontend admin + 6 routes + 2 workers + 4 integrações + storage + OCR + observability)

### Constraints contextuais sobre escolha de templates (validação adicional do briefer)

Quando IA briefer escolhe `template_ids`, server-side valida antes de aceitar o JSON:

```
✅ válido: [carne_msc(parcelas=16), cartao_sem_juros(entrada=1,parcelas=9), entrega_montagem_gratis]
❌ inválido: [carne_msc(parcelas=16), carne_msc(parcelas=10)]    // 2x mesmo template = incoerência
❌ inválido: [legal_validity em terms_on_cover.items]            // scope errado (é footer_legal)
❌ inválido: [carne_msc(parcelas=99)]                             // params fora do range JSONSchema
```

Implementação: função pura `validateTemplateChoice(items, term_templates_registry) → ValidationResult`.

---

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web app data-intensive com governance de conteúdo (Next.js App Router + Supabase + IA generativa multi-provider). Decisão de domínio cravada no Step 2; sem ambiguidade.

### Starter Options Considered

Pesquisa em maio/2026 verificou versões atuais via web (não usei versões hardcoded). Avaliados quatro candidatos:

| Opção | Stack inclusa | Decisão |
|---|---|---|
| A — `create-next-app` puro | Next 16 + TS + Tailwind + Turbopack + ESLint + AGENTS.md | ❌ Custa 2-3h de bolt-on manual de Supabase + shadcn |
| **B — `--example with-supabase`** | A + `@supabase/ssr` + cookie-based auth + shadcn inicializado | ✅ **SELECIONADO** |
| C — `michaeltroya/supa-next-starter` | B + Vitest + Playwright + Husky + GitHub Actions | ❌ Opinionated demais; risco single-maintainer |
| D — `Razikus/supabase-nextjs-template` | B + i18n + file storage + React Native mobile | ❌ Sobra demais pra escopo MSC |

Descartados sem avaliação profunda: `next-supabase-stripe-starter` (sem pagamentos B2C no MSC), `Mohamed-4rarh/next-supabase-starter` (React Query conflita com Server Components default).

### Selected Starter: `with-supabase` (oficial Vercel × Supabase)

**Rationale para seleção:**
1. **Auth + RLS-ready desde dia 1** — alinhado com NFR multi-tenant futuro
2. **shadcn já inicializado** com style default — bate exatamente com UX spec (Sally usa shadcn no mockup HTML)
3. **Cookie-based SSR auth** — necessário pra Server Components com Supabase; recomendado pela Supabase pós-`auth-helpers` deprecation
4. **Manutenção premium** — Vercel + Supabase oficiais; mora na canary branch do `vercel/next.js`, sempre atualizado
5. **Subtração é trivial, adição é cara** — começamos enxutos e crescemos por demanda

**Initialization Command:**

```bash
pnpm create next-app@latest msc-catalogo --example with-supabase
cd msc-catalogo
cp .env.example .env.local
# Preencher:
#   NEXT_PUBLIC_SUPABASE_URL=...
#   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
pnpm dev
```

### Architectural Decisions Provided by Starter

**Language & Runtime:**
- TypeScript estrito (`strict: true`)
- Node 20+
- React 19
- Next.js 16.2.6 (latest em maio/2026)

**Styling Solution:**
- Tailwind CSS 4 (default no Next 16)
- shadcn/ui com style default inicializado (`components.json` configurado; trocar style = deletar e re-init)
- Variáveis CSS pra theming (light/dark futuro)

**Build Tooling:**
- **Turbopack** estável (default no 16.x; ~10× mais rápido que Webpack legacy)
- ESLint com config Next.js
- Auto-bundling de fontes via `next/font`

**Testing Framework:**
- ⚠️ **Não incluso pelo starter** — decisão deliberada no Step 4
- Candidatos prováveis: Vitest (unit/integration) + Playwright (e2e)

**Code Organization:**
- App Router em `app/` (Server Components default)
- `lib/supabase/client.ts` (browser client com `createBrowserClient`)
- `lib/supabase/server.ts` (server client com `createServerClient` + cookies)
- `lib/supabase/middleware.ts` (refresh de session em SSR)
- `components/ui/` (shadcn) + `components/` (nossos)
- `middleware.ts` na raiz (auth gate global)

**Development Experience:**
- **`AGENTS.md` auto-gerado** com convenções Next 16 — guia agentes BMAD a escrever código consistente
- Hot Module Replacement via Turbopack
- TypeScript watch mode integrado
- Cookie auth helpers prontos (server-side `createClient()` + client-side)
- Demo de auth funcional (login/signup/logout/protected route) como referência viva
- ESLint + Next plugin já configurados

### Implicações arquiteturais que o starter NÃO resolve (vão pra Step 4)

- ❌ **Queue/worker async** (gpt-image-2 175s > Vercel 60s)
- ❌ **OCR engine** (Tesseract vs alternativas)
- ❌ **Schema SQL** (house_config + term_templates + campaigns + audit_log + storage policies)
- ❌ **Konva integration** (editor canvas — não default do shadcn)
- ❌ **Multi-provider SDK abstraction** (OpenAI + Anthropic + Terasoft)
- ❌ **Sentry + observability** custom

**Note:** Inicialização via esse comando deve ser a **primeira história de implementação no Sprint 1**, antes de qualquer feature de negócio.

---

## Core Architectural Decisions — Categoria 3 (API & Communication) — DECISÕES CRÍTICAS

_Decisões 3a, 3b e 3c cravadas via Party Mode (Amelia + Mary + Sally) em 13/05/2026. Adendos vermelho-marcados emergem da Party._

### Decisão 3a — Long-running pipeline host: **Vercel Pro Functions + Supabase Realtime** _(reframe pós-discussão David, 13/05/2026)_

- **Versão**: Vercel Pro plan (latest), Supabase Realtime nativo
- **Pricing MVP**: $20/mês (Vercel Pro) — o frontend já roda aqui mesmo, então é custo afundado
- **Limite técnico**: Functions 300s no Pro
- **Rationale** (reframe honesto):
  - **gpt-image-2 cabe na margem**: mediana 170s, pico observado 218s → 82s de folga no pior caso (Amelia spike 12/05/2026)
  - **YAGNI**: não adicionar Trigger.dev antes de provar que precisa. Pipeline simples cabe em uma function:
    - sketch (~5s) + IA (~170s) + OCR (~2s) + visual auditor (~3s) = ~180s
  - **1 provider a menos** = menos complexidade operacional
  - **Migração futura é trivial** se latência degradar (código quase não muda)
- **Affects**: pipeline de render IA + OCR + visual auditor; cada peça = 1 function call independente
- **Status push pra UI**: Supabase Realtime (channel por catálogo) — frontend escuta updates em `pieces.status` e re-renderiza card em real-time
- **Retry policy**: helper custom `withRetry(fn, { maxAttempts: 3, backoff: 'exponential' })` em ~30 linhas — código nosso
- **Idempotency**: chave única por `piece_id + version` no banco antes de gerar; clicks duplicados viram no-op
- **Trigger.dev como Plan B documentado**: migrar SE: latência > 280s, volume > 200 peças/mês, pipeline > 3 steps, ou falhas frequentes exigindo retry inteligente

#### Sinais pra migrar pra Trigger.dev no futuro (monitorar via Sentry)

- ⚠️ Latência gpt-image-2 p95 > 280s
- ⚠️ Taxa de timeout > 2%
- ⚠️ Pipeline ganha 4º step
- ⚠️ Volume passa de 200 peças/mês

### Decisão 3b — OCR Engine (camada textual): **Tesseract.js puro** _(reformulado pós-discussão David, 13/05/2026)_

- **Versão**: Tesseract.js 5.x (open-source)
- **Custo MVP**: $0 (biblioteca npm, roda em Vercel Function ao lado da peça)
- **Conta externa nova**: **nenhuma** (objetivo declarado do David: minimizar providers)
- **Rationale (reframe honesto pós-David)**:
  - **Defesa real do CDC art. 30 NÃO é o OCR** — é o **gate humano da Amanda (3d)** + audit log + visual auditor (3c). OCR é assistente, não juiz final.
  - **Tesseract.js entrega 95-99%** em texto limpo (peças MSC são renderizadas por nós com fontes limpas — caso ideal pra Tesseract)
  - **Migração pra LLM Vision fallback é trivial** (~30min de código) se métrica de divergência justificar — mesma chave OpenAI/Anthropic já em uso
- **Cobertura esperada (baseada em spike Amelia)**:
  - ✅ Strings obrigatórias ausentes/truncadas
  - ✅ Preços corrompidos (alvo principal CDC art. 30)
  - ✅ Strings proibidas vazadas
- **Limitação aceita**: 1-5% de casos com texto borrado/condensado pode falhar — **gate humano da Amanda cobre essa lacuna**
- **Não cobre (gap declarado)**: identidade de mascote, layout quebrado, cores fora de brand → tratado em 3c
- **Affects**: audit pipeline, `audit_log` schema ganha `ocr_engine_used` + `ocr_confidence`
- **🆕 Adendo Sally**: OCR roda **em background não-bloqueante**. Card mostra "✓ pronta pra editar" só quando OCR validou. Falha de OCR vira **badge amarelo** ("texto suspeito — revisar"), **não bloqueia visualização**. Bloqueio só no gate de publicação (passo 6 da UX)

#### Plan B documentado pra migração futura

**Sinais pra ligar LLM Vision fallback (monitorar via métrica `ocr_confidence` p50):**

- ⚠️ Mais de 5% das peças com `confidence < 0.85` exigindo revisão humana
- ⚠️ Amanda reportar verbalmente "o checador tá errando muito"
- ⚠️ Acidente CDC (peça publicada com preço errado que OCR não pegou)

**Quando ligar (implementação):**

- Adicionar `lib/audit/ocr-llm-fallback.ts` chamando **OpenAI Vision** ou **Claude Vision** (mesma chave já em uso)
- Quando `tesseract.confidence < 0.85`, chamar fallback como segunda opinião
- Prompt determinístico: `"Extraia EXATAMENTE o texto que aparece. Não corrija, não interprete. Se ilegível, diga 'ILEGÍVEL'."`
- Custo estimado: ~$0.10/mês (só ~10% das peças usam fallback)

### Decisão 3c — Visual Identity Auditor (camada visual): **CLIP embedding + similarity threshold** _(reframe pós-Party)_

- **Origem**: Amelia apontou gap crítico — OCR é cego pra identidade de mascote distorcido. Caso real: `chatgpt-image-latest` em abril/2026 transformou Vovô MSC em outro cartoon. Nenhum OCR no mundo detecta isso.
- **Decisão técnica preliminar (cravada em 3c, refinada em Step 5)**:
  - **CLIP ou DINOv2** pra gerar embedding visual do mascote-referência + embedding da região do mascote na peça gerada
  - **Threshold de similaridade** (cosine similarity ≥ 0.85 candidato inicial) — abaixo = badge vermelho ("mascote alterado — revisar")
  - **Roda em paralelo ao OCR** dentro do mesmo task do Trigger.dev
- **Escopo MVP-1**: mascote MSC apenas. Logos, produtos com identidade visual forte → MVP-2
- **Custo**: ~$0 (embedding model open-source, roda no worker Trigger.dev)
- **Affects**: pipeline de audit, `audit_log` schema ganha `visual_similarity_check`, design de UX (Sally vai precisar adicionar estado de badge visual no card)

### 🆕 Decisão 3d (Party) — Human Approval Gate explícito antes de "Publicar"

- **Origem**: Mary observou que sem isso, qualquer arquitetura de fila/OCR é cosmética
- **Implementação**: estado obrigatório `pending_human_approval` no Catalog antes do publish. Amanda OU outro user com role aprovador deve clicar "Aprovo e publico" depois de revisar TODAS as peças
- **Custo**: zero — Amanda já é o gate natural; precisamos só formalizar no state machine + UI
- **Affects**: schema `catalogs.status` enum, route `/publish` exige flag `approved_by` + `approved_at`

### 🆕 Decisão 3e (Party) — Sem chunking de catálogos (Amanda foca em 1 por vez)

- **Origem**: Sally rejeitou explicitamente "Amanda faz briefing do próximo catálogo enquanto este renderiza" — é otimização de fábrica, não de humano
- **Implementação UX**: revelação progressiva dentro do catálogo atual (cards aparecendo prontos um a um), nunca pipeline mental cross-catálogo
- **Affects**: Tela 4 da UX já desenhada por Sally (v5.3) — grid 4×4 com progresso per piece, falha vira "tentar de novo" inline

---

## Core Architectural Decisions — Categorias 1, 2, 4, 5 + resto da 3 (18 decisões, validadas com David em modo humano)

_Categorias 1 (data), 2 (auth/security), 3 (API resto), 4 (frontend), 5 (infra). Bloco único validado em 13/05/2026 — David aprovou pacote com 5 ajustes destacados em humano + 13 decisões delegadas como "padrão da indústria"._

### Decision Priority Analysis

**Critical (block implementation):**
- 1a Schema SQL · 1b Migrations · 2a RLS · 5d CI/CD

**Important (shape architecture):**
- 1c Validação Zod · 2b Service role · 2c Secrets · 3f API style · 4a Server vs Client · 4d Konva integration

**Operacional / Custo:**
- 2d Hard cap OpenAI · 1d Cache strategy · 5a Worker hosting · 5b Storage · 5c Observability

**Deferred / Boring tech delegada:**
- 3g Retry policy · 3h Webhook security · 4b State mgmt · 4c Forms

---

### Categoria 1 — Data Architecture

**1a — Schema SQL inicial: Supabase Postgres**

Tabelas:
- `users` (Supabase Auth maneja)
- `tenants` (single row "Lojas MSC" no MVP; schema multi-tenant-ready)
- `catalogs` (status enum: draft/generating/ready/pending_approval/published/archived)
- `pieces` (campos: catalog_id, status, sketch_state, render_url, editor_state JSONB, audit_result)
- `products` (sync cache da Terasoft, TTL 10min)
- `house_config` + `house_config_history` (versionado, snapshot por peça)
- `term_templates` + `term_templates_history` (versionado)
- `audit_log` (price, CampaignSpec, IA, OCR, export, house_config edit, term_template edit)
- `ai_runs` (custo, latência, tokens, retries)
- `ocr_runs` (engine_used, confidence, divergence)
- `visual_audit_runs` (similarity_score, threshold_used)
- `metrics_daily` (agregado pra dashboard custom)

**Affects:** todas as outras decisões. Versão definitiva do schema = entregável do Step 6 (Structure).

**1b — Migrations tool: Supabase CLI migrations**

Comando: `supabase migration new <name>` gera arquivos SQL versionados em `supabase/migrations/`. Roda local (`supabase db reset`) e prod (`supabase db push`) identicamente.

**Rationale:** native; nada de Prisma/Drizzle pra evitar 2 source of truth de schema.

**1c — Schema validation: Zod em todo limite**

Toda função server (Next.js Server Actions, route handlers, callbacks) valida input com Zod antes de tocar no banco. Schemas Zod servem como source-of-truth pros TypeScript types via `z.infer<>`.

**Affects:** 3-layer data model (CampaignSpec, HouseConfig, TermTemplate) — cada um tem schema Zod estrito.

**1d — Cache strategy: Terasoft 10min · ISR 60s · session via Supabase**

- **Produtos (Terasoft)**: `unstable_cache` do Next.js com TTL **10 minutos** (ajuste David: era 5min)
- **Mini-site público**: ISR (Incremental Static Regeneration) com revalidate 60s
- **Session**: cookies Supabase Auth (default)
- **Outputs gpt-image-2**: Supabase Storage + CDN cache 1 ano (imutáveis)

**Affects:** UX (preço pode estar 10min defasado na navegação; Amanda confirma antes de publicar — sem risco CDC porque peça final usa snapshot do momento da geração)

---

### Categoria 2 — Auth & Security

**2a — RLS multi-tenant-ready: schema single-tenant agora**

Toda tabela tem `tenant_id UUID NOT NULL DEFAULT '<lojas-msc-uuid>'`. RLS policy padrão:
```sql
CREATE POLICY "tenant_isolation" ON <table>
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

**Affects:** zero custo hoje, migração indolor pra multi-tenant futura.

**2b — Service role boundaries: só em jobs server-side**

- ✅ Service role: workers do pipeline (Terasoft sync, render IA, OCR, visual auditor)
- ❌ Service role NUNCA em API routes Next.js servidas pra browser
- Cliente browser: sempre cookie-based auth via `@supabase/ssr`

**Affects:** auditoria — service role bypassa RLS, então toda escrita por worker deve gravar `actor: 'system'` no `audit_log`.

**2c — Secrets management**

- **Vercel env vars**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (frontend), `SUPABASE_SERVICE_ROLE_KEY` (server-only), `ANTHROPIC_API_KEY` (briefer)
- **Vercel env vars (server-only, scope=production)**: `OPENAI_API_KEY`, `GOOGLE_VISION_KEY` — só acessíveis em Vercel Functions, nunca no bundle browser
- **Rotação documentada**: runbook em `_bmad-output/operations/secret-rotation.md` (Sprint 0 task)
- **Acidental leak**: `.env.local` no `.gitignore` (já está); pre-commit hook bloqueia commit de strings com pattern `sk-`/`api-key`

**Affects:** Sprint 0 task ⚠️ — chave OpenAI exposta no chat ainda precisa ser rotada.

**2d — Hard caps OpenAI _(decisão David)_**

- **Console OpenAI**: spending limit **$50/mês** (aprovado David)
- **Soft warning**: $30/mês (email + log)
- **Nosso rate limit**: max **20 peças/hora** por tenant
- **Circuit breaker**: 3 falhas em 5min → estado open por 10min (sem chamadas) → half-open testa 1 → fechado

**Affects:** UX (Amanda pode ver "aguarde, limite temporário" — Sally desenha o aviso no Step 5).

---

### Categoria 3 — API & Communication (resto após 3a-3e)

**3f — API style: Next.js Server Actions (default) + route handlers só pra externals**

- **Server Actions**: 95% dos casos (CRUD, mutations, queries)
- **Route handlers** (`app/api/*/route.ts`): só pra webhooks (Terasoft callback eventual) e endpoints públicos do mini-site

**Rationale:** App Router idiomático; menos boilerplate; type-safety end-to-end.

**3g — Retry policy: helper custom `withRetry()`**

```typescript
withRetry(fn, {
  maxAttempts: 3,
  backoff: 'exponential',  // 1s, 2s, 4s
  retryOn: [429, 500, 502, 503, 504, 'TIMEOUT']
})
```

**Affects:** pipeline IA e OCR; substitui retry nativo do Trigger.dev (que removemos).

**3h — Webhook security: HMAC signature + idempotency key**

Pra qualquer callback (Terasoft, futuros): header `X-Signature: HMAC-SHA256(body, secret)` + `X-Idempotency-Key`. Server-side valida antes de processar.

**Affects:** zero hoje (não temos webhooks no MVP-1), mas schema preparado.

---

### Categoria 4 — Frontend Architecture

**4a — Server vs Client Components: Server default, Client only when needed**

- **Server Components** (default): data fetching Supabase, layouts, listagens, briefing form (Server Action), produtos
- **Client Components** (`'use client'`): editor Konva, real-time status (Supabase Realtime subscription), forms interativos com validação inline, drag-and-drop

**Rationale:** App Router idiomático; reduz JS bundle.

**4b — State management: Server state + Zustand local**

- **Server state**: Server Components + `revalidatePath()` após mutations
- **Cross-component client state**: **Zustand** (mais leve que Redux/Jotai) APENAS no editor Konva
- **Form state local**: `useState`/`useReducer`

**Affects:** editor Konva tem state complexo (zoom, pan, selected element, undo stack) — Zustand store dedicado.

**4c — Form library: react-hook-form + Zod resolver**

Mesmo schema Zod (1c) valida server-side + client-side. `@hookform/resolvers/zod`.

**Affects:** briefing form, login, edição inline de term_templates.

**4d — Konva integration: react-konva isolado em Client Component**

- Editor envolto em `<EditorCanvas />` Client Component
- State local Zustand
- **Debounced save 1s** em `pieces.editor_state` JSONB
- **Export PNG**: `stage.toDataURL({ pixelRatio: 2 })` (2× pra qualidade de impressão)
- **Performance**: máx 50 elementos visíveis simultâneos (peças MSC nunca passam disso na prática)

---

### Categoria 5 — Infrastructure & Deployment

**5a — Worker hosting: Vercel Pro Functions _(reformulado)_**

Já cravado em 3a — não tem worker externo. Tudo roda em Vercel Pro Functions.

**5b — Storage strategy: Supabase Storage _(decisão David)_**

- **Bucket `pieces-rendered`** (private): outputs gpt-image-2 finais
- **Bucket `pieces-public`** (public read via signed URL TTL 7 dias): peças aprovadas pro mini-site
- **CDN cache**: 1 ano em outputs imutáveis; 60s no mini-site (alinhado com ISR)
- **Policies**: RLS aplicado também no Storage (tenant-isolated)

**Affects:** custo MVP $0 (incluído no Supabase free tier 500MB; upgrade Pro $25/mês se passar disso).

**5c — Observability: Sentry + Vercel Analytics + dashboard custom _(decisão David)_**

4 fontes consolidadas:
- **Sentry** (free tier 5k events/mês): erros runtime, perf web vitals
- **Vercel Analytics**: web vitals + traffic
- **Trigger.dev dashboard**: ~~removido~~ (não usamos mais)
- **Dashboard custom** (Next.js + Supabase): página `/admin/metrics` que lê `metrics_daily`:
  - Custo IA por dia (USD)
  - Latência p50/p95 gpt-image-2
  - OCR divergence rate
  - Visual similarity p95
  - Taxa de retry, taxa de falha definitiva

**Affects:** Step 5 (patterns) define como cada layer reporta.

**5d — CI/CD: GitHub Actions + Vercel auto-deploy + Supabase migrations pre-deploy**

- **GitHub Actions** (free pra repos públicos; teu repo é privado mas escala MSC cabe nos 2000 min/mês free):
  - PR: lint + typecheck + test (Vitest unit) + preview deploy Vercel
  - Merge main: build + test + Supabase migration (`supabase db push`) + deploy Vercel prod + Sentry release
- **Branch protection**: main exige PR + CI verde
- **Rollback**: Vercel "Promote previous deployment" + Supabase migrations versionadas (rollback manual via `down.sql`)

---

### Decision Impact Analysis

**Implementation Sequence (Sprint 1 ordem sugerida):**

1. ✅ Init starter (`create-next-app --example with-supabase`)
2. ✅ Schema SQL inicial (1a) + migrations (1b)
3. ✅ RLS policies + tenant_id (2a)
4. ✅ Zod schemas + validation helpers (1c)
5. ✅ Server Actions framework + retry helper (3f, 3g)
6. ✅ Briefing form (4c) + Server Action chamando Claude
7. ✅ Pipeline gpt-image-2 em Vercel Function (3a) + Supabase Realtime push
8. ✅ OCR auditor Google Vision (3b) + helper Tesseract fallback
9. ✅ Visual auditor CLIP (3c) — pode ficar no MVP-1.5 se Sprint 1 ficar pesado
10. ✅ Editor Konva (4d) + Zustand store
11. ✅ Audit log + metrics_daily aggregator (5c)
12. ✅ Sentry + Vercel Analytics wiring (5c)
13. ✅ CI/CD GitHub Actions (5d)
14. ✅ Mini-site público + ISR (1d, 5b)

**Cross-Component Dependencies:**

- **3-layer data model** (house_config + term_templates + CampaignSpec) é prerequisito de TODO o resto
- **RLS (2a)** trava o schema — uma vez aplicado, migrar é doloroso
- **Audit log (2b+5c)** precisa estar pronto antes de qualquer mutation entrar em prod
- **Hard caps OpenAI (2d)** precisa estar configurado no console ANTES de Sprint 1 começar (risco financeiro)

---

## Implementation Patterns & Consistency Rules

_Validado com David em 13/05/2026 — pacote aprovado em bloco único. Idioma do banco: inglês (recomendação Winston, aceita por default no C). UX/mensagens pra Amanda: português brasileiro._

### Pattern Categories Defined

10 áreas de potencial conflito entre agentes BMAD identificadas. Cada padrão abaixo é vinculante pra todos os agentes Dev que tocarem no código.

### Naming Patterns

**Database Naming Conventions (Postgres / Supabase):**

| Elemento | Convenção | Exemplo |
|---|---|---|
| Tabela | `snake_case` plural | `pieces`, `house_config`, `audit_log` |
| Coluna | `snake_case` | `created_at`, `tenant_id`, `piece_id` |
| Foreign key | `<entidade>_id` | `catalog_id`, `tenant_id` |
| Índice | `idx_<table>_<col>` | `idx_pieces_catalog_id` |
| Função SQL | `snake_case` | `current_tenant_id()` |
| Enum type | `<table>_<col>_enum` | `catalogs_status_enum` |

**API Naming Conventions (Next.js Server Actions + route handlers):**

| Elemento | Convenção | Exemplo |
|---|---|---|
| Server Action | `verbNoun` camelCase | `generatePiece()`, `approvecatalog()` |
| Route handler | `kebab-case` paths | `app/api/terasoft-webhook/route.ts` |
| Query params | `camelCase` na URL | `?catalogId=...&pieceId=...` |
| Header custom | `X-MSC-<Name>` | `X-MSC-Tenant-Id` |
| JSON field na response | `camelCase` (boundary conversion) | `{ "createdAt": "..." }` |

**Code Naming Conventions (TypeScript):**

| Elemento | Convenção | Exemplo |
|---|---|---|
| Variável/função | `camelCase` | `getUserData()`, `pieceId` |
| Componente React | `PascalCase` | `EditorCanvas`, `BriefingForm` |
| Arquivo de componente | `PascalCase.tsx` | `EditorCanvas.tsx` |
| Arquivo de utility | `kebab-case.ts` | `retry-helper.ts`, `format-currency.ts` |
| Type/Interface | `PascalCase` | `CampaignSpec`, `AuditResult` |
| Const "imutável" | `SCREAMING_SNAKE` | `MAX_PIECES_PER_HOUR = 20` |
| Hook React | `use` + PascalCase | `useEditorState()` |

### Structure Patterns

**Project Organization (cravado no Step 6 com detalhe — esboço aqui):**

```
msc-catalogo/
├── app/                          # Next.js App Router (rotas)
│   ├── (auth)/                   # rotas autenticadas
│   ├── (public)/                 # rotas públicas (mini-site)
│   ├── admin/                    # admin de house_config + term_templates
│   └── api/                      # route handlers (webhooks, públicos)
├── components/
│   ├── ui/                       # shadcn primitives (não tocar manualmente)
│   ├── editor/                   # Konva canvas + controles
│   └── briefing/                 # form briefing IA
├── lib/
│   ├── supabase/                 # clients (server, client, middleware)
│   ├── ai/                       # OpenAI + Claude wrappers
│   ├── audit/                    # OCR + visual auditor
│   ├── schemas/                  # Zod schemas (source of truth)
│   └── helpers/                  # withRetry, formatCurrency, etc.
├── supabase/
│   └── migrations/               # SQL versionado
└── tests/
    ├── unit/                     # Vitest co-located OU centralizado
    └── e2e/                      # Playwright
```

**File Structure Rules:**

- **Tests co-located** com o código (`feature.ts` + `feature.test.ts` lado a lado) para unit; `tests/e2e/` para Playwright
- **Configs na raiz**: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `tailwind.config.ts`, `vitest.config.ts`
- **`AGENTS.md` na raiz** (auto-gerado pelo Next 16) — convenções pros agentes BMAD
- **`.env.example` versionado**, `.env.local` no `.gitignore`

### Format Patterns

**API Response Formats:**

- **Result tipado** em vez de throw solto:

  ```typescript
  type Result<T, E = AppError> =
    | { ok: true; value: T }
    | { ok: false; error: E }
  ```

- **AppError discriminated union** com `code`, `message`, `severity`:

  ```typescript
  type AppError =
    | { code: 'AI_PROVIDER_DOWN'; message: string; retryable: true }
    | { code: 'VALIDATION_FAILED'; message: string; fields: string[] }
    | { code: 'OCR_DIVERGENCE'; message: string; details: AuditResult }
    // ...
  ```

- **Boundary conversion**: banco fala snake_case, frontend recebe camelCase via util `toCamel()` em `lib/helpers/`

**Data Exchange Formats:**

- **Datas**: ISO 8601 string sempre (`"2026-05-13T10:30:00Z"`); nunca timestamp numérico
- **Booleanos**: `true`/`false`; nunca `1`/`0`
- **Decimais monetários**: `string` no JSON ("19.90") pra preservar precisão; converter pra `Decimal.js` no servidor
- **IDs**: `UUID v4` em todas tabelas (não auto-increment)
- **Null vs undefined**: banco usa `NULL`; TypeScript usa `null` (não `undefined`) em campos opcionais persistidos

### Communication Patterns

**Event System (Supabase Realtime + custom events):**

- **Realtime channel naming**: `tenant:<tenantId>:catalog:<catalogId>` — escopo de tenant + catálogo
- **Event payload**: `{ type: 'piece.status.changed', pieceId, oldStatus, newStatus, timestamp }`
- **Convenção de nome**: `<entity>.<action>` em past tense (`piece.generated`, `audit.failed`, `catalog.approved`)
- **Versionamento**: campo `eventVersion: number` em todo payload (default 1) pra evoluir sem breaking

**State Management Patterns:**

- **Imutabilidade obrigatória** (Zustand + immer middleware quando o store crescer)
- **Action naming**: `verbNoun` (`setSelectedElement`, `applyTransform`, `undoLastEdit`)
- **Selector padrão**: `useEditorStore(state => state.selectedElement)` (slice fino, evita re-render)
- **Sem global store fora do editor** — Server Components carregam o resto

### Process Patterns

**Error Handling:**

- **Server**: throw vira `Result.error` no boundary; Sentry capture com `severity` apropriada
- **Client**: ErrorBoundary por rota + toast pra erros user-facing
- **Toast levels (Amanda)**: 🔵 info, 🟡 warning (OCR suspeito), 🔴 error (peça falhou)
- **Mensagens em PT-BR amigável** — nunca expor: stack traces, IDs internos, mensagens raw da OpenAI
- **Logging**: `console.log` proibido em prod; `logger.info/warn/error` (custom wrapper que sample-a pro Sentry)

**Loading States:**

- **Per-component skeletons** — nunca tela inteira piscando
- **Suspense boundaries** por seção (briefing form, products list, pieces grid)
- **Real-time push via Supabase Realtime** — sem polling
- **"Pending" state granular**: card mostra próprio progresso (sketch → rendering → auditing → ready)

### Enforcement Guidelines

**All AI Agents (Dev, etc.) MUST:**

1. Toda mutação no banco passa por **Server Action** (não API route exposta)
2. Toda Server Action começa com `'use server'` + valida input com **Zod**
3. Toda escrita por worker grava em **audit_log** com `actor: 'system' | 'user:<id>'`
4. Toda chamada a OpenAI/Claude/Google Vision passa por **withRetry() + circuit breaker**
5. Toda peça gerada cria entries em **ai_runs + ocr_runs + (se 3c aplicável) visual_audit_runs**
6. **Mensagens UX em PT-BR** (Amanda é a usuária); **código em inglês**
7. Commits em **inglês**, formato Conventional Commits (`feat:`, `fix:`, `chore:`, etc.)
8. PR exige **CI verde + 1 review** (David no MVP, automation review-bot depois)
9. Zod schemas em `lib/schemas/` são **source of truth** dos tipos — `z.infer<>` pra derivar TS types
10. **Sem `any` em TypeScript** (ESLint regra `@typescript-eslint/no-explicit-any: error`)

**Pattern Enforcement:**

- **ESLint** + **TypeScript strict** + **Prettier** rodam em pre-commit (Husky)
- **CI bloqueia merge** se lint/typecheck/test falhar
- **Code review checklist** em `_bmad-output/operations/pr-checklist.md` (entregável Sprint 0)

### Pattern Examples

**Good Examples:**

```typescript
// ✅ Server Action correta
'use server'

import { z } from 'zod'
import { generatePieceSchema } from '@/lib/schemas/piece'

export async function generatePiece(input: unknown) {
  const parsed = generatePieceSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: { code: 'VALIDATION_FAILED', fields: parsed.error.errors } }
  }
  // ... withRetry + audit_log + return Result
}
```

```typescript
// ✅ Component naming + structure
// components/editor/EditorCanvas.tsx
'use client'
export function EditorCanvas({ pieceId }: { pieceId: string }) {
  const stage = useEditorStore(state => state.stage)
  // ...
}
```

**Anti-Patterns (proibidos):**

```typescript
// ❌ throw solto em Server Action
'use server'
export async function badAction(input: any) {  // any proibido
  throw new Error('Something broke')  // sem tipo, sem audit
}

// ❌ Component naming errado
// components/editor/editor-canvas.tsx  ← deveria ser PascalCase
export const editorCanvas = () => {...}  ← deveria ser PascalCase function

// ❌ Mensagem pra Amanda em jargão
toast.error('OpenAI API returned 429 rate limited')  // técnico
// ✅ certo: toast.error('Aguarde um instante — estamos no limite temporário da IA')
```

---

## Project Structure & Boundaries

_Estrutura completa apresentada e aprovada com David em 13/05/2026. Ajustes pós-decisão 3b reformulada (Tesseract.js puro) incorporados._

### Complete Project Directory Structure

```
msc-catalogo/
├── README.md                           # Como rodar local (PT-BR)
├── AGENTS.md                           # Convenções pros agentes BMAD (auto-gerado Next 16)
├── package.json
├── pnpm-lock.yaml
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── components.json                     # config shadcn/ui
├── eslint.config.mjs
├── vitest.config.ts
├── playwright.config.ts
├── .env.example                        # template (versionado)
├── .env.local                          # secrets reais (gitignored)
├── .gitignore
├── middleware.ts                       # auth gate global (Supabase)
│
├── .github/
│   └── workflows/
│       ├── ci.yml                      # lint + typecheck + test + preview deploy
│       └── deploy-prod.yml             # main → produção (migrations + deploy)
│
├── app/
│   ├── (public)/                       # rotas SEM auth (mini-site campanhas)
│   │   ├── campanhas/[slug]/page.tsx   # ISR 60s
│   │   └── layout.tsx
│   ├── (auth)/                         # rotas autenticadas
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── layout.tsx
│   ├── (app)/                          # área interna (Amanda)
│   │   ├── catalogos/
│   │   │   ├── page.tsx                # lista catálogos
│   │   │   ├── novo/page.tsx           # Tela 1 — briefing
│   │   │   └── [id]/
│   │   │       ├── briefing/page.tsx   # Tela 2
│   │   │       ├── produtos/page.tsx   # Tela 3 (lista densa + carrinho)
│   │   │       ├── geracao/page.tsx    # Tela 4 (grid 4×4 progress per piece)
│   │   │       ├── editor/[piece]/page.tsx  # Tela 5 (Konva)
│   │   │       ├── auditoria/page.tsx  # Tela 6 (gate publish)
│   │   │       └── publicar/page.tsx   # Tela 7
│   │   └── layout.tsx
│   ├── admin/                          # CRUD house_config + term_templates
│   │   ├── house-config/page.tsx
│   │   ├── term-templates/page.tsx
│   │   └── metrics/page.tsx            # dashboard custom (5c)
│   ├── api/
│   │   ├── terasoft-sync/route.ts      # cron diário sync produtos
│   │   ├── webhooks/terasoft/route.ts  # futuros callbacks
│   │   └── health/route.ts
│   ├── layout.tsx
│   ├── globals.css
│   └── not-found.tsx
│
├── components/
│   ├── ui/                             # shadcn primitives
│   ├── briefing/
│   │   ├── BriefingForm.tsx
│   │   ├── WireframePreview.tsx
│   │   └── ColorPalettePicker.tsx
│   ├── products/
│   │   ├── ProductList.tsx             # lista densa
│   │   ├── ProductRow.tsx
│   │   ├── PersistentCart.tsx          # 340px sticky
│   │   └── CartItem.tsx
│   ├── generation/
│   │   ├── PieceGrid.tsx               # grid 4×4
│   │   ├── PieceCard.tsx               # estados (pending/rendering/done/failed)
│   │   ├── ProgressBadge.tsx
│   │   └── RetryButton.tsx
│   ├── editor/                         # CLIENT components
│   │   ├── EditorCanvas.tsx            # 'use client' — Konva stage
│   │   ├── EditorToolbar.tsx
│   │   ├── ZoneIndicator.tsx           # 🟢🟡🔴
│   │   ├── TextEditor.tsx
│   │   └── store/useEditorStore.ts     # Zustand
│   ├── audit/
│   │   ├── AuditPanel.tsx
│   │   ├── OcrResult.tsx
│   │   └── VisualSimilarityBadge.tsx
│   └── admin/
│       ├── HouseConfigEditor.tsx
│       └── TermTemplateEditor.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # createBrowserClient
│   │   ├── server.ts                   # createServerClient + cookies
│   │   └── middleware.ts               # session refresh
│   ├── ai/
│   │   ├── claude-briefer.ts           # CampaignSpec generator
│   │   ├── openai-image.ts             # gpt-image-2 wrapper
│   │   ├── prompts/
│   │   │   ├── briefer-system.md
│   │   │   └── image-render-template.md
│   │   └── types.ts
│   ├── audit/
│   │   ├── ocr-tesseract.ts            # OCR primário (substitui Google Vision após reframe)
│   │   ├── visual-similarity-clip.ts   # 3c
│   │   ├── forbidden-strings.ts        # derivação dinâmica de CampaignSpec
│   │   └── audit-orchestrator.ts       # agrega 4 categorias
│   ├── terasoft/
│   │   ├── client.ts                   # fetch + TLS bypass controlado
│   │   └── cache.ts                    # unstable_cache 10min
│   ├── schemas/                        # Zod (source of truth)
│   │   ├── campaign-spec.ts
│   │   ├── house-config.ts
│   │   ├── term-template.ts
│   │   ├── piece.ts
│   │   └── audit.ts
│   ├── helpers/
│   │   ├── with-retry.ts
│   │   ├── circuit-breaker.ts
│   │   ├── format-currency.ts
│   │   ├── format-date.ts
│   │   ├── to-camel.ts
│   │   └── result.ts
│   ├── audit-log/log.ts                # writeAuditEntry()
│   ├── observability/
│   │   ├── sentry.ts
│   │   ├── logger.ts
│   │   └── metrics.ts                  # write metrics_daily
│   ├── realtime/piece-status-channel.ts
│   └── server-actions/
│       ├── catalogs.ts
│       ├── briefing.ts
│       ├── pieces.ts
│       ├── house-config.ts
│       └── term-templates.ts
│
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 20260514000000_init_tenants_users.sql
│   │   ├── 20260514000001_init_catalogs_pieces.sql
│   │   ├── 20260514000002_init_house_config.sql
│   │   ├── 20260514000003_init_term_templates.sql
│   │   ├── 20260514000004_init_audit_runs.sql
│   │   ├── 20260514000005_init_audit_log.sql
│   │   ├── 20260514000006_init_metrics_daily.sql
│   │   ├── 20260514000007_rls_policies.sql
│   │   └── 20260514000008_seed_house_config.sql
│   ├── seed.sql
│   └── functions/                      # Edge Functions (não usamos no MVP)
│
├── tests/
│   ├── unit/
│   │   ├── schemas.test.ts
│   │   ├── with-retry.test.ts
│   │   └── audit-orchestrator.test.ts
│   ├── integration/
│   │   ├── briefing.test.ts
│   │   └── pieces.test.ts
│   ├── e2e/
│   │   ├── flow-completo.spec.ts
│   │   └── admin.spec.ts
│   └── fixtures/
│       ├── house-config.json
│       └── sample-products.json
│
├── public/
│   ├── brand/
│   │   ├── logo-msc.svg
│   │   ├── mascote-vovo-msc.png        # reference image pra CLIP
│   │   └── strip-lojas-msc.png
│   ├── fonts/
│   └── og-images/
│
└── _bmad-output/
    ├── planning-artifacts/
    └── operations/
        ├── secret-rotation.md
        ├── pr-checklist.md
        └── trigger-dev-migration.md    # Plan B (caso Vercel Pro fique gargalo)
```

### Architectural Boundaries

**API Boundaries:**

| Boundary | Localização | Pattern |
|---|---|---|
| Browser ↔ Server | Server Actions (`lib/server-actions/*`) | Validação Zod em todo input |
| Server ↔ External APIs | `lib/ai/*`, `lib/terasoft/*` | Server-only; withRetry + circuit breaker |
| Server ↔ Database | `lib/supabase/server.ts` | RLS tenant-isolated; service role só em workers |
| Realtime push | `lib/realtime/piece-status-channel.ts` | Supabase Realtime channel scoped por tenant+catalog |

**Component Boundaries:**

- **Server Components** (default): data fetching, layouts, listagens, formulários simples
- **Client Components** (`'use client'`): editor Konva, real-time subscribers, drag-and-drop, inputs com validação inline
- **Shared (server+client)**: tipos Zod-derived, helpers puros (format-currency, format-date)

**Service Boundaries:**

- **AI Layer** (`lib/ai/*`): isolado, mockable em testes; wraps OpenAI + Anthropic com timeout + retry
- **Audit Layer** (`lib/audit/*`): isolado, recebe imagem + expected strings, retorna AuditResult
- **Terasoft Layer** (`lib/terasoft/*`): único ponto de contato com API self-signed; cache 10min
- **Observability** (`lib/observability/*`): único ponto de Sentry/logger; nunca usar `console.log` direto

**Data Boundaries:**

- **3 camadas de dados** (cravadas no Step 2):
  - 🔒 `house_config` — admin only via service role
  - 🟡 `term_templates` — admin only, IA seleciona via FK
  - 🎨 `pieces.campaign_spec` (JSONB) — IA preenche
- **Audit log** captura TODA mutação cross-tabela
- **Storage** (`pieces-rendered`, `pieces-public`) com RLS alinhado

### Requirements to Structure Mapping

**Fluxo principal (UX Sally v5.3) → código:**

| Etapa UX | Página | Server Action | Worker |
|---|---|---|---|
| Tela 1 — Lista catálogos | `app/(app)/catalogos/page.tsx` | `listCatalogs()` | — |
| Tela 2 — Briefing | `briefing/page.tsx` | `generateCampaignSpec()` | `lib/ai/claude-briefer.ts` |
| Tela 3 — Produtos | `produtos/page.tsx` | `addPieceToCatalog()` | `lib/terasoft/client.ts` |
| Tela 4 — Geração | `geracao/page.tsx` | `triggerPieceGeneration()` | `lib/ai/openai-image.ts` + `lib/audit/audit-orchestrator.ts` |
| Tela 5 — Editor | `editor/[piece]/page.tsx` | `savePieceEdit()` | — |
| Tela 6 — Auditoria | `auditoria/page.tsx` | — | (já rodado em Tela 4) |
| Tela 7 — Publicar | `publicar/page.tsx` | `approveCatalog()`, `publishCatalog()` | Storage move |
| Tela 8 — Admin | `admin/house-config/page.tsx` | `updateHouseConfig()` | — |
| Tela 9 — Mini-site | `(public)/campanhas/[slug]/page.tsx` | — (static + ISR) | — |

**Cross-Cutting Concerns:**

- **Auth**: `middleware.ts` raiz + `(auth)/` route group + `lib/supabase/server.ts`
- **Audit log**: `lib/audit-log/log.ts` chamado de toda Server Action que muta dados
- **Observability**: `lib/observability/*` instrumenta TODA chamada externa
- **Retry**: `lib/helpers/with-retry.ts` envolve TODA chamada IA/OCR/Terasoft

### Integration Points

**Internal Communication:**

1. **Browser → Server**: Server Actions (formulários, mutations)
2. **Server → DB**: Supabase client (RLS-protegido) ou service role (workers)
3. **Server → Browser (push)**: Supabase Realtime via channel `tenant:<id>:catalog:<id>`
4. **Worker (Vercel Function) → DB**: service role + audit log obrigatório
5. **Cron → Worker**: Vercel Cron Jobs aciona `app/api/terasoft-sync/route.ts` diariamente às 03:00 BRT

**External Integrations:**

| Sistema | Wrapper | Timeout | Retry | Circuit Breaker |
|---|---|---|---|---|
| Terasoft | `lib/terasoft/client.ts` | 30s | 3× exp | 5 falhas/5min → open 10min |
| OpenAI gpt-image-2 | `lib/ai/openai-image.ts` | 240s | 3× exp | 3 falhas/5min → open 10min |
| Anthropic Claude | `lib/ai/claude-briefer.ts` | 60s | 3× exp | 3 falhas/5min → open 10min |

**Data Flow (peça end-to-end):**

```
Amanda clica "Gerar peça"
  └─→ Server Action `triggerPieceGeneration(pieceId)`
        ├─→ pieces.status = 'generating'
        ├─→ Supabase Realtime push → frontend atualiza card
        └─→ Vercel Function (single, ~180s)
              ├─→ sketch.generate() — ~5s
              ├─→ openai-image.render(sketch) — ~170s
              │     └─→ withRetry + circuit breaker
              ├─→ audit-orchestrator.run(image, expected) — ~5s
              │     ├─→ ocr-tesseract.check()
              │     ├─→ visual-similarity-clip.check()
              │     └─→ forbidden-strings.check()
              ├─→ Storage upload + signed URL
              ├─→ pieces.status = 'ready' | 'failed'
              ├─→ audit_log INSERT
              ├─→ ai_runs INSERT (cost, latency)
              └─→ ocr_runs + visual_audit_runs INSERT
                    └─→ Realtime push → frontend atualiza card
```

### File Organization Patterns

**Configuration:**
- Raiz da pasta: `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `components.json`, `eslint.config.mjs`, `vitest.config.ts`, `playwright.config.ts`
- Env: `.env.example` versionado, `.env.local` gitignored

**Source:**
- `app/` exclusivo pra rotas (App Router)
- `components/` agrupados por feature (briefing/, products/, editor/, audit/)
- `lib/` agrupado por domínio (supabase, ai, audit, terasoft, schemas, helpers)

**Test:**
- Unit co-located preferred (`feature.test.ts` ao lado de `feature.ts`)
- Integration centralizado em `tests/integration/`
- E2E centralizado em `tests/e2e/` (Playwright)

**Assets:**
- `public/brand/` — assets de marca (versionados)
- `public/fonts/` — fontes self-hosted
- Outputs gerados (peças prontas) NÃO ficam em `public/` — vão pro Supabase Storage

### Development Workflow Integration

**Dev Server:** `pnpm dev` (Turbopack) + Supabase local opcional (`supabase start`)

**Build:** `pnpm build` (Next.js) + `supabase db push --linked` (migrations) em pre-deploy

**Deploy:**
- PR → Vercel preview deploy automático + comments com URL
- Merge `main` → Vercel produção + migrations Supabase + Sentry release
- Rollback: Vercel "Promote previous deployment" + Supabase migration manual (`down.sql`)

---

## Architecture Validation Results

_Validação completa rodada em 13/05/2026 pós conclusão dos Steps 1-6. Foco: coerência interna, cobertura de requirements, prontidão para Sprint 1._

### Coherence Validation ✅

**Decision Compatibility:**

Todas as 23 decisões arquiteturais foram cruzadas e validadas como compatíveis. Pontos críticos verificados:

- ✅ Starter `with-supabase` + decisão 1a/1b (Supabase Postgres + migrations CLI) — sem conflito; alinhamento total
- ✅ Server Actions (3f) + Zod (1c) + RLS multi-tenant-ready (2a) — fluxo consistente: input → Zod parse → RLS-filtered query
- ✅ Vercel Pro Functions (3a) + pipeline 180s (sketch+IA+OCR+visual) — cabe nos 300s com 120s de folga
- ✅ Tesseract.js (3b reformulado) + gate humano (3d) — defesa CDC funciona mesmo com OCR 95-99%, porque human-in-the-loop cobre os 1-5%
- ✅ Supabase Realtime (3a) + revelação progressiva UX (3e, Sally) — channel scoped + push per piece status casa com card-grid
- ✅ Zustand (4b) + react-konva (4d) + debounced save (1s) — pattern coerente; sem race condition
- ✅ Cookie-based auth (starter) + service role só em workers (2b) — modelo de privilégio bem cravado

**Pattern Consistency:**

- ✅ Naming snake_case (DB) + camelCase (API JSON, boundary convert) + PascalCase (componentes) — sem ambiguidade
- ✅ Result tipado (3f) elimina throws soltos; alinha com `lib/audit-log/log.ts` que captura tudo
- ✅ Estrutura `lib/` por domínio (ai, audit, terasoft) bate com boundaries de service definidos

**Structure Alignment:**

- ✅ Pasta `app/(public)/`, `app/(auth)/`, `app/(app)/`, `app/admin/` — route groups Next 16 idiomáticos
- ✅ `lib/server-actions/` agrupado vs Server Actions inline — escolha consciente (testabilidade + reuse)
- ✅ `supabase/migrations/` numerada por timestamp — alinha com Supabase CLI

### Requirements Coverage Validation ✅

**Functional Requirements (do Step 2):**

| FR | Coberto por |
|---|---|
| FR-1: IA briefer preenche CampaignSpec | `lib/ai/claude-briefer.ts` + Zod (lib/schemas/campaign-spec.ts) + Server Action `generateCampaignSpec` |
| FR-1b: Admin > House Config CRUD versionado | `app/admin/house-config/page.tsx` + `house_config_history` table + audit_log |
| FR-1c: Admin > Term Templates CRUD JSONSchema | `app/admin/term-templates/page.tsx` + `term_templates_history` + JSONSchema params validator |
| FR-2: Seleção produtos | `app/(app)/catalogos/[id]/produtos/page.tsx` + lib/terasoft/* + cache 10min |
| FR-3: Sketch generator | gerado server-side antes do gpt-image-2 call em `lib/ai/openai-image.ts` |
| FR-4: Geração IA imagem | `lib/ai/openai-image.ts` + withRetry + circuit breaker |
| FR-5: Editor inline 3 zonas | `components/editor/` + ZoneIndicator (🟢🟡🔴) + Zustand store |
| FR-6: Auditoria | `lib/audit/audit-orchestrator.ts` + OCR Tesseract + CLIP + forbidden strings |
| FR-7: Geração lazy | Server Action triggera Vercel Function async + Realtime push |
| FR-8: Modo apresentação | (MVP-2; não bloqueia Sprint 1) |
| FR-9: Mini-site | `app/(public)/campanhas/[slug]/page.tsx` + ISR 60s |
| FR-10: Exportar PDF/PNG | `stage.toDataURL()` no Konva + Server Action que gera PDF (pdfkit ou similar — TBD em Sprint 1) |

**Non-Functional Requirements:**

| NFR | Coberto por |
|---|---|
| Performance (revelação progressiva) | Supabase Realtime + Suspense boundaries + per-card progress (3e, Sally) |
| CDC art. 30 (price binding) | 4 camadas: Pré-LLM template choice + Pós-render Zod validation + OCR Tesseract + gate humano (3d) + audit log |
| Multi-tenant futuro | Schema com `tenant_id`, RLS policies prontas (2a) |
| Observabilidade | Sentry + Vercel Analytics + dashboard custom metrics_daily |
| Custo MVP previsível | Hard cap OpenAI $50/mo + rate limit 20/h + Tesseract zero-cost |
| Compliance (audit trail) | `audit_log` table captura toda mutação |
| Disaster recovery | Supabase backups 7 dias (free); Pro pra PITR |

### Implementation Readiness Validation ⚠️

**Decision Completeness:** ✅ Alta — 23 decisões cravadas com versão e rationale

**Structure Completeness:** ✅ Alta — árvore completa com mapping UX→código

**Pattern Completeness:** ✅ Alta — 10 categorias de pattern definidas com exemplos e anti-patterns

**Gaps identificados** (não bloqueantes, mas precisam de attention):

⚠️ **Critical Gaps:**
- **Schema SQL detalhado** — definimos as tabelas conceitualmente, mas as colunas exatas + tipos serão cravadas na primeira migration (Sprint 1, story 1). Não bloqueia início.
- **RLS policies exatas** — pattern definido (`tenant_id = auth.jwt()->>'tenant_id'`), policies por tabela serão escritas na migration 0007.
- **Credenciais Supabase + Anthropic + rotação OpenAI** — bloqueio operacional pra Sprint 1, não arquitetural.

⚠️ **Important Gaps:**
- **CLIP model selection** (3c) — DINOv2 vs CLIP vs custom embedding ainda não cravado; pode ficar pra Story dedicada no Sprint 1
- **PDF export library** (FR-10) — pdfkit, jspdf, ou puppeteer? Decisão diferida pra Sprint 1 com spike rápido
- **Konva performance limits** (4d) — testar 50 elementos é teórico; spike rápido em Sprint 1
- **Cron job exata pra Terasoft sync** — Vercel Cron scheduling não testado; spike

**Nice-to-Have Gaps:**
- Storybook pra componentes UI (MVP-2)
- E2E tests cobrindo todos 9 fluxos (Sprint 1 entrega cobertura básica, expansão depois)
- A11Y audit completo (WCAG AA — meta MVP-1.5)

### Architecture Completeness Checklist

**Requirements Analysis**

- [x] Project context thoroughly analyzed (Step 2 v3, ~265 linhas)
- [x] Scale and complexity assessed (Medium-high, 14 architectural components, 3-layer data model)
- [x] Technical constraints identified (Vercel 300s, Supabase 500MB free, OpenAI Tier 1, Terasoft self-signed TLS)
- [x] Cross-cutting concerns mapped (13 itens incluindo audit log expandido, OCR auditor, rate limiting, observability)

**Architectural Decisions**

- [x] Critical decisions documented with versions (Next 16.2.6, React 19, TS strict, Tailwind 4, Supabase, Tesseract 5.x, etc.)
- [x] Technology stack fully specified (frontend, backend, DB, AI, OCR, hosting, CI/CD)
- [x] Integration patterns defined (Server Actions, withRetry, circuit breaker, Realtime push)
- [x] Performance considerations addressed (Turbopack, ISR, CDN cache, Suspense, real-time push)

**Implementation Patterns**

- [x] Naming conventions established (DB snake_case, API camelCase, code PascalCase/camelCase)
- [x] Structure patterns defined (route groups, lib/ por domínio, tests co-located)
- [x] Communication patterns specified (Realtime channel naming, event naming `entity.action`)
- [x] Process patterns documented (Result tipado, error toasts PT-BR, Suspense, withRetry)

**Project Structure**

- [x] Complete directory structure defined (árvore completa Step 6)
- [x] Component boundaries established (Server vs Client, service layers, data layers)
- [x] Integration points mapped (Terasoft, OpenAI, Anthropic, Supabase Storage)
- [x] Requirements to structure mapping complete (tabela UX→código)

**Total: 16/16 ✅**

### Architecture Readiness Assessment

**Overall Status:** **READY WITH MINOR GAPS**

Justificativa: 16/16 checklist items ✅, mas 3 Critical Gaps operacionais existem (schema SQL detalhado, RLS exatas, credenciais externas). Esses gaps são **task-level** pra Sprint 1, não **architecture-level**. A arquitetura está sólida o bastante pra começar Sprint 1; primeiras 2 stories resolvem os gaps em curso de implementação.

**Confidence Level:** **High** — fundamentos cravados via:
- Visual spike Amelia (12/05) validou gpt-image-2 + qualidade
- Contribuição de campo David (13/05) cravou 3-layer data model
- Party Mode (Amelia + Mary + Sally, 13/05) estressou decisões críticas
- Reframe Vercel Pro (pós-questão David) reduziu complexidade vendor sem perder robustez

**Key Strengths:**

1. **3-layer data model rigoroso** (house_config + term_templates + CampaignSpec.creative) — defesa única no mercado pra CDC art. 30
2. **YAGNI aplicado conscientemente** — Vercel Pro em vez de Trigger.dev; Tesseract em vez de Google Vision; sem Turborepo
3. **Multi-tenant-ready sem custo MVP** — schema pronto, RLS pronto, migração futura indolor
4. **Defesa CDC em 4 camadas** — pré-LLM template choice + Zod params + OCR + gate humano
5. **Documentação destravadora pra agentes BMAD** — AGENTS.md auto-gerado + patterns + structure mapping
6. **Vocabulário humano em toda UX** — Amanda nunca vê jargão técnico
7. **Observabilidade desde dia 1** — Sentry + Vercel Analytics + Trigger.dev dashboard removido (não usamos) + custom metrics_daily

**Areas for Future Enhancement:**

1. **Visual auditor (3c) — CLIP vs DINOv2 spike** durante Sprint 1
2. **PDF export library** — spike rápido em Sprint 1
3. **Storybook** pros componentes UI — MVP-2
4. **A11Y WCAG AA** — meta MVP-1.5
5. **Multi-user real (não single-user MVP)** — RLS já preparado; UI ganha gestão de usuários no MVP-2
6. **Mobile app (React Native)** — preparado pelo starter Razikus mas não no escopo MVP

### Implementation Handoff

**AI Agent Guidelines:**

- **Seguir TODAS as 23 decisões arquiteturais** exatamente como documentadas; não re-decidir
- **Usar patterns consistentemente** — Result tipado, Zod em todo limite, audit_log em toda mutação
- **Respeitar boundaries** — service role só em workers, Server Components default, Client Components só com justificativa
- **Mensagens UX em PT-BR**, código + commits em inglês
- **Consultar este documento** antes de criar arquivo novo — verificar se cabe na estrutura existente

**First Implementation Priority (Sprint 1, Story 1):**

```bash
pnpm create next-app@latest msc-catalogo --example with-supabase
cd msc-catalogo
cp .env.example .env.local
# Preencher Supabase URL + chaves + Anthropic + OpenAI (rotacionada)
pnpm install
pnpm dev
```

Depois disso, **Story 2** é a primeira migration SQL (schema completo) + Story 3 é RLS policies + Story 4 é primeiro fluxo (briefing → CampaignSpec).







