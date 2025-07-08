-- Migration: Add missing fields to order_items table for SIDA and other tax types
-- Description: Adds all missing fields referenced in the OrderItem interface but not present in the database

-- Add denominacao column for tax descriptions (especially DARF)
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS denominacao text;

-- Add CNPJ column for general use
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS cnpj text;

-- Add SIDA-specific fields
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS inscricao text;

ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS receita text;

ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS inscrito_em text;

ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS ajuizado_em text;

ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS processo text;

ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS tipo_devedor text;

ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS devedor_principal text;

-- Add SIEFPAR-specific fields
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS parcelamento text;

ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS valor_suspenso numeric;

ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS modalidade text;

-- Add SISPAR-specific fields 
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS sispar_conta text;

ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS sispar_descricao text;

ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS sispar_modalidade text;

-- Add consolidated balance field
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS saldo_devedor_consolidado numeric;

-- Add comments for documentation
COMMENT ON COLUMN order_items.denominacao IS 'Tax type description/denomination, especially important for DARF items to show full tax names like "IRPJ PESSOA JURIDICA"';
COMMENT ON COLUMN order_items.cnpj IS 'CNPJ associated with this tax item, used across multiple tax types';
COMMENT ON COLUMN order_items.inscricao IS 'SIDA inscription number (número de inscrição)';
COMMENT ON COLUMN order_items.receita IS 'Tax revenue code/description (código da receita)';
COMMENT ON COLUMN order_items.inscrito_em IS 'SIDA inscription date (data de inscrição)';
COMMENT ON COLUMN order_items.ajuizado_em IS 'SIDA lawsuit date (data de ajuizamento)';
COMMENT ON COLUMN order_items.processo IS 'Process number (número do processo)';
COMMENT ON COLUMN order_items.tipo_devedor IS 'SIDA debtor type (tipo de devedor)';
COMMENT ON COLUMN order_items.devedor_principal IS 'SIDA principal debtor (devedor principal)';
COMMENT ON COLUMN order_items.parcelamento IS 'SIEFPAR installment plan number (número do parcelamento)';
COMMENT ON COLUMN order_items.valor_suspenso IS 'SIEFPAR suspended amount (valor suspenso)';
COMMENT ON COLUMN order_items.modalidade IS 'SIEFPAR installment plan modality (modalidade do parcelamento)';
COMMENT ON COLUMN order_items.sispar_conta IS 'SISPAR account number (número da conta)';
COMMENT ON COLUMN order_items.sispar_descricao IS 'SISPAR account description (descrição da conta)';
COMMENT ON COLUMN order_items.sispar_modalidade IS 'SISPAR installment modality (modalidade do parcelamento)';
COMMENT ON COLUMN order_items.saldo_devedor_consolidado IS 'Consolidated debtor balance (saldo devedor consolidado)'; 