-- =============================================================================
-- MSC-Catalogo — Migration 0006: pieces display overrides
-- =============================================================================
-- Adiciona campos de override por peça pra Amanda/Sally ajustarem o que vai
-- aparecer no esboço SEM mexer no produto-mestre da Terasoft:
--   display_name      — sobrescreve products.name (ex: encurtar nome longo)
--   display_image_url — sobrescreve products.image_url (foto melhor)
--   badge_label       — tarja opcional ("NOVIDADE", "ÚLTIMAS UNIDADES")
-- O renderer (render_catalog_html.py) usa o override quando preenchido,
-- senão cai pro valor padrão.
-- =============================================================================

ALTER TABLE pieces
  ADD COLUMN display_name TEXT,
  ADD COLUMN display_image_url TEXT,
  ADD COLUMN badge_label TEXT;

COMMENT ON COLUMN pieces.display_name IS
  'Sobrescreve products.name no render. NULL = usa o nome do produto.';
COMMENT ON COLUMN pieces.display_image_url IS
  'Sobrescreve products.image_url no render. NULL = usa a foto do produto.';
COMMENT ON COLUMN pieces.badge_label IS
  'Tarja opcional pra destacar a peça no render (ex: "NOVIDADE").';

INSERT INTO audit_log (tenant_id, entity_type, entity_id, action, actor, changes)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'system_migration',
  NULL,
  'create',
  'system',
  jsonb_build_object(
    'migration', '0006_piece_display_overrides',
    'description',
    'Added pieces.display_name, display_image_url, badge_label for per-piece render overrides.'
  )
);
