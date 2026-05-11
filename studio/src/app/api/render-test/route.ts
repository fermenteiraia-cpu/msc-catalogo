import { NextRequest, NextResponse } from "next/server";
import { renderProduto, renderHero, type Formato } from "@/lib/renderer";
import { buscarProduto } from "@/lib/terasoft";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fmt = searchParams.get("fmt") ?? "ig";
  const codigo = searchParams.get("codigo") ?? "000002";

  try {
    let buf: Buffer;
    if (fmt === "hero") {
      buf = await renderHero({});
    } else {
      const produto = await buscarProduto(codigo);
      if (!produto) {
        return NextResponse.json({ error: `produto ${codigo} nao encontrado` }, { status: 404 });
      }
      const valorAvista = Number(produto.VALORVENDA ?? 0);
      const desconto = Number(searchParams.get("desconto") ?? 24);
      const valorPromo = +(valorAvista * (1 - desconto / 100)).toFixed(2);
      const parcelas = Number(searchParams.get("parcelas") ?? 10);
      buf = await renderProduto({
        produto,
        valorAvista,
        valorPromo,
        parcelas,
        fmt: fmt as Formato,
      });
    }
    return new NextResponse(buf, {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
