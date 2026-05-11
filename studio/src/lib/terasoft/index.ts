/**
 * Cliente da API Terasoft (Lojas MSC).
 */
import fs from "fs";
import path from "path";

export interface TerasoftProduto {
  CODIGO: string;
  NOME: string;
  GRUPO: string;
  SUBGRUPO: string;
  GRADE: string;
  FORNECEDOR: string;
  MARCA: string;
  REFERENCIA: string;
  SALDO: number | null;
  STATUS: string;
  VALORVENDA: number | null;
  PROMOCAO: string | null;
  VALORPROMOCAO: number | null;
  CARACTERISTICA: string | null;
  IMAGEM: string;
  ULTIMAALTERACAO: string;
}

// Credenciais SEMPRE vêm de env vars — nunca hardcoded.
// Local: configure em studio/.env.local (ver .env.example).
// Vercel: configure em Project Settings → Environment Variables.
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Variável de ambiente ${name} não está definida. ` +
      `Configure em studio/.env.local (local) ou Vercel Env Vars (produção). ` +
      `Veja studio/.env.example.`
    );
  }
  return v;
}

const URL = process.env.TERASOFT_URL ?? "https://apiserver.ip.inf.br:12067/consulta";
const USER = requireEnv("TERASOFT_USER");
const PASS = requireEnv("TERASOFT_PASS");

const CACHE_DIR = path.resolve(process.cwd(), ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "produtos.json");
const IMG_CACHE = path.join(CACHE_DIR, "imagens");

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
if (!fs.existsSync(IMG_CACHE)) fs.mkdirSync(IMG_CACHE, { recursive: true });

let MEM_CACHE: TerasoftProduto[] | null = null;

async function fetchAllowingSelfSigned(url: string, options: RequestInit = {}) {
  // Node 18+ ja tem fetch global. A API tem certificado self-signed.
  // Para Vercel/produção, o cert deveria ser válido. Se necessário, podemos
  // configurar NODE_TLS_REJECT_UNAUTHORIZED=0 ou usar undici Agent.
  const agent: any =
    process.env.NODE_ENV !== "production"
      ? // eslint-disable-next-line @typescript-eslint/no-var-requires
        new (require("https").Agent)({ rejectUnauthorized: false })
      : undefined;
  const opts: any = { ...options };
  if (agent) opts.agent = agent;
  // @ts-ignore - agent não é parte dos tipos do fetch padrão
  return fetch(url, opts);
}

export async function consultarProdutos(opts: { force?: boolean } = {}): Promise<TerasoftProduto[]> {
  if (!opts.force && MEM_CACHE) return MEM_CACHE;
  if (!opts.force && fs.existsSync(CACHE_FILE)) {
    const data = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    MEM_CACHE = data;
    return data;
  }
  const ultimaalt = "2020-01-01 00:00:00";
  const u = new URL(URL);
  u.searchParams.set("ep", "PRODUTOS");
  u.searchParams.set("ultimaalteracao", ultimaalt);
  const auth = Buffer.from(`${USER}:${PASS}`).toString("base64");
  const r = await fetchAllowingSelfSigned(u.toString(), {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!r.ok) throw new Error(`Terasoft ${r.status}: ${await r.text()}`);
  const data = (await r.json()) as TerasoftProduto[];
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
  MEM_CACHE = data;
  return data;
}

export async function buscarProduto(codigo: string): Promise<TerasoftProduto | null> {
  const ps = await consultarProdutos();
  const c = String(codigo).padStart(6, "0");
  return ps.find((p) => p.CODIGO === c) ?? null;
}

export async function baixarImagem(produto: TerasoftProduto): Promise<string | null> {
  if (!produto.IMAGEM) return null;
  const local = path.join(IMG_CACHE, `${produto.CODIGO}.jpg`);
  if (fs.existsSync(local) && fs.statSync(local).size > 0) return local;
  try {
    const r = await fetchAllowingSelfSigned(produto.IMAGEM);
    const ct = r.headers.get("content-type") || "";
    if (!r.ok || !ct.startsWith("image")) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(local, buf);
    return local;
  } catch {
    return null;
  }
}
