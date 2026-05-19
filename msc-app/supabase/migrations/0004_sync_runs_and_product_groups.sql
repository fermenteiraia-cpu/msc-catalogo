-- =============================================================================
-- MSC-Catalogo — Migration 0004: sync_runs table + product groups + piece fields
-- =============================================================================
-- Created: 2026-05-18 (post-pivot to Vite + GitHub Actions sync architecture)
--
-- Adds:
--   1. products.grupo / products.subgrupo — Terasoft GRUPO/SUBGRUPO separated
--      (Migration 0001 collapsed both into `category`; we now need them apart
--      so the Tela 3 mockup filters can offer both levels).
--   2. products.last_sync_run_id — which sync run set the row, for audit/debug.
--   3. pieces.desconto_percent / pieces.parcelas / pieces.is_destaque — per-piece
--      pricing controls that the mockup-approved Tela 3 requires.
--   4. NEW TABLE: sync_runs — tracks each Terasoft sync execution so the UI can
--      show "Última sync às X" + "Sync em andamento" + audit. Replaces the
--      ad-hoc "synced_at column on products" pattern.
--
-- Following Migration 0001 style: pgcrypto enabled, tenant-scoped, RLS-ready.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ENUM: sync_run_status
-- -----------------------------------------------------------------------------
CREATE TYPE sync_run_status AS ENUM (
  'running',
  'success',
  'failed'
);

-- -----------------------------------------------------------------------------
-- 2. products — add Terasoft hierarchy + run pointer
-- -----------------------------------------------------------------------------
ALTER TABLE products
  ADD COLUMN grupo TEXT,
  ADD COLUMN subgrupo TEXT,
  ADD COLUMN last_sync_run_id UUID;

CREATE INDEX idx_products_grupo ON products(tenant_id, grupo) WHERE grupo IS NOT NULL;
CREATE INDEX idx_products_subgrupo ON products(tenant_id, subgrupo) WHERE subgrupo IS NOT NULL;

COMMENT ON COLUMN products.grupo IS 'Terasoft GRUPO (top level), e.g. "ELETRO".';
COMMENT ON COLUMN products.subgrupo IS 'Terasoft SUBGRUPO (second level), e.g. "LINHA BRANCA".';
COMMENT ON COLUMN products.last_sync_run_id IS 'FK to sync_runs(id) of the run that last wrote this row.';

-- -----------------------------------------------------------------------------
-- 3. pieces — per-piece pricing controls (from mockup Tela 3)
-- -----------------------------------------------------------------------------
ALTER TABLE pieces
  ADD COLUMN desconto_percent NUMERIC(5, 2) NOT NULL DEFAULT 0
    CHECK (desconto_percent >= 0 AND desconto_percent <= 100),
  ADD COLUMN parcelas INTEGER NOT NULL DEFAULT 10
    CHECK (parcelas >= 1 AND parcelas <= 24),
  ADD COLUMN is_destaque BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN pieces.desconto_percent IS 'Discount % applied to this product on this catalog (0-100).';
COMMENT ON COLUMN pieces.parcelas IS 'Installments shown for this product on this catalog (1-24).';
COMMENT ON COLUMN pieces.is_destaque IS 'Marked as highlight — becomes a standalone Insta/WhatsApp piece.';

-- -----------------------------------------------------------------------------
-- 4. sync_runs — execution log for the Terasoft sync workflow
-- -----------------------------------------------------------------------------
CREATE TABLE sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Who/what triggered it
  triggered_by TEXT NOT NULL,  -- 'cron' or 'user:<uuid>'
  triggered_by_user_id UUID REFERENCES auth.users(id),

  -- GitHub Action linkage (filled in after dispatch)
  github_run_id TEXT,
  github_run_url TEXT,

  -- State
  status sync_run_status NOT NULL DEFAULT 'running',
  products_synced INTEGER NOT NULL DEFAULT 0,
  products_skipped INTEGER NOT NULL DEFAULT 0,
  error JSONB,

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_sync_runs_tenant_started ON sync_runs(tenant_id, started_at DESC);
CREATE INDEX idx_sync_runs_status ON sync_runs(status);

COMMENT ON TABLE sync_runs IS 'Each Terasoft sync execution (cron or manual). Drives the UI "última sync" + audit.';

-- -----------------------------------------------------------------------------
-- 5. FK from products.last_sync_run_id → sync_runs.id (added now that the table exists)
-- -----------------------------------------------------------------------------
ALTER TABLE products
  ADD CONSTRAINT products_last_sync_run_id_fkey
    FOREIGN KEY (last_sync_run_id) REFERENCES sync_runs(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- 6. RLS on sync_runs (same tenant_isolation pattern as the other tables)
-- -----------------------------------------------------------------------------
ALTER TABLE sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON sync_runs
  FOR ALL
  USING (tenant_id IN (SELECT current_user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT current_user_tenant_ids()));

-- -----------------------------------------------------------------------------
-- 7. Audit log entry for the migration itself
-- -----------------------------------------------------------------------------
INSERT INTO audit_log (tenant_id, entity_type, entity_id, action, actor, changes)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'system_migration',
  NULL,
  'create',
  'system',
  jsonb_build_object(
    'migration', '0004_sync_runs_and_product_groups',
    'description',
    'Added products.grupo/subgrupo/last_sync_run_id, pieces.desconto_percent/parcelas/is_destaque, sync_runs table + RLS.'
  )
);

-- =============================================================================
-- FIM da Migration 0004
-- =============================================================================
