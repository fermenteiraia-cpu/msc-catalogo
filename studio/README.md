# MSC Studio

Sistema oficial de criação de campanhas das Lojas MSC.
Stack: **Next.js 14** + **Supabase** + **Vercel** + renderer em **TypeScript** (sharp + @napi-rs/canvas).

---

## Status

✅ Renderer em TS funcionando (4 formatos de produto + hero)
✅ Cliente da API Terasoft
✅ Carregador de assets de marca
✅ Página de testes rápidos
🚧 7 telas da UI (próxima rodada)
🚧 Integração Supabase (próxima rodada)
🚧 Deploy Vercel (próxima rodada)

---

## Setup local (primeira vez)

```bash
# 1) instala dependências
npm install

# 2) configura variáveis de ambiente
cp .env.example .env.local
# (edita .env.local — Terasoft já vem preenchido; Supabase deixa vazio por enquanto)

# 3) roda em dev
npm run dev
# Abre http://localhost:3000
```

A pasta de assets de marca (`mascote_msc.png`, `logo_msc.png`, `logo_msc_branco.png`)
deve estar **um nível acima do projeto** (em `../`) — que é a pasta `msc_brand/`.

---

## Testes rápidos

Depois de subir com `npm run dev`, acesse no navegador:

- http://localhost:3000 — página inicial com links de teste
- http://localhost:3000/api/health — verifica conexão e assets
- http://localhost:3000/api/render-test?fmt=ig&codigo=000002 — IG da Midea
- http://localhost:3000/api/render-test?fmt=story&codigo=000003 — Story Consul
- http://localhost:3000/api/render-test?fmt=tv&codigo=000004 — TV Samsung
- http://localhost:3000/api/render-test?fmt=hero — hero da campanha

---

## Estrutura

```
studio/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   └── api/
│   │       ├── health/route.ts
│   │       └── render-test/route.ts
│   └── lib/
│       ├── terasoft/index.ts          ← cliente da API
│       └── renderer/
│           ├── index.ts
│           ├── canvas-utils.ts        ← helpers (fontes, sharp, gradient, money)
│           ├── text3d.ts              ← lettering 3D extrudido
│           ├── hearts.ts              ← decoração de fundo
│           ├── assets-loader.ts       ← carrega mascote/logo com bg removal
│           ├── produto.ts             ← renderiza IG/Story/WA/TV
│           └── hero.ts                ← renderiza hero da campanha
├── public/                            ← coloque fontes Lato aqui (opcional)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs
└── README.md
```

---

## Próximas rodadas

### Rodada 2 — Supabase + UI
1. Criar projeto Supabase (free tier, região São Paulo)
2. Rodar SQL de migração (será fornecido)
3. Implementar telas 1-7 do mockup com componentes React
4. CRUD de projetos via Server Actions

### Rodada 3 — Deploy
1. Push para GitHub
2. Conectar Vercel ao repo
3. Configurar env vars na Vercel
4. Domínio custom (opcional)

---

## Fontes

Para resultado idêntico ao Python (Lato), baixe as fontes:
- https://fonts.google.com/specimen/Lato
- Coloque os arquivos `Lato-Black.ttf`, `Lato-Bold.ttf`, `Lato-Regular.ttf`
  em `public/fonts/`
- O renderer detecta automaticamente

Sem isso, ele usa Arial Black / Arial / fontes do sistema (resultado próximo mas não idêntico).
