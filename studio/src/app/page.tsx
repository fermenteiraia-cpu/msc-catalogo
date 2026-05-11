import Link from "next/link";

export default function Home() {
  return (
    <main className="max-w-3xl mx-auto p-8">
      <header className="flex items-center gap-3 mb-8">
        <span className="w-7 h-7 rounded bg-msc-blue flex items-center justify-center text-white text-xs font-bold">M</span>
        <h1 className="text-xl font-semibold">lojas msc · studio</h1>
      </header>

      <section className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Mini app oficial — fase 1</h2>
        <p className="text-sm text-gray-600 mb-4">
          Esta é a base do sistema oficial em Next.js + Supabase + Vercel. Por enquanto temos:
        </p>
        <ul className="text-sm space-y-1 list-disc pl-6 text-gray-700">
          <li>Renderer em TypeScript (sharp + canvas) — equivalente ao Python</li>
          <li>Cliente da API Terasoft</li>
          <li>Carregador de assets de marca com remoção de fundo</li>
        </ul>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="text-base font-semibold mb-3">Testes rápidos</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/api/health" className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50">/api/health</Link>
          <Link href="/api/render-test?fmt=ig&codigo=000002" className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50">render IG (Midea)</Link>
          <Link href="/api/render-test?fmt=story&codigo=000003" className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50">render Story (Consul)</Link>
          <Link href="/api/render-test?fmt=tv&codigo=000004" className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50">render TV (Samsung)</Link>
          <Link href="/api/render-test?fmt=hero" className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50">render Hero</Link>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Cada link abre uma imagem renderizada na hora pelo backend. Primeiro hit pode demorar (cold start de fonts/cache).
        </p>
      </section>

      <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
        <strong className="font-semibold">Próximos passos:</strong>
        <ol className="list-decimal pl-6 mt-2 space-y-1 text-amber-900">
          <li>Validar que os 4 testes acima geram imagem correta</li>
          <li>Implementar as 7 telas da UI (Projetos, Briefing, Marca, Produtos, Descontos, Preview, Editor)</li>
          <li>Conectar ao Supabase (banco + storage + auth)</li>
          <li>Deploy na Vercel</li>
        </ol>
      </section>
    </main>
  );
}
