---
title: "Product Brief: MSC-Catalogo"
status: "complete"
created: "2026-05-07"
updated: "2026-05-07"
author: "David (founder) + Mary (BMad Business Analyst)"
inputs:
  - "msc_brand/app/main.py"
  - "msc_brand/app/lib/*.py"
  - "msc_brand/app/static/index.html"
  - "msc_brand/studio/README.md"
  - "msc_brand/studio/src/lib/**"
  - "msc_brand/studio/src/app/**"
  - "msc_brand/msc_studio_mockup.html"
  - "msc_brand/campanhas/mes_das_maes_v3_*/"
  - "C:/Users/HOLANDESA/Downloads/MÊS DAS MÃES - Lojas MSC.pdf (régua de qualidade)"
  - "Discovery Mary — Stages 1-3 (sessão 2026-05-07)"
---

# Product Brief: MSC-Catalogo

## ⚡ Atualização arquitetural 2026-05-12 (Amelia, pós Visual Spike)

**A tese central foi PRESERVADA, mas a implementação técnica VIROU.**

Validamos durante o Visual Spike (5 dias) que **renderer programático determinístico** (PIL/Canvas) **NÃO chega na régua de qualidade** exigida (Pixar/Octane premium 3D). Mesmo com asset "mães" extraído, paleta coral, estrela 12-pontas, etc., o output era "algorítmico" — Amanda fugiria pro Canva.

**Solução validada**: arquitetura **"sketch + IA generativa"** — analogia do arquiteto:

```
SketchUp (volumetria)   →  V-Ray (renderização final)
Renderer programático    →  gpt-image-2 (OpenAI img2img)
(garante dados corretos)    (entrega qualidade Pixar)
```

**Como funciona**:
1. **Renderer Python** (já existe) gera **sketch** com todos os elementos posicionados, preços/SKUs/textos corretos, paleta MSC, mascote, logo. Output rápido e barato.
2. **Amanda aprova o sketch** — se algo errado, ajusta antes de gastar token.
3. **API OpenAI `gpt-image-2`** transforma o sketch em **arte final 3D premium** preservando dados.
4. **Auditor OCR** (Tesseract, opcional) confirma preservação de texto.

**Validação técnica** (3 testes em 12/05): catálogo 12 produtos, hero paisagem, IG quadrado — **todos passaram com 100% de preservação de preços/nomes/identidade visual**.

**Métricas atualizadas**:
- Custo: ~**$12/mês** (gpt-image-2 high quality, ~16 peças × 4 campanhas)
- Latência: ~**170s por peça** em background (Amanda não percebe)
- Qualidade: **nível agência profissional** (validado em Pixar style retail)

**Impacto nos princípios**:
- Tese "dados → arte sem arte-finalista" ✅ **preservada**
- Governança "IA não toca em preço" ✅ **preservada** (preço vem do sketch, IA preserva caracter-por-caracter)
- "1 semana → 1 manhã" ✅ **preservado** (latência IA não impacta tempo total da Amanda; gera em paralelo)

**Validações remanescentes** (Sprint 0):
- Cliente-âncora Lojas MSC aprova a estética IA gerada (Amanda + Marcos)
- Auditor OCR confirma preservação em N peças sem flag
- Limite de gasto OpenAI configurado ($20/mês hard cap)

---

## Tagline

> **"O ERP fala, a campanha sai."**

Creative automation que começa no estoque, não no Photoshop.

## Executive Summary

**MSC-Catalogo** é uma web app que transforma uma lista de códigos de produto + descontos em **catálogo impresso (PDF) + peças digitais para Reels e tráfego pago**, automaticamente, com a identidade visual da marca codada no produto. Substitui o gargalo "Photoshop manual de uma pessoa" por um pipeline **dados → arte** — sem exigir arte-finalista no meio do caminho.

O **cliente-âncora** é **Lojas MSC**, varejo regional brasileiro de bens duráveis (eletrodomésticos, móveis, telefonia, cama-mesa-banho), que produz 4 campanhas/mês manualmente. Hoje, a analista de marketing (Amanda) gasta dias entre "lista de preços fechada" e "arte aprovada na gráfica" — qualquer ajuste de última hora retrabalha 30+ peças. O MSC-Catalogo entrega os 14 artefatos de uma campanha completa (1 hero + N páginas de catálogo PDF + 12 peças sociais nos formatos IG/Story/WA/TV) em **menos de 5 minutos** a partir do briefing.

A janela é **agora**: stack moderna (Next.js + Supabase + Vercel) viabiliza SaaS de nicho com cliente-âncora único e expansão posterior; modelos de IA generativa de imagem ainda alucinam logos e modelos específicos de produtos de marca, abrindo espaço para abordagem **template-driven com foto oficial do fornecedor**; varejo regional brasileiro fragmentou canais (encarte impresso + Reels + Stories + WhatsApp + TV de loja) sem ferramenta dedicada que cubra todos eles a partir do mesmo input.

## The Problem

No varejo regional brasileiro de bens duráveis, comunicação promocional é o motor principal de vendas — encartes impressos semanais ainda circulam em cidades do interior, e canais digitais (Reels, tráfego pago, WhatsApp Business) viraram obrigatórios em >80% das redes médias. Mas o processo de produção continua o mesmo de 2010:

1. Marketing extrai lista de produtos do ERP em planilha
2. Designer abre Photoshop/Corel e recria cada peça manualmente (encarte + IG + Story + WA + TV in-store)
3. Diretor pede ajuste de preço/produto faltando → retrabalho linear de 30+ peças
4. Ciclo dura 3-5 dias por campanha — em mercado que exige horas

A consequência é dupla: campanhas atrasam (perdendo janela promocional) ou saem com inconsistência visual (mascote desproporcional, paleta errada, preço dessincronizado entre canais). Equipes pequenas (1-2 pessoas) ficam reféns de uma única pessoa que sabe Photoshop, e ferramentas internacionais (Canva, Bannerbear) não cobrem PDF print-ready que a gráfica aceita nem têm template de tabloide brasileiro.

## The Solution

Web app onde a Amanda:

1. **Cria o projeto** — nome da campanha, headline ("MÊS DAS MÃES"), CTA ("até 50% off"), período
2. **Seleciona produtos** — busca no ERP Terasoft por grupo/marca/grade, ou cola lista de códigos. Para os ~10% de produtos sem foto na Terasoft, sobe imagem manualmente
3. **Define descontos** — % global ou item-a-item, marca destaques (que viram peça avulsa social)
4. **Gera tudo** — sistema produz hero + catálogo PDF (com **diagramação modular por categoria**: móveis grandes ocupam mais espaço, smartphones/utilitários ficam em fileira) + IG/Story/WA/TV dos destaques
5. **Edita o que precisa** — editor inline para mover preço, trocar foto, ajustar qualquer detalhe; peças editadas ganham selo "manual" e ficam protegidas de regerações automáticas
6. **Exporta** — PDF para gráfica, JPGs por canal, link da campanha pra histórico

A identidade visual MSC (mascote vovô, logo, paleta rosa, lettering 3D, fundo de corações) está **codada como tema** dentro do produto. Amanda **não escolhe** cor, fonte ou alinhamento — ela escolhe **produto, preço, contexto**. O produto enforça o padrão de marca automaticamente.

## What Makes This Different

| Alternativa | Por que não cobre |
|---|---|
| Photoshop/Corel manual | Lento, single-point-of-failure, retrabalho linear |
| Canva | Sem CMYK confiável, sem template MSC, sem amarração com SKU/preço |
| Bannerbear / Creatopy | Genérico, sem template tabloide BR, sem PDF print-ready, sem fluxo |
| Plug Catálogo | Catálogo institucional B2B, não encarte promocional semanal |
| Meta Advantage+ Catalog Ads | Apenas digital pago, exige catálogo e-commerce estruturado |
| Geração 100% por IA generativa | Alucina logo/modelo do produto de marca |

**Defensibilidade real está em quatro pilares:**
- **Integração com ERP brasileiro** (Terasoft hoje, Bling/Tiny depois) — Canva/Bannerbear não vão por aí
- **Multi-output sincronizado** (impressão + 4 formatos digitais a partir de 1 input)
- **"Tema como produto"** — *ver subseção abaixo, é o pilar mais singular*
- **Fluxo casado com realidade brasileira** (gráfica aceita PDF, diretor aprova na mesa, peça vai pro WhatsApp)

A defensibilidade **não está no editor** — Canva/Adobe vão comoditizar editor visual em 12-18 meses. Está no **fluxo + integração + brand enforcement**.

### Tema como produto (pilar central de defesa)

A identidade visual da marca (mascote, logo, paleta, lettering 3D, fundo de corações) é **codada como tema imutável** dentro do produto, não como template editável. Amanda **não escolhe** cor de fonte, alinhamento, espaçamento — ela escolhe **produto, preço, contexto**. O sistema enforça padrão automaticamente.

Isso resolve em uma só decisão arquitetural três problemas crônicos do varejo regional:
1. **Inconsistência visual entre canais** (mascote desproporcional, paleta errada — comum quando designer roda manual)
2. **Brand drift** quando troca de pessoa (cada designer reinterpreta a marca)
3. **Vulnerabilidade a IA generativa que alucina logo/produto** (problema atual de Midjourney/DALL-E para produtos de marca)

Para o diretor da MSC: *"sua marca nunca sai errada"*. Para o investidor: defensibilidade que não depende de feature, depende de filosofia de produto — e que nenhum editor visual pode replicar sem virar coisa diferente.

### Diagramação modular por categoria

Saber tácito do tabloide brasileiro: móveis grandes ocupam células 2×2, eletrodomésticos médios ocupam 1×1, smartphones/utilitários ficam em fileira de 6 em uma única linha — assim os PDFs de referência das Lojas MSC se desenham. Nenhum SaaS internacional resolve isso porque ninguém entende o tabloide BR. Esse algoritmo (peso por categoria + override manual) é **patenteável como processo** ou pelo menos **diferenciador comercial duradouro**.

## Who This Serves

### Buyer / Founder

**David** — desenvolvedor brasileiro, founder do produto. **Não trabalha na MSC**, mas tem acesso privilegiado à operação porque a primary user (Amanda) é sua esposa. Constrói gratuitamente como projeto pessoal com cliente-âncora real, com aspiração de virar SaaS para outras redes regionais brasileiras em 12-24 meses. Stack-savvy (Next.js, Supabase, Vercel, Claude Code). Decide tecnologia, define escopo, valida releases. Banca custos operacionais (Vercel/Supabase) do próprio bolso até o produto virar comercial.

### Primary User

**Amanda** — analista de marketing das Lojas MSC, **esposa do David**. Operacional, hands-on, faz **as 4 campanhas mensais** sozinha hoje. Não escolhe ferramenta — usa o que David entregar. O "aha moment" dela é: "subi a lista, saíram 14 arquivos prontos numa manhã". O sucesso pra ela: terminar campanha em horas, não em dias; parar de retrabalhar quando o Marcos pede ajuste; manter padrão visual sem precisar pensar nele.

> **Vantagem operacional rara**: validação contínua e de altíssima fidelidade — David pode fazer shadowing, entrevista e iteração rápida com a usuária a qualquer momento, eliminando a maior fonte de erro de founder solo (construir em vácuo). **Risco a vigiar**: viés de validação por proximidade — Amanda pode aprovar por afeto e não por mérito do produto. Mitigação: instrumentação objetiva (métricas no app), não pedir opinião subjetiva como única evidência.

### Stakeholder (não-usuário)

**Marcos** — diretor das Lojas MSC. Aprova catálogo impresso antes do envio à gráfica. **Não interage com o produto** — é chamado na mesa, olha o PDF na tela da Amanda, diz "ok" ou "trocar isso". O sucesso pra ele: ver campanha pronta sem atraso, sem inconsistência visual, sem custos extras de re-gravação na gráfica.

## Success Criteria

| Métrica | Baseline atual *(a medir antes do build)* | Meta MVP-1 | Como medimos |
|---|---|---|---|
| **Tempo de geração** (briefing pronto → 14 arquivos) | TBD — cronometrar 2-3 campanhas atuais no Photoshop | **< 5 minutos** | Timestamps no app, segmentado por estágio: briefing / seleção produtos / geração / revisão |
| **% das 4 campanhas mensais 100% no MSC-Catalogo** (vs. parte fora em Photoshop/Canva) | 0% (hoje 0% no produto) | **100%** | Auto-relato Amanda + flag "Photoshop aberto" no app |
| **% de peças sem retrabalho manual** | TBD — contar quantas peças por campanha hoje sofrem ajuste | **≥ 60%** | Flag "edição manual" no banco |

**Sinais qualitativos secundários:**
- Amanda relata espontaneamente que prefere o MSC-Catalogo a "fazer manual"
- Marcos aprova catálogo na primeira passagem em ≥ 75% das campanhas (baseline: TBD — quantas vezes Marcos pede ajuste hoje?)
- Nenhuma peça gerada é rejeitada pela gráfica por motivo técnico (cor estourada, fonte ausente, baixa resolução)

**Aviso importante:** as três metas-chave são **chute fundamentado** até o baseline ser medido. Cronometrar/contar 2-3 campanhas atuais antes do MVP-1 começar é **não-negociável** — sem isso, o sucesso é narrativa sem âncora.

## Scope

### In — MVP-1 ("Studio Funcional")

- **7 telas** (Projetos, Briefing, Marca-do-projeto, Produtos, Descontos, Preview, Editor) — conforme blueprint `msc_studio_mockup.html`
- **Integração Terasoft** com cache em Supabase (não filesystem efêmero)
- **Upload manual de produto** para os ~10% sem foto na Terasoft
- **Renderer com diagramação modular por categoria** — cards proporcionais ao peso da categoria (móveis → grande; smartphone/utilitário → pequeno em fileira); override manual no editor
- **Editor inline** com mover, trocar foto, ajustar preço, editar texto; peças editadas com selo "manual" e proteção contra regerações
- **Geração dos 14 entregáveis** (1 hero + N páginas catálogo PDF + 12 peças sociais nos 4 formatos IG/Story/WA/TV)
- **Mini-site público da campanha** — link compartilhável (`/c/<slug>`) que renderiza o catálogo na web. **Triplo propósito**: (i) substitui PDF gigante por link no WhatsApp, (ii) facilita revisão da Amanda no celular antes de imprimir, (iii) infraestrutura pronta pra trackeamento de cliques quando virar SaaS
- **Persistência Supabase**: projetos, campanhas, peças geradas, histórico
- **Auth** simples (login Amanda + David)
- **Deploy Vercel** com domínio interno
- **Arquitetura engine + tema MSC** desde o dia 1: tema MSC é único implementado, mas estrutura permite adicionar temas novos no futuro (vacina contra refactor caro depois)
- **Botão "exportar para Photoshop"** (PSD/camadas) como fallback explícito — Amanda termina lá quando o editor inline não der conta, **sem deixar o produto**

> **Pré-código importante**: David quer **prototipar visualmente os 4 formatos sociais (IG, Story, WA, TV)** antes de escrever código de renderer pra esses formatos — evita retrabalho. **Esse passo entra no Sprint 0** (validação visual com Amanda em alta-fidelidade) antes do build começar.

### Out — MVP-1 (mas no roadmap)

- **Aprovação digital do Marcos** — cortado: ele é chamado na mesa
- **PDF print-ready offset** (PDF/X-1a, CMYK, sangria, ICC profile) — gráfica atual aceita PDF padrão
- **Multi-tenant SaaS** — estrutura preparada, mas só tema MSC implementado
- **Camada IA** (auto-preencher briefing, geração de fundo, sugestão de copy, "refazer com IA" preservando manual edits) — vira **MVP-2** ("vacina contra obsolescência")
- **Templates de campanha além de Mês das Mães** (Black Friday, Dia dos Pais, Natal, aniversário de loja) — release seguinte ao MVP-1

### Out — explicitamente

- Ferramenta de design genérica (Canva-like, edição livre de marca)
- Edição da identidade visual pela Amanda (logo/cores/fonte) — marca é codada
- Funções de compra / e-commerce / venda direta
- Geração 100% por IA generativa (descartado: alucina produto de marca)
- Editor com camadas, máscaras, recortes pixel-a-pixel, ajuste de cor por curvas — Photoshop-replacement não é o jogo
- Conversão CMYK / pré-flight gráfico / ICC profile — a gráfica atual aceita PDF padrão

## Vision (12-24 meses)

**6 meses** — MVP-2 com camada IA opcional (assistência em vários pontos do fluxo, sem bloquear), 3-4 templates de campanha sazonal parametrizados (Mês das Mães, Black Friday, Dia dos Pais, Natal), Lojas MSC rodando 100% das peças no produto.

**12 meses** — Camada de **distribuição multi-canal** integrada:
- **Ponte com Meta Advantage+ Catalog Ads** — feed de produto+preço+foto que o MSC-Catalogo já mantém vira input direto pra retargeting de tráfego pago. Adiciona ROI mensurável (CPA por anúncio) à proposta — algo que encarte tradicional nunca teve.
- **Régua segmentada de WhatsApp Business** — disparo das peças avulsas pra grupos/listas de clientes da MSC com segmentação simples (categoria de interesse, ticket médio).

Início do **SaaS multi-tenant** com 2-3 clientes regionais brasileiros adicionais, cada um com tema próprio, mantendo a tese central. Catálogo de integrações ERP brasileiras (Terasoft, Bling, Tiny, ERP-próprios) — terreno onde Canva/Bannerbear não pisam.

**24 meses** — Plataforma de creative automation para varejo regional brasileiro, com dezenas de templates de campanha sazonal, biblioteca compartilhada de fotos de fornecedores (com governança de licenciamento), e ferramentas de pré-flight para gráficas (CMYK, sangria, ICC) quando o segmento exigir.

> **Asterisco de viabilidade**: a aspiração SaaS depende de **provar com cliente #2 (não-MSC, sem laço pessoal)** que a tese vale fora do contexto de cônjuge. Isso é a verdadeira virada de "side-project" pra "produto comercial".

---

## Premissas a validar antes do MVP-1

Estas premissas são bases do brief, mas **não foram testadas em campo**. Validá-las antes/durante a primeira semana de build evita reescrever o produto depois.

| # | Premissa | Como validar | Owner | Status |
|---|---|---|---|---|
| 1 | Amanda recebe a lista de produtos em planilha estruturada (não foto/áudio/WhatsApp) | Pedir 3 listas reais das últimas campanhas no formato cru recebido | David | ⚠️ pendente |
| 2 | ~10% dos produtos não têm foto na Terasoft (resto sim e em qualidade utilizável) | Query no Terasoft sobre SKUs das últimas 4 campanhas + inspeção visual | David | ⚠️ pendente |
| 3 | Diagramação modular pode ser deterministicamente derivada de `GRUPO/SUBGRUPO` da Terasoft | Derivar 3 PDFs históricos só com regras automáticas e comparar com o real | David | ⚠️ pendente |
| 4 | Editor inline com 4-5 operações cobre 60% dos ajustes que Amanda hoje faz no Photoshop | Sessão de shadowing: 1-2h vendo Amanda fazer 1 campanha real | David + Amanda | ⚠️ pendente |
| 5 | Marcos pede ajuste em <X% das campanhas hoje (baseline) e os pedidos estão dentro do escopo do editor inline | Catalogar mudanças que Marcos pediu nas últimas 5 campanhas | David + Amanda + Marcos | ⚠️ pendente |
| 6 | A gráfica atual aceita PDF padrão (não pede CMYK/sangria/ICC) | Ligação de 15min direto com a gráfica | David | ⚠️ pendente |
| 7 | Amanda quer ser "libertada" da tarefa, não "valorizada" pela tarefa (incentivo alinhado) | Conversa direta com Amanda sobre percepção do papel | David | ✅ fácil — esposa |
| 8 | Tempo "< 5 min" é o que importa pra Amanda — não "30 min sem retrabalho" | Mesma conversa: pergunta da escolha entre os dois | David | ✅ fácil — esposa |
| 9 | **Validação cega externa**: mostrar peças geradas pra alguém **fora do círculo MSC + David** (designer, dono de outra loja, marketing terceirizado) e capturar reação não-enviesada | Mostrar 3 peças (1 hero, 1 catálogo, 1 social) sem revelar autoria | David | ⚠️ pendente |
| 10 | **Marcos pede ajuste em <X% das campanhas hoje** (baseline real do retrabalho) | Conversa Amanda + revisão dos PSDs históricos | David + Amanda | ⚠️ pendente |

## Estratégia de wedge (primeiro uso real)

A Amanda só vai adotar o MSC-Catalogo se a primeira experiência for **estritamente melhor que a alternativa**. O brief entrega tudo de uma vez (catálogo + 4 formatos sociais + mini-site). Risco: se qualquer pedaço falhar, ela pode descartar o produto inteiro com a desculpa "ferramenta nova bugou".

**Sequência de validação (ordem importa):**

1. **Sprint 0 — validação visual antes do código** (premissa explícita do David):
   - **Prototipar os 4 formatos sociais** (IG / Story / WA / TV) em alta-fidelidade *antes* de codar o renderer pra eles. Pode ser Figma, Photoshop mockup, ou peças geradas manualmente nos estilos finais. **Amanda valida visualmente** que aquilo é o que ela quer ver saindo do produto.
   - Só depois da validação visual aprovada, o renderer dos sociais entra em código.
   - O catálogo PDF não precisa dessa fase porque a referência (`MÊS DAS MÃES.pdf`) já é o gabarito.

2. **Campanha co-pilotada**: na primeira campanha real após o build (Mês das Mães 2027 ou evento mais próximo), David senta ao lado da Amanda e roda o produto **em paralelo** ao Photoshop dela. Não substitui ainda — só prova-se. Amanda compara em tempo real e ganha confiança.

3. **Botão de fallback**: exportar PSD/camadas separadas mesmo no MVP-1, pra ela conseguir terminar no Photoshop quando o editor inline não der conta. Converte "desisti" em "finalizei lá", e a métrica fica contando.

4. **Onboarding-zero**: 1 vídeo de 3min do David rodando uma campanha completa, fixado dentro do app. Canal direto WhatsApp (Amanda ↔ David) declarado pra primeiras 4 campanhas — com a vantagem operacional rara de ser o cônjuge.

5. **Métrica de wedge**: na primeira campanha 100% solo, contar **quantas vezes Amanda abriu o Photoshop em paralelo**. Cada abertura = gap a fechar antes da próxima.

## Riscos conhecidos

| # | Risco | Severidade | Mitigação |
|---|---|---|---|
| 1 | **Acesso à usuária é alto, mas viés cognitivo de cônjuge** — Amanda pode aprovar por afeto, não por mérito; ou exigir mais por proximidade | 🟠 Médio | Não pedir opinião subjetiva como única evidência; medir comportamento (cronômetro, contagem de Photoshop aberto, taxa de retrabalho); ter validação cega externa em ≥1 momento (mostrar peças sem dizer que é teu produto) |
| 2 | **Lojas MSC pode ser específica demais** — generalização SaaS exige mais re-tema do que o esperado | 🟠 Médio | Separação engine/tema desde o dia 1 (no escopo); pasta "tema MSC" separada de "engine" desde o primeiro commit |
| 3 | **Editor inline é must e é o pedaço mais difícil** | 🔴 Alto | MVP-1 mínimo (mover, trocar foto, editar texto, redimensionar), botão "exportar para Photoshop" como fallback explícito |
| 4 | **Custos Vercel/Supabase em USD bancados pelo David** | 🟢 Baixo (no MVP-1) | Monitorar custo mensal; definir teto que dispara revisão (ex.: $50 USD/mês). Vira 🟠 se virar SaaS sem receita |
| 5 | **Direito de imagem dos fornecedores** — informalmente OK pra MSC via Amanda, mas SaaS multi-tenant exige cadeia formal | 🟡 Médio | Manter governança de origem das imagens no MVP-1; antes de SaaS, contratos explícitos com fornecedores ou modelo de upload por cliente |
| 6 | **David é único ponto de falha técnica** — sem runbook, sem backup, sem segundo dev | 🔴 Alto | Documentar runbook desde dia 1; backup automático Supabase; secret-management Vercel; **antes do produto virar dependência operacional da MSC**, ter plano de continuidade |
| 7 | **Marcos cortado do produto** — sem buy-in dele, produto vira "ferramenta da Amanda" | 🟢 Baixo | Decisão consciente do David. Aceito porque MSC é cliente-âncora pessoal, não comercial. Vira 🟡 se for vender SaaS pra outras redes onde o diretor precisa ver valor pra autorizar gasto |
| 8 | **IA generativa de próxima geração** (Gemini, GPT-Image, Adobe Firefly) pode resolver alucinação de logo em 6-12 meses, comoditizando "tema como produto" | 🟡 Baixo-médio | Defensibilidade move pra integração ERP + fluxo + multi-output + diagramação modular (não dependente da limitação atual de IA) |
| 9 | **Cliente-âncora único e por laço pessoal** — funciona pra MVP, mas é base frágil pra concluir que produto tem mercado | 🟠 Médio | Validar com cliente #2 não-pessoal antes de declarar "produto comercial" (asterisco no Vision); usar a relação MSC pra prototipar com velocidade, não pra concluir mercado |
| 10 | **Conflito Lojas MSC vs SaaS genérico** — Amanda (esposa) pede feature MSC-específica que sabota generalização | 🟠 Médio | Política clara: feature MSC-específica vai pra "tema MSC"; engine não acomoda hardcode de cliente. Pode demandar negar pedido da esposa — risco político-doméstico real, vale a pena combinar regra antes de aparecer |
| 11 | **Colapso de fronteira pessoal/profissional** — projeto sem horário, sem entregável formal, sem deadline | 🟠 Médio | Definir cadência clara (ex.: 1 sprint = 2 semanas; reunião semanal de 30min com Amanda; release planejado mensal); separar "casa" de "produto" mesmo sob mesmo teto |
