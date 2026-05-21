-- =============================================================================
-- MSC-Catalogo — Migration 0005: pieces.preco_final_override
-- =============================================================================
-- Created: 2026-05-21 (Tela 4 — Editor inline)
--
-- Adds:
--   pieces.preco_final_override — the Editor (Tela 4) lets Amanda type a final
--   price by hand ("Edita aqui se Marcos pediu mudança", mockup linha 1734).
--   NULL means "use the computed price" (price_cash × (1 - desconto_percent)).
--   The price-audit panel ("Conferência dos preços", mockup linhas 1758-1768)
--   counts how many pieces have a non-NULL override → "Você ajustou na mão: N".
--
-- Following Migration 0004 style: tenant-scoped, RLS already on pieces.
-- =============================================================================

ALTER TABLE pieces
  ADD COLUMN preco_final_override NUMERIC(12, 2)
    CHECK (preco_final_override IS NULL OR preco_final_override >= 0);

COMMENT ON COLUMN pieces.preco_final_override IS
  'Manual final-price override set in the Editor (Tela 4). NULL = use computed price (price_cash * (1 - desconto_percent/100)).';

-- -----------------------------------------------------------------------------
-- Audit log entry for the migration itself
-- -----------------------------------------------------------------------------
INSERT INTO audit_log (tenant_id, entity_type, entity_id, action, actor, changes)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'system_migration',
  NULL,
  'create',
  'system',
  jsonb_build_object(
    'migration', '0005_piece_price_override',
    'description',
    'Added pieces.preco_final_override for the Editor manual price field (Tela 4).'
  )
);

-- =============================================================================
-- FIM da Migration 0005
-- =============================================================================
