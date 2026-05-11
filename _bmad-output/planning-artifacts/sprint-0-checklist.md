---
title: "Sprint 0 — Checklist Pré-MVP"
project: "MSC-Catalogo"
status: "in-progress"
created: "2026-05-07"
purpose: "Validações + medições + pré-requisitos a fechar antes de começar o build do MVP-1"
---

# Sprint 0 — Pré-MVP Checklist

Este documento materializa as **premissas a validar** + **achados que viraram tarefas operacionais** durante a fase de brief. **Nenhuma linha de código do MVP-1 deve começar antes destes itens estarem fechados** (ou explicitamente aceitos como risco).

Cadência sugerida: 1-2 semanas. Maior parte é conversa com Amanda (que é casa) + 1-2 chamadas externas (gráfica). Sem código.

---

## Track 1 — Conversa com Amanda (a maior parte é jantar, não reunião)

| # | Tarefa | Output esperado | Status |
|---|---|---|---|
| 1.1 | **Pedir 3 listas de produtos** das últimas campanhas no formato cru em que Amanda recebeu | 3 arquivos/imagens/transcrições — entender se vem em planilha, foto, áudio, WhatsApp | ⚠️ |
| 1.2 | **Sessão de shadowing** (1-2h): observar Amanda fazendo 1 campanha real no Photoshop do começo ao fim | Anotações de fluxo real, vocabulário dela, momentos de pânico, atalhos que ela usa | ⚠️ |
| 1.3 | **Pergunta direta**: "se eu te entregasse isso em 30min sem chance de retrabalho, ou em 5min com chance de retrabalho, qual escolhe?" | Saber se a métrica certa é tempo ou ausência de retrabalho | ⚠️ |
| 1.4 | **Pergunta direta**: "você quer ser libertada da tarefa, ou valorizada por fazer ela?" | Verificar se há incentivo oculto contra automação | ⚠️ |
| 1.5 | **Catalogar mudanças que Marcos pediu** nas últimas 5 campanhas — revisar PSDs históricos com Amanda | Lista de tipos de pedido (trocar produto, mudar preço, destacar X, mascote maior, etc.) — informa o editor | ⚠️ |
| 1.6 | **Combinar regra antes de aparecer**: feature MSC-específica vai pra "tema MSC"; engine não acomoda hardcode de cliente | Acordo verbal/escrito com Amanda sobre como negar pedido que sabote generalização | ⚠️ |
| 1.7 | **Definir cadência** (sprint, reunião semanal de 30min, release mensal) | Calendário/regra combinada — separa "casa" de "produto" | ⚠️ |

---

## Track 2 — Medições objetivas (baseline)

| # | Tarefa | Output esperado | Status |
|---|---|---|---|
| 2.1 | **Cronometrar 2-3 campanhas atuais** (Amanda no Photoshop) — tempo total + por estágio | Baseline de tempo: briefing / seleção / geração / revisão. Ex.: hoje 3-5 dias → meta 1 manhã | ⚠️ |
| 2.2 | **Contar peças por campanha** real e quantas sofrem retrabalho | Baseline de retrabalho: ex. "12 peças, 5 ajustadas" → meta ≥ 60% sem ajuste | ⚠️ |
| 2.3 | **Query no Terasoft** sobre cobertura de fotos dos SKUs das últimas 4 campanhas | % real (era estimativa de 10%; pode ser 30-40%) — define se "upload manual" é gargalo principal ou caso de borda | ⚠️ |
| 2.4 | **Inspecionar qualidade visual** das fotos da Terasoft que existem (resolução, fundo, corte) | Saber se renderer precisa fazer remove-bg, upscale, ajuste — features escondidas no escopo | ⚠️ |

---

## Track 3 — Externos (1-2 chamadas, baixo custo)

| # | Tarefa | Output esperado | Status |
|---|---|---|---|
| 3.1 | **Ligação 15min com a gráfica** que imprime os catálogos da MSC | Confirmar que aceita PDF padrão (sem CMYK/sangria/ICC). Se exigir, escopo do MVP-1 muda muito | ⚠️ |
| 3.2 | **Validação cega externa**: mostrar 3 peças (1 hero, 1 catálogo, 1 social) geradas pelo v1 Python pra alguém **fora do círculo MSC + Amanda + David** | Reação não-enviesada — designer freelance, dono de outra loja, marketing terceirizado. Calibra qualidade visual percebida | ⚠️ |

---

## Track 4 — Validação visual antes do código (Premissa explícita do David)

| # | Tarefa | Output esperado | Status |
|---|---|---|---|
| 4.1 | **Prototipar IG (1080×1080)** em alta-fidelidade (Figma ou Photoshop) | Mockup que Amanda valide antes de virar código | ⚠️ |
| 4.2 | **Prototipar Story (1080×1920)** em alta-fidelidade | Idem | ⚠️ |
| 4.3 | **Prototipar WhatsApp (1080×1920)** em alta-fidelidade | Idem | ⚠️ |
| 4.4 | **Prototipar TV in-store (1920×1080)** em alta-fidelidade | Idem | ⚠️ |
| 4.5 | **Sessão de validação com Amanda** dos 4 mockups | Sinal verde antes do renderer ser codificado | ⚠️ |

> Pra catálogo PDF e hero não precisa dessa fase porque a referência (`MÊS DAS MÃES.pdf`) já é o gabarito.

---

## Track 5 — Higiene técnica + segurança (zero esforço de produto, zero risco)

| # | Tarefa | Output esperado | Status |
|---|---|---|---|
| 5.1 | **Tirar credenciais Terasoft do código fonte** (`app/lib/terasoft_client.py`, `studio/.env.example`) | Mover pra env vars, remover do `.env.example` | ⚠️ |
| 5.2 | **Rotacionar a senha Terasoft** com a Terasoft (já vazou no disco do dev e provavelmente no histórico Git) | Senha nova, registro de quando foi rotacionada | ⚠️ |
| 5.3 | **Resolver o cert TLS** com a Terasoft em vez de `verify=False` | Opções: pedir cert válido, ou empacotar CA do self-signed | ⚠️ |
| 5.4 | **`.gitignore`** decente: `app/cache/`, `__pycache__/`, `node_modules/`, `.next/`, `.env.local`, `campanhas/`, `_ref_pdf/` | Repositório limpo | ⚠️ |
| 5.5 | **Inicializar repo Git** + **GitHub privado** | Versionamento desde dia 1 | ⚠️ |
| 5.6 | **Definir teto de gasto mensal Vercel/Supabase** (sugestão: $50 USD) que dispara revisão | Alerta configurado | ⚠️ |

---

## Track 6 — Decisões estratégicas (Mary parar, David decidir, escrever)

| # | Tarefa | Output esperado | Status |
|---|---|---|---|
| 6.1 | **Quando começar a procurar cliente-âncora #2** (não-MSC) — antes ou depois de MVP-1 estável? | Decisão escrita no doc do projeto | ⚠️ |
| 6.2 | **Política de IP**: software fica do David? Tema MSC fica de quem? | Conversa com Amanda + decisão | ⚠️ |
| 6.3 | **Quando virar SaaS, estrutura legal**: empresa do David? Sociedade? | Pesquisa + conversa contador | ⚠️ |
| 6.4 | **Backup técnico**: quem é o "se eu sumir, alguém continua"? | Mesmo se for "ninguém", documentar runbook compensa | ⚠️ |

---

## Critério de saída do Sprint 0

Sprint 0 está fechado quando:

- **Track 1** (conversas com Amanda): todas as 7 fechadas — esperado fácil porque é casa
- **Track 2** (baselines): pelo menos 2.1 e 2.3 fechados (cronômetro + cobertura de fotos)
- **Track 3** (externos): 3.1 fechado (gráfica) — 3.2 desejável mas não-bloqueante
- **Track 4** (validação visual): 4 mockups feitos + sessão 4.5 com sinal verde
- **Track 5** (higiene): 5.1, 5.2, 5.3, 5.4, 5.5 fechados (segurança não-negociável)
- **Track 6** (estratégia): 6.4 (runbook) fechado; restantes podem ficar abertos por alguns sprints

**Tempo estimado total**: 1-2 semanas calendário (não 1-2 semanas-pessoa). A maior parte é tempo de Amanda + 1 ligação externa.

Quando isso fechar, ativa o **John (PM)** pra virar o brief em PRD detalhado, ou direto **Winston (Architect)** pra ADRs de arquitetura, ou direto **Amelia (Dev)** pra começar a construir.
