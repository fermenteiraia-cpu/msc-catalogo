---
title: "Visual Spike — Gap Audit (v1 atual vs Régua Oficial)"
phase: "T1.2-T1.3"
date: "2026-05-12"
author: "Amelia (Senior Software Engineer)"
status: "ready-for-review"
---

# Visual Spike — Gap Audit

## Setup

| Item | Detalhe |
|---|---|
| Campanha gerada | `visual_spike_t1_1_20260512_103947` |
| Produtos | 12 (3 destaques) |
| Layout catálogo | `4x3` (12 produtos = 1 página) |
| Headline | "MÊS DAS MÃES" |
| Renderer | `app/lib/renderer.py` (Python+Pillow, v1) |
| Amostras canônicas em | `_bmad-output/planning-artifacts/visual-spike/v1-atual/` |

**Régua oficial usada na comparação:**
- `_ref_pdf/pag1.jpg` (Mês das Mães oficial — capa)
- `_ref_pdf/pag2.jpg` a `pag4.jpg` (páginas internas)
- Canva story do Redmi 15C (foto da tela da Amanda, sessão 2026-05-08)

---

## Top 6 GAPS BLOCKERS (P0 — sem isso, sem GO)

### 🔴 GAP-01 — Til-coração no "ã" de "mães"

**Severidade**: CRÍTICA — é o **elemento de marca mais reconhecível** da campanha de Mês das Mães.

| v1 atual | Régua oficial |
|---|---|
| Tipografia Lato Black com til normal (`~`) acima do "a" | Lettering bubble cursivo com **coração ❤️ no lugar do til** |

**Onde aparece**: Hero, IG, Story, WA, TV (5 das 5 amostras).

**Impacto técnico**: precisa render glyph custom — não pode usar fonte sistema. Opções:
- (a) Renderizar "ma" + "es" como texto e desenhar coração SVG/path entre os dois
- (b) Usar fonte custom com glyph alternativo no "ã" (script tipográfico)
- (c) Texto "mães" como imagem PNG/SVG pré-renderizada como asset (mais simples no MVP)

**Recomendação**: **opção (c)** no spike — gerar SVG do lettering "mães" com til-coração como **asset versionado** no `msc_brand/`. Renderer compõe esse asset em vez de desenhar text.

---

### 🔴 GAP-02 — Layout do catálogo modular (não grade homogênea)

**Severidade**: CRÍTICA — define a "linguagem do tabloide BR" que diferencia o produto.

| v1 atual | Régua oficial (PDF pag1) |
|---|---|
| **Grade 4×3** homogênea: 12 cards iguais | **Modular**: hero ocupa 1/3 superior + fileira de 6 smartphones + 3 cards grandes (TV/panelas/utensílios) + 6 cards pequenos (panela elétrica/fritadeira/secadores) |

**Implicação no engine**: renderer atual usa `cols × rows` fixo. Precisa de **layout template** que aceita seções com diferentes densidades:
```yaml
page1:
  - hero: { height_pct: 33 }
  - row: { items: 6, height_pct: 22 }   # smartphones pequenos
  - row: { items: 3, height_pct: 25 }   # eletros médios largos
  - row: { items: 6, height_pct: 20 }   # utilitários pequenos
```

**Recomendação**: criar `layouts/tabloide_br_pag1.json` declarativo. Renderer consome.

---

### 🔴 GAP-03 — Faixa "LOJAS MSC" 6× repetida (header/footer das páginas internas)

**Severidade**: CRÍTICA — assinatura visual da casa MSC. Aparece em **toda** página interna do PDF.

| v1 atual | Régua oficial (PDF pag2/3/4) |
|---|---|
| Header com faixa vermelha + título "MÊS DAS MAES" + logo dark direita. Footer com texto "LOJAS MSC | TODA LOJA..." | **Header E footer**: faixa azul-marinho com **logo "LOJAS msc" repetido 6× lado a lado** |

**Implicação técnica**: trivial. Função `render_brand_strip(W, height, n_logos)` que desenha logos em sequência. Aplica como header AND footer em todas as páginas a partir da pag2.

**Recomendação**: implementar `render_brand_strip()` em `renderer.py`. Chamar antes do header e antes do footer em `render_catalog_pages()`.

---

### 🔴 GAP-04 — Estrela amarela 12-pontas como selo "10x"

**Severidade**: ALTA — visual distintivo dos cards de produto no catálogo.

| v1 atual | Régua oficial |
|---|---|
| Círculo amarelo simples com texto "10x SEM JUROS" | **Estrela amarela 12 pontas** (formato "selo de promoção" clássico) com texto "10x SEM JUROS" preto centralizado |

**Implicação técnica**: desenhar polígono estrela com 24 vértices (12 pontas alternando raio interno/externo). Tem fórmula trigonométrica simples — ~15 linhas de Python.

**Recomendação**: nova função `draw_star_seal(d, cx, cy, r_out, r_in, points=12, fill_yellow)` em `renderer.py`. Substituir elipse do `card_compact`.

---

### 🔴 GAP-05 — Background coral lavado (não rosa pink saturado)

**Severidade**: ALTA — define o "mood afetivo" da campanha vs "pop comercial".

| v1 atual | Régua oficial |
|---|---|
| Gradient `rgb(255,200,215) → rgb(255,130,175)` (rosa-bebê → rosa-fúcsia) | **Coral lavado**: aprox `rgb(255,180,180) → rgb(255,150,165)` (mais quente, menos saturado, mais "salmão") |
| Corações de fundo **pixel-art 8-bit** | Corações com **profundidade real** (gradiente interno + sombra), menos densos, mais sutis |

**Implicação técnica**:
- Trocar 2 cores do `bg_canvas()` defaults
- Refazer `_heart_3d()` — usar `ImageFilter.GaussianBlur` no shadow, gradient na face, sem stepping 8-bit
- Reduzir densidade de corações (`density=70000` → `density=120000`)

**Recomendação**: refatorar `bg_canvas()` + `_heart_3d()`. ~30 linhas de mudança.

---

### 🔴 GAP-06 — Borda tracejada amarela no selo de preço (peças sociais)

**Severidade**: ALTA — detalhe que diferencia "feito por designer" de "feito por algoritmo" (Canva-test).

| v1 atual | Régua oficial (Canva story) |
|---|---|
| Elipse amarela SÓLIDA (`rgb(255,200,50)` 240 alpha) com preço vermelho centralizado | **Oval amarelo claro com borda DASHED AMARELO ESCURO**, conteúdo estruturado: "DE: R$ X (riscado) / POR: 1+9X SEM JUROS / R$ Y / OU À VISTA: R$ Z" |

**Implicação técnica**: PIL não tem dashed ellipse nativo, mas dá pra:
- (a) Compor mascarando uma elipse cheia com outra menor (sólido inverso)
- (b) Desenhar via SVG e renderizar
- (c) Usar Cairo (pycairo) se quiser dashed nativo
- (d) Bezier com `arc()` em segmentos

**Recomendação**: **(a)** — duas elipses concêntricas com gap = "borda". O dashed pode ser feito com pequenos arcs.

---

## Gaps SECUNDÁRIOS (P1 — melhoram qualidade, não bloqueiam)

| ID | Gap | Severidade | Onde |
|---|---|---|---|
| GAP-07 | Lettering "MÊS DAS" cursivo/bubble vs sans-serif extrudido | MÉDIA | Hero, sociais |
| GAP-08 | Nome do produto em texto escuro (não vermelho-rosado) nos cards do catálogo | MÉDIA | Catálogo |
| GAP-09 | Cards do produto SEM decoração atrás (limpos) — atualmente tem sombra de coração | MÉDIA | Catálogo |
| GAP-10 | Mascote pequeno integrado ao lockup do título (não solto) nas peças sociais | MÉDIA | IG/Story/WA |

## Gaps TRIVIAIS (P2 — polimento)

| ID | Gap | Onde |
|---|---|---|
| GAP-11 | Footer "Sorteio para as compras..." em barra rosa-escuro nas peças sociais | IG/Story/WA |
| GAP-12 | Logo "LOJAS msc" no topo das peças sociais (não só no bottom) | IG/Story/WA |
| GAP-13 | Footer institucional pag4: 9 lojas + redes sociais + validade legal + "Imagens ilustrativas" | Catálogo pag final |

---

## Plano de iteração — Fase 2 (sequência cravada)

**Princípio TDD adaptado**: cada T2.x = (implementa → gera amostra → compara visual → ajusta → grava em `v2/`).

| Ordem | Task | Effort estimado |
|---|---|---|
| T2.1 | GAP-05 (paleta coral lavado + corações com profundidade) — **base visual de tudo** | ~3h |
| T2.2 | GAP-01 (til-coração no "mães") — asset SVG/PNG versionado | ~3h |
| T2.3 | GAP-04 (estrela 12-pontas no selo "10x") | ~2h |
| T2.4 | GAP-06 (borda tracejada amarela no selo de preço social) | ~2h |
| T2.5 | GAP-03 (faixa "LOJAS MSC" 6× no header/footer das páginas internas) | ~1h |
| T2.6 | GAP-02 (layout modular do catálogo declarativo) | ~5h |
| T2.7 (opcional) | GAP-07/08/09/10 (polimento secundário se sobrar tempo no Sprint) | ~3h |

**Total estimado**: 16h ÷ 6-8h/dia ≈ **2-3 dias de iteração focada**.

---

## Decisão pendente — David autoriza?

**Pergunta crítica**: o **GAP-01 (til-coração)** sugere **(c) asset SVG/PNG pré-renderizado** como caminho mais pragmático. Isso significa:

- Vai precisar **alguém produzir o asset** ("mães" com til-coração) — não dá pra renderer fazer ad-hoc
- Pode ser: (i) extraído do PDF oficial via vetorização Inkscape/Illustrator (~1h), (ii) recriado em SVG manual (~2h), (iii) gerado pela IA briefer (em MVP-2, não MVP-1)

**Pra ti decidir antes de T2.1**:

| Opção | Tempo | Resultado |
|---|---|---|
| **A** | ~1h | Eu vetorizo o "mães" do PDF oficial via Inkscape pra SVG, asset versionado em `msc_brand/lettering/mes-das-maes.svg` |
| **B** | ~2h | Eu recrio manual em SVG (similar mas não idêntico ao oficial) |
| **C** | bloqueado | Espera designer humano produzir o asset finalizado |

**Recomendação**: **(A)** — vetorizar o PDF é caminho mais rápido e mantém fidelidade exata ao oficial. Risco: vetorização de PDF não é perfeita; pode precisar limpeza manual.

**Tu autoriza A?** Se sim, T2.1 começa imediatamente após (paleta coral é base de tudo). T2.2 vai logo em seguida com o SVG resultante.
