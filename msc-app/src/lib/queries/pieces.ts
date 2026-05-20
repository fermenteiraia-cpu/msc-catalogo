import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { TENANT_ID } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { err, ok, type AppError, type Result } from "@/lib/result";
import type { ProductRow } from "@/lib/queries/products";

export interface PieceRow {
  id: string;
  catalog_id: string;
  tenant_id: string;
  position: number;
  size_class: string;
  status: string;
  product_codes: string[];
  desconto_percent: number;
  parcelas: number;
  is_destaque: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Piece joined with its (first) product. The product lookup is done in memory
 * after one bulk `.in()` query, keeping the round trip count to two.
 */
export interface PieceWithProduct {
  id: string;
  catalog_id: string;
  position: number;
  desconto_percent: number;
  parcelas: number;
  is_destaque: boolean;
  product_codes: string[];
  product: ProductRow | null;
}

/**
 * Fetches all pieces for a catalog, ordered by position, and resolves each
 * piece's first product code into a full product row.
 */
export function useCatalogPieces(catalogId: string | undefined) {
  return useQuery({
    queryKey: ["catalog-pieces", catalogId ?? null],
    enabled: Boolean(catalogId),
    queryFn: async (): Promise<PieceWithProduct[]> => {
      if (!catalogId) return [];

      const { data: pieceData, error: pieceError } = await supabase
        .from("pieces")
        .select(
          "id,catalog_id,tenant_id,position,size_class,status,product_codes,desconto_percent,parcelas,is_destaque,created_at,updated_at",
        )
        .eq("catalog_id", catalogId)
        .order("position", { ascending: true });

      if (pieceError) throw new Error(pieceError.message);

      const pieces = (pieceData ?? []) as unknown as PieceRow[];
      if (pieces.length === 0) return [];

      // Collect every code present in any piece, dedupe, fetch in ONE query.
      const codes = Array.from(
        new Set(
          pieces.flatMap((p) =>
            Array.isArray(p.product_codes) ? p.product_codes : [],
          ),
        ),
      );

      let products: ProductRow[] = [];
      if (codes.length > 0) {
        const { data: prodData, error: prodError } = await supabase
          .from("products")
          .select(
            "id,terasoft_code,name,grupo,subgrupo,brand,category,price_cash,image_url,is_available",
          )
          .in("terasoft_code", codes);

        if (prodError) throw new Error(prodError.message);
        products = (prodData ?? []) as unknown as ProductRow[];
      }

      const byCode = new Map<string, ProductRow>();
      for (const p of products) byCode.set(p.terasoft_code, p);

      return pieces.map<PieceWithProduct>((piece) => {
        const firstCode = piece.product_codes?.[0];
        return {
          id: piece.id,
          catalog_id: piece.catalog_id,
          position: piece.position,
          desconto_percent: Number(piece.desconto_percent ?? 0),
          parcelas: Number(piece.parcelas ?? 10),
          is_destaque: Boolean(piece.is_destaque),
          product_codes: piece.product_codes ?? [],
          product: firstCode ? (byCode.get(firstCode) ?? null) : null,
        };
      });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

export interface AddPieceInput {
  catalogId: string;
  terasoftCode: string;
}

export interface AddPieceOutput {
  pieceId: string;
}

/**
 * Adds a product to the catalog as a new piece at the next position.
 * Guards against double-add (same terasoft_code already in any piece).
 */
export function useAddPieceToCatalog() {
  const queryClient = useQueryClient();

  return useMutation({
    // Optimistic update: insert a placeholder piece into the cache so the
    // UI reflects the selection instantly (no double-click illusion).
    // The placeholder is replaced when the real row arrives via invalidate.
    onMutate: async (input: AddPieceInput) => {
      const key = ["catalog-pieces", input.catalogId];
      await queryClient.cancelQueries({ queryKey: key });
      const previous =
        queryClient.getQueryData<PieceWithProduct[]>(key) ?? [];

      // Guard: if already there (race), bail out — server will reject too.
      if (previous.some((p) => p.product_codes.includes(input.terasoftCode))) {
        return { previous };
      }

      const nextPosition =
        previous.reduce((acc, p) => (p.position > acc ? p.position : acc), 0) + 1;

      const tempPiece: PieceWithProduct = {
        id: `optimistic-${input.terasoftCode}`,
        catalog_id: input.catalogId,
        position: nextPosition,
        desconto_percent: 0,
        parcelas: 10,
        is_destaque: false,
        product_codes: [input.terasoftCode],
        product: null, // server-side join will fill this in
      };

      queryClient.setQueryData<PieceWithProduct[]>(key, [...previous, tempPiece]);
      return { previous };
    },
    onError: (_err, input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["catalog-pieces", input.catalogId],
          context.previous,
        );
      }
    },
    mutationFn: async (
      input: AddPieceInput,
    ): Promise<Result<AddPieceOutput, AppError>> => {
      const { catalogId, terasoftCode } = input;

      // 1) Load current pieces (just position + product_codes) for guard + next position.
      const { data: existing, error: existingError } = await supabase
        .from("pieces")
        .select("position,product_codes")
        .eq("catalog_id", catalogId);

      if (existingError) {
        return err({
          code: "PIECE_LOOKUP_FAILED",
          message: "Erro ao verificar peças existentes. Tente de novo.",
          retryable: true,
          details: existingError,
        });
      }

      const rows = (existing ?? []) as unknown as Array<{
        position: number;
        product_codes: string[] | null;
      }>;

      const alreadyAdded = rows.some((row) =>
        (row.product_codes ?? []).includes(terasoftCode),
      );
      if (alreadyAdded) {
        return err({
          code: "PRODUCT_ALREADY_ADDED",
          message: "Esse produto já está no catálogo.",
        });
      }

      const maxPos = rows.reduce(
        (acc, row) => (row.position > acc ? row.position : acc),
        0,
      );
      const nextPosition = maxPos + 1;

      // 2) Insert.
      const { data: inserted, error: insertError } = await supabase
        .from("pieces")
        .insert({
          catalog_id: catalogId,
          tenant_id: TENANT_ID,
          position: nextPosition,
          size_class: "M",
          status: "pending",
          product_codes: [terasoftCode],
          desconto_percent: 0,
          parcelas: 10,
          is_destaque: false,
        })
        .select("id")
        .single();

      if (insertError || !inserted) {
        return err({
          code: "PIECE_INSERT_FAILED",
          message: "Não foi possível adicionar o produto. Tente de novo.",
          retryable: true,
          details: insertError,
        });
      }

      const row = inserted as unknown as { id: string };
      return ok({ pieceId: row.id });
    },
    onSuccess: (result, variables) => {
      if (result.ok) {
        queryClient.invalidateQueries({
          queryKey: ["catalog-pieces", variables.catalogId],
        });
      }
    },
  });
}

export interface RemovePieceInput {
  pieceId: string;
  catalogId: string;
}

export function useRemovePiece() {
  const queryClient = useQueryClient();

  return useMutation({
    // Optimistic: remove from cache immediately.
    onMutate: async (input: RemovePieceInput) => {
      const key = ["catalog-pieces", input.catalogId];
      await queryClient.cancelQueries({ queryKey: key });
      const previous =
        queryClient.getQueryData<PieceWithProduct[]>(key) ?? [];
      queryClient.setQueryData<PieceWithProduct[]>(
        key,
        previous.filter((p) => p.id !== input.pieceId),
      );
      return { previous };
    },
    onError: (_err, input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["catalog-pieces", input.catalogId],
          context.previous,
        );
      }
    },
    mutationFn: async (
      input: RemovePieceInput,
    ): Promise<Result<{ pieceId: string }, AppError>> => {
      const { error } = await supabase
        .from("pieces")
        .delete()
        .eq("id", input.pieceId);

      if (error) {
        return err({
          code: "PIECE_DELETE_FAILED",
          message: "Não foi possível remover o produto. Tente de novo.",
          retryable: true,
          details: error,
        });
      }
      return ok({ pieceId: input.pieceId });
    },
    onSuccess: (result, variables) => {
      if (result.ok) {
        queryClient.invalidateQueries({
          queryKey: ["catalog-pieces", variables.catalogId],
        });
      }
    },
  });
}

export const piecePatchSchema = z
  .object({
    desconto_percent: z.number().min(0).max(100).optional(),
    parcelas: z.number().int().min(1).max(24).optional(),
    is_destaque: z.boolean().optional(),
  })
  .refine(
    (patch) =>
      patch.desconto_percent !== undefined ||
      patch.parcelas !== undefined ||
      patch.is_destaque !== undefined,
    { message: "É preciso fornecer ao menos um campo pra atualizar." },
  );

export type PiecePatch = z.infer<typeof piecePatchSchema>;

export interface UpdatePieceInput {
  pieceId: string;
  catalogId: string;
  patch: PiecePatch;
}

export function useUpdatePiece() {
  const queryClient = useQueryClient();

  return useMutation({
    // Optimistic: merge the patch into the cached piece so desconto / parcelas
    // inputs feel instant.
    onMutate: async (input: UpdatePieceInput) => {
      const key = ["catalog-pieces", input.catalogId];
      await queryClient.cancelQueries({ queryKey: key });
      const previous =
        queryClient.getQueryData<PieceWithProduct[]>(key) ?? [];
      queryClient.setQueryData<PieceWithProduct[]>(
        key,
        previous.map((p) =>
          p.id === input.pieceId
            ? {
                ...p,
                ...(input.patch.desconto_percent !== undefined && {
                  desconto_percent: input.patch.desconto_percent,
                }),
                ...(input.patch.parcelas !== undefined && {
                  parcelas: input.patch.parcelas,
                }),
                ...(input.patch.is_destaque !== undefined && {
                  is_destaque: input.patch.is_destaque,
                }),
              }
            : p,
        ),
      );
      return { previous };
    },
    onError: (_err, input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["catalog-pieces", input.catalogId],
          context.previous,
        );
      }
    },
    mutationFn: async (
      input: UpdatePieceInput,
    ): Promise<Result<{ pieceId: string }, AppError>> => {
      const parsed = piecePatchSchema.safeParse(input.patch);
      if (!parsed.success) {
        return err({
          code: "PIECE_PATCH_INVALID",
          message:
            "Valores inválidos. Confira desconto (0-100), parcelas (1-24) e destaque.",
          details: parsed.error.flatten(),
        });
      }

      const { error } = await supabase
        .from("pieces")
        .update(parsed.data)
        .eq("id", input.pieceId);

      if (error) {
        return err({
          code: "PIECE_UPDATE_FAILED",
          message: "Não foi possível salvar a alteração. Tente de novo.",
          retryable: true,
          details: error,
        });
      }
      return ok({ pieceId: input.pieceId });
    },
    onSuccess: (result, variables) => {
      if (result.ok) {
        queryClient.invalidateQueries({
          queryKey: ["catalog-pieces", variables.catalogId],
        });
      }
    },
  });
}

export const bulkApplySchema = z.object({
  desconto_percent: z.number().min(0).max(100),
  parcelas: z.number().int().min(1).max(24),
});

export type BulkApplyInput = z.infer<typeof bulkApplySchema> & {
  catalogId: string;
};

export function useBulkApplyPricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: BulkApplyInput,
    ): Promise<Result<{ catalogId: string }, AppError>> => {
      const parsed = bulkApplySchema.safeParse({
        desconto_percent: input.desconto_percent,
        parcelas: input.parcelas,
      });
      if (!parsed.success) {
        return err({
          code: "BULK_APPLY_INVALID",
          message:
            "Confira os valores: desconto entre 0 e 100, parcelas entre 1 e 24.",
          details: parsed.error.flatten(),
        });
      }

      const { error } = await supabase
        .from("pieces")
        .update(parsed.data)
        .eq("catalog_id", input.catalogId);

      if (error) {
        return err({
          code: "BULK_APPLY_FAILED",
          message: "Não foi possível aplicar a todos. Tente de novo.",
          retryable: true,
          details: error,
        });
      }
      return ok({ catalogId: input.catalogId });
    },
    onSuccess: (result, variables) => {
      if (result.ok) {
        queryClient.invalidateQueries({
          queryKey: ["catalog-pieces", variables.catalogId],
        });
      }
    },
  });
}

/* ------------------------------------------------------------------ */
/* Reorder (prepared for future — NOT wired to UI in this delivery)    */
/* ------------------------------------------------------------------ */

export interface MovePieceInput {
  pieceId: string;
  direction: "up" | "down";
  catalogId: string;
}

const SENTINEL_POSITION = -1;

/**
 * Reorders a piece up/down by swapping positions with its neighbor.
 * Uses a sentinel (-1) intermediate value so the UNIQUE(catalog_id, position)
 * constraint never trips during the swap.
 *
 * NOT wired to the UI in this delivery — kept for the future drag-and-drop
 * (or up/down buttons) without rewriting the data layer.
 */
export function useMovePiece() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: MovePieceInput,
    ): Promise<Result<{ pieceId: string }, AppError>> => {
      const { pieceId, direction, catalogId } = input;

      const { data: pieces, error: loadError } = await supabase
        .from("pieces")
        .select("id,position")
        .eq("catalog_id", catalogId)
        .order("position", { ascending: true });

      if (loadError) {
        return err({
          code: "MOVE_LOAD_FAILED",
          message: "Erro ao carregar peças. Tente de novo.",
          retryable: true,
          details: loadError,
        });
      }

      const rows = (pieces ?? []) as unknown as Array<{
        id: string;
        position: number;
      }>;
      const idx = rows.findIndex((r) => r.id === pieceId);
      if (idx < 0) {
        return err({
          code: "MOVE_PIECE_NOT_FOUND",
          message: "Peça não encontrada.",
        });
      }

      const neighborIdx = direction === "up" ? idx - 1 : idx + 1;
      if (neighborIdx < 0 || neighborIdx >= rows.length) {
        return ok({ pieceId }); // already at the edge, no-op
      }

      const current = rows[idx];
      const neighbor = rows[neighborIdx];

      // Sentinel-swap so the UNIQUE constraint stays satisfied.
      const { error: e1 } = await supabase
        .from("pieces")
        .update({ position: SENTINEL_POSITION })
        .eq("id", current.id);
      if (e1) {
        return err({
          code: "MOVE_STEP1_FAILED",
          message: "Erro ao reordenar. Tente de novo.",
          retryable: true,
          details: e1,
        });
      }

      const { error: e2 } = await supabase
        .from("pieces")
        .update({ position: current.position })
        .eq("id", neighbor.id);
      if (e2) {
        return err({
          code: "MOVE_STEP2_FAILED",
          message: "Erro ao reordenar. Tente de novo.",
          retryable: true,
          details: e2,
        });
      }

      const { error: e3 } = await supabase
        .from("pieces")
        .update({ position: neighbor.position })
        .eq("id", current.id);
      if (e3) {
        return err({
          code: "MOVE_STEP3_FAILED",
          message: "Erro ao reordenar. Tente de novo.",
          retryable: true,
          details: e3,
        });
      }

      return ok({ pieceId });
    },
    onSuccess: (result, variables) => {
      if (result.ok) {
        queryClient.invalidateQueries({
          queryKey: ["catalog-pieces", variables.catalogId],
        });
      }
    },
  });
}
