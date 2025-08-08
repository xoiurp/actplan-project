-- Script SQL para executar manualmente no Supabase Dashboard ou psql
-- Adiciona os campos em falta na tabela order_items

-- Campos principais
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS denominacao text;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS cnpj text;

-- Campos SIDA
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS inscricao text;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS receita text;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS inscrito_em text;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS ajuizado_em text;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS processo text;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS tipo_devedor text;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS devedor_principal text;

-- Campos SIEFPAR
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS parcelamento text;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS valor_suspenso numeric;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS modalidade text;

-- Campos SISPAR
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS sispar_conta text;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS sispar_descricao text;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS sispar_modalidade text;

-- Campo adicional
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS saldo_devedor_consolidado numeric;

-- Verificar se os campos foram adicionados
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'order_items' 
AND column_name IN ('denominacao', 'cnpj', 'inscricao', 'receita', 'inscrito_em', 'ajuizado_em', 'processo', 'tipo_devedor', 'devedor_principal', 'parcelamento', 'valor_suspenso', 'modalidade', 'sispar_conta', 'sispar_descricao', 'sispar_modalidade', 'saldo_devedor_consolidado')
ORDER BY column_name; 