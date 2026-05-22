-- =============================================================================
-- MSC-Catalogo — Migration 0006: pipeline de render 3D (arte final)
-- =============================================================================
-- Created: 2026-05-22
--
-- O render da arte final roda no GitHub Actions (gpt-image), porque uma Edge
-- Function do Supabase no plano grátis desliga antes dos ~3 min por página.
-- Mesmo padrão da sincronização da Terasoft.
--
-- Adiciona:
--   1. ENUM render_run_status.
--   2. render_runs — um job de render (dispara o workflow, acompanha progresso).
--   3. catalog_page_renders — a arte gerada de cada página do catálogo.
--
-- Segue o estilo da Migration 0004 (sync_runs): tenant-scoped, RLS.
-- =============================================================================

CREATE TYPE render_run_status AS ENUM (
  'queued',
  'running',
  'success',
  'failed'
);

-- -----------------------------------------------------------------------------
-- render_runs — execução de um render (cada clique em "Gerar arte final")
-- -----------------------------------------------------------------------------
CREATE TABLE render_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  catalog_id UUID NOT NULL REFERENCES catalogs(id) ON DELETE CASCADE,

  triggered_by TEXT NOT NULL,
  triggered_by_user_id UUID REFERENCES auth.users(id),

  github_run_id TEXT,
  github_run_url TEXT,

  status render_run_status NOT NULL DEFAULT 'queued',
  pages_total INTEGER NOT NULL DEFAULT 0,
  pages_done INTEGER NOT NULL DEFAULT 0,
  error JSONB,

  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_render_runs_catalog ON render_runs(catalog_id, started_at DESC);
CREATE INDEX idx_render_runs_status ON render_runs(status);

COMMENT ON TABLE render_runs IS 'Cada execução de render da arte final (GitHub Actions + gpt-image).';

-- -----------------------------------------------------------------------------
-- catalog_page_renders — a arte 3D gerada, uma linha por página do catálogo
-- -----------------------------------------------------------------------------
CREATE TABLE catalog_page_renders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  catalog_id UUID NOT NULL REFERENCES catalogs(id) ON DELETE CASCADE,
  render_run_id UUID REFERENCES render_runs(id) ON DELETE SET NULL,

  page_index INTEGER NOT NULL,            -- 0 = capa
  page_kind TEXT NOT NULL DEFAULT 'products',  -- 'cover' | 'products'
  status TEXT NOT NULL DEFAULT 'pending', -- pending | rendering | ready | failed
  image_url TEXT,
  storage_path TEXT,
  error JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (catalog_id, page_index)
);

CREATE INDEX idx_catalog_page_renders_catalog
  ON catalog_page_renders(catalog_id, page_index);

COMMENT ON TABLE catalog_page_renders IS 'Arte final 3D de cada página do catálogo (gerada pelo gpt-image).';

-- -----------------------------------------------------------------------------
-- RLS — mesmo padrão tenant_isolation das outras tabelas
-- -----------------------------------------------------------------------------
ALTER TABLE render_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON render_runs
  FOR ALL
  USING (tenant_id IN (SELECT current_user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT current_user_tenant_ids()));

ALTER TABLE catalog_page_renders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON catalog_page_renders
  FOR ALL
  USING (tenant_id IN (SELECT current_user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT current_user_tenant_ids()));

-- -----------------------------------------------------------------------------
-- Bucket de Storage pras artes renderizadas (público pra leitura)
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('catalog-renders', 'catalog-renders', TRUE)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Audit log da migração
-- -----------------------------------------------------------------------------
INSERT INTO audit_log (tenant_id, entity_type, entity_id, action, actor, changes)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'system_migration',
  NULL,
  'create',
  'system',
  jsonb_build_object(
    'migration', '0006_render_pipeline',
    'description',
    'Added render_run_status, render_runs, catalog_page_renders + catalog-renders bucket.'
  )
);

-- =============================================================================
-- FIM da Migration 0006
-- =============================================================================
