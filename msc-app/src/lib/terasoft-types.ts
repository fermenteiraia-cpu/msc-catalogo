/**
 * Terasoft API types — the raw product shape returned by the retailer's ERP.
 * This data is external and untrusted; treat the API response as `unknown`
 * and narrow it before mapping into our own `products` rows.
 */

export interface TerasoftProduct {
  CODIGO: string;
  NOME: string;
  GRUPO: string | null;
  SUBGRUPO: string | null;
  GRADE: string | null;
  FORNECEDOR: string | null;
  MARCA: string | null;
  REFERENCIA: string | null;
  SALDO: number | null;
  STATUS: string | null;
  VALORVENDA: number | null;
  PROMOCAO: string | null;
  VALORPROMOCAO: number | null;
  CARACTERISTICA: string | null;
  IMAGEM: string | null;
  ULTIMAALTERACAO: string | null;
}
