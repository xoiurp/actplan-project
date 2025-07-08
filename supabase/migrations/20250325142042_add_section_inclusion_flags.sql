-- Migration: Add section inclusion flags to orders table
-- This allows controlling which sections are included in order total calculations

ALTER TABLE orders ADD COLUMN IF NOT EXISTS include_pendencias_debito BOOLEAN DEFAULT true;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS include_debitos_exig_suspensa BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS include_parcelamentos_siefpar BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS include_pendencias_inscricao BOOLEAN DEFAULT true;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS include_pendencias_parcelamento BOOLEAN DEFAULT true;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS include_simples_nacional BOOLEAN DEFAULT true;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS include_darf BOOLEAN DEFAULT true;

-- Add comments for clarity
COMMENT ON COLUMN orders.include_pendencias_debito IS 'Include Pendências - Débito section in total calculation';
COMMENT ON COLUMN orders.include_debitos_exig_suspensa IS 'Include Débitos com Exigibilidade Suspensa section in total calculation';
COMMENT ON COLUMN orders.include_parcelamentos_siefpar IS 'Include Parcelamentos SIEFPAR section in total calculation';
COMMENT ON COLUMN orders.include_pendencias_inscricao IS 'Include Pendências - Inscrição section in total calculation';
COMMENT ON COLUMN orders.include_pendencias_parcelamento IS 'Include Pendências - Parcelamento section in total calculation';
COMMENT ON COLUMN orders.include_simples_nacional IS 'Include Simples Nacional section in total calculation';
COMMENT ON COLUMN orders.include_darf IS 'Include DARF section in total calculation'; 