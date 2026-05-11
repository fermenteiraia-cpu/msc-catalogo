import { NextResponse } from "next/server";
import { assetStatus } from "@/lib/renderer";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    assets: await assetStatus(),
    env: {
      hasTerasoftCreds: !!process.env.TERASOFT_USER && !!process.env.TERASOFT_PASS,
      hasSupabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    },
  });
}
