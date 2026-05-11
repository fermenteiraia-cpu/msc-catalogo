---
title: "Product Brief Distillate: MSC-Catalogo"
type: llm-distillate
source: "product-brief-msc-catalogo.md"
created: "2026-05-07"
purpose: "Token-efficient context for downstream PRD/architecture/dev workflows"
---

# MSC-Catalogo — Detail Pack

Material denso de contexto descoberto durante a sessão de brief. Cada bullet auto-contido. Use como insumo de downstream (PRD, ADRs, stories).

## Tese central

- **JTBD**: "Conectar preços promocionais ao código de produto e ao contexto da promoção, sem precisar de arte-finalista." Compete contra "designer manual + Photoshop", não contra Canva/Bannerbear que ainda exigem arte finalizada.
- **Tagline operacional**: "O ERP fala, a campanha sai."
- **Mecanismo de defesa**: tema imutável codado no produto (Amanda escolhe produto/preço/contexto, não cor/fonte/alinhamento) + integração ERP brasileira + multi-output sincronizado + diagramação modular por categoria (saber tácito do tabloide BR).

## Personas — detalhe além do brief

- **David (founder)**: dev BR, stack Next.js+Supabase+Vercel+Claude Code, banca custos do bolso, projeto gratuito pra esposa Amanda como "pet com cliente real". Aspira virar SaaS pra outras redes regionais BR em 12-24m.
- **Amanda (primary user)**: esposa do David, marketing das Lojas MSC. Faz 4 campanhas/mês sozinha. Tem muscle memory de Photoshop (anos de atalho/preset). Pode ter incentivo oculto contra automação total ("se sai sozinho em 5min, qual meu papel?"). Acesso 24/7 pro David, mas viés cognitivo de cônjuge a vigiar.
- **Marcos (stakeholder)**: diretor MSC, aprova catálogo na mesa, **não toca o produto**. Decisão consciente de cortá-lo do escopo. Risco aceito: pode virar gargalo se MSC virar SaaS-cliente comercial.

## Stack & arquitetura — decisões cravadas

- **Next.js 14** App Router + **React 18** + **TypeScript**.
- **@napi-rs/canvas** + **sharp** + **pdf-lib** pra renderização e composição.
- **Supabase** (BD + Storage + Auth) — substitui filesystem efêmero atual.
- **Vercel** deploy. `maxDuration=60` nas API routes (Hobby tem 10s, **vai precisar Vercel Pro $20/mês** ou refactor pra fila assíncrona).
- **Arquitetura "engine + tema"** desde o dia 1: pasta separada de tema MSC vs engine genérica. Tema MSC é único implementado no MVP-1 mas estrutura permite multi-tenant futuro.
- **Python v1 (`app/`) congela como referência** — não evolui, não se mexe.

## Schema Terasoft — campos relevantes

`CODIGO, NOME, GRUPO, SUBGRUPO, GRADE, FORNECEDOR, MARCA, REFERENCIA, SALDO, STATUS, VALORVENDA, PROMOCAO, VALORPROMOCAO, CARACTERISTICA, IMAGEM, ULTIMAALTERACAO`. Hoje renderer só usa `CODIGO/NOME/GRUPO/SUBGRUPO/GRADE/MARCA/VALORVENDA/IMAGEM`. **Campos não usados que podem virar features**: `STATUS` (filtrar inativos), `SALDO` (não anunciar item zerado), `PROMOCAO`/`VALORPROMOCAO` (preço promocional vindo direto do ERP em vez de Amanda calcular), `CARACTERISTICA` (descrição extra), `REFERENCIA` (nome alternativo).

## Convenções herdadas do v1 Python

- **Headline split**: última palavra → lettering 3D principal LOWERCASE; resto → topo UPPERCASE. Ex: "MÊS DAS MÃES" → top="MÊS DAS", main="mães". Convenção implícita no código, **deve virar configurável na UI** (a Amanda não tem como controlar hoje).
- **Termos hardcoded no hero**: "Toda loja com até / 50% / DE DESCONTO" + 4 termos: "Parcelamento facilitado · Em 16X no carnê da loja · Ou 1+9x sem juros nos cartões · Entrega e montagem grátis". Devem virar parametrizáveis por campanha.
- **Período hardcoded** ("Sorteio para as compras efetuadas / do dia 01/05 ao dia 09/05") — específico de Mês das Mães. Generalizar.
- **Default 1+9x sem juros** (parcelas=10), `val_parc = valor_promo / parcelas`, formato "POR: 1+Nx SEM JUROS" onde N=parcelas-1.
- **Selo amarelo**: rgb(255,200,50) com 94% alpha; preço em rgb(220,38,51) (vermelho MSC); fonte Lato Black ~8.5% da largura para o inteiro, ~4% para os centavos.

## Tamanhos canônicos

- IG quadrado: **1080×1080**
- Story: **1080×1920**
- WhatsApp: **1080×1920** (mesmo que Story)
- TV in-store: **1920×1080**
- Hero campanha (paisagem): **1500×600**
- Página de catálogo PDF: **2200×2540** (com header faixa vermelha + grid + footer)

## Decisões cravadas — o que faz e o que NÃO faz no MVP-1

- **NÃO**: aprovação digital do diretor (ele é chamado na mesa)
- **NÃO**: PDF print-ready offset (PDF/X-1a, CMYK, sangria) — gráfica aceita PDF padrão
- **NÃO**: multi-tenant SaaS (estrutura preparada, mas só tema MSC)
- **NÃO**: editor com camadas/máscaras/ajuste de cor por curvas — não é Photoshop-replacement
- **NÃO**: geração 100% por IA generativa — alucina logo/produto
- **SIM**: 7 telas (Projetos, Briefing, Marca-do-projeto, Produtos, Descontos, Preview, Editor)
- **SIM**: integração Terasoft com cache em Supabase
- **SIM**: upload manual de produto (10% sem foto na Terasoft)
- **SIM**: editor inline mínimo (mover, trocar foto, editar texto, redimensionar) com selo "manual"
- **SIM**: 14 entregáveis por campanha (1 hero + N páginas catálogo + 12 sociais)
- **SIM**: mini-site público da campanha (`/c/<slug>`) — link compartilhável
- **SIM**: arquitetura engine+tema desde o dia 1
- **SIM**: botão "exportar para Photoshop" (PSD/camadas) como fallback

## Roadmap pós-MVP-1 (em ordem)

1. **Sprint 0 (pré-código)** — validação visual em alta-fidelidade dos 4 formatos sociais com Amanda + baseline de tempo + cobertura de fotos Terasoft + ligação com gráfica (ver `sprint-0-checklist.md`)
2. **MVP-2** — Camada IA opcional (auto-preencher briefing, geração de fundo com 4 opções A/B/C/D, sugestão de copy, "refazer com IA" preservando edits manuais via selo)
3. **Templates de campanha sazonal** parametrizados (Black Friday, Dia dos Pais, Natal, aniversário de loja)
4. **Distribuição multi-canal v1.5**: ponte com Meta Advantage+ Catalog Ads (feed automático produto+preço+foto)
5. **Distribuição multi-canal v2**: régua segmentada de WhatsApp Business (disparo das peças avulsas com segmentação simples)
6. **Multi-tenant SaaS** — primeiros 2-3 clientes regionais não-MSC (sem laço pessoal, validação cega de mercado)
7. **Pré-flight gráfico** (CMYK, sangria, ICC) quando algum cliente exigir

## Ideias rejeitadas — não re-propor

- Editor visual livre estilo Canva (rejeita a tese "tema codado")
- Geração 100% por IA generativa (alucina produto de marca)
- Aprovação digital com link público pro Marcos (cortado por decisão consciente)
- PDF print-ready CMYK offset no MVP-1 (gráfica aceita PDF padrão)
- Email/relatório mensal pro Marcos (decisão consciente: ele não toca o produto)
- Templates editáveis pela Amanda (a marca é codada, não editável)

## Inteligência competitiva — pontos importantes

- **Bannerbear/Creatopy**: digital only, sem PDF print-ready, sem template tabloide BR.
- **Canva**: sem CMYK confiável, sem template MSC, sem amarração com SKU; popular pela facilidade mas insuficiente pra encarte impresso.
- **Plug Catálogo**: catálogo institucional B2B (representante), não encarte promocional.
- **Meta Advantage+ Catalog Ads / Smartly.io / Hunch**: digital pago apenas, exigem catálogo e-commerce estruturado, custo alto pra 4 campanhas/mês, não respeitam identidade artesanal (mascote/lettering 3D).
- **Promob**: software de projeto 3D pra móveis planejados — categoria diferente, não compete.
- **Geração total por IA**: alucina logo/modelo de produto de marca; janela de oportunidade enquanto modelos não resolvem isso (estimativa 6-12 meses).

## Hipóteses de mercado a validar antes de virar SaaS

- Existem 5-10 redes regionais brasileiras (Eletrocenter, Becker, Edmil, etc.) com problema parecido o suficiente pra mesma engine + tema-novo.
- ICP: rede regional média (5-50 lojas), ERP brasileiro, marketing de 1-3 pessoas, 4-8 campanhas/mês.
- ACV alvo: TBD — pesquisar SaaS de creative automation BR equivalente.
- Canal de aquisição: hipótese 1 — ERPs brasileiros como vetor (parceria comercial); hipótese 2 — associações regionais de varejo; hipótese 3 — gráficas regionais (acordo de pré-flight).

## Modelos de receita futuros (pós-SaaS)

- **Mensalidade por cliente** (modelo SaaS clássico)
- **Verba cooperada de fornecedor**: Brastemp/Samsung/Multilaser pagam parte do encarte, MSC-Catalogo entrega relatório auditável de quais produtos saíram em quais peças/lojas
- **Marketplace de integração ERP** (taxa por integração ativa)
- **Pré-flight gráfico** (taxa por PDF validado e aceito pela gráfica)

## Open questions surfaced not yet resolved

- Quem é o **cliente-âncora #2** (não-MSC)? Quando começar a procurar?
- ACV alvo pro SaaS — research necessário
- Estrutura legal do produto: empresa de David, sociedade com Amanda, freelance, etc.?
- Estratégia de IP: software fica do David, mas tema MSC fica de quem?
- Quando virar SaaS, conta Vercel/Supabase migra pra empresa? Cobrança em BRL ou USD repassado?
- Backup/runbook técnico: David é único ponto de falha — quem é o backup?
- Política de comunicação Amanda↔David quando virar conflito de papel (cônjuge vs cliente)?

## Sprint 0 — checklist de pré-MVP

Os 10 itens da seção "Premissas a validar antes do MVP-1" do brief estão materializados como checklist acionável em `sprint-0-checklist.md`. Cada premissa tem owner, método e status.

## Métricas-chave do MVP-1

- **Tempo briefing→14 arquivos** < 5min (medir baseline atual primeiro)
- **% campanhas mensais 100% no produto** = 100% das 4
- **% peças sem retrabalho** ≥ 60% (medir baseline primeiro)
- **Métrica de wedge**: nº de vezes que Amanda abriu Photoshop em paralelo na 1ª campanha solo

## Pontos de atenção operacional pra David

- Cadência de trabalho: 1 sprint = 2 semanas; reunião semanal de 30min com Amanda; release planejado mensal.
- Separar "casa" de "produto" mesmo sob o mesmo teto.
- Combinar regra de "feature MSC vai pra tema, engine não acomoda" com Amanda **antes** que apareça o primeiro pedido conflituoso.
- Documentar tudo em runbook (mesmo sendo solo) — é o seguro contra "e se eu sair de cena".
- Definir teto de gasto mensal Vercel/Supabase que dispara revisão (sugestão: $50 USD).
- Validação cega externa: mostrar peças geradas pra alguém **fora do círculo MSC + Amanda + David** em pelo menos 1 momento, capturar reação não-enviesada.
