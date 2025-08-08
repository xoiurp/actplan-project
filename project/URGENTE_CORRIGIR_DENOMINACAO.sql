-- 🚨 CORREÇÃO URGENTE: Campo denominacao ausente na tabela order_items
-- Execute este script no Supabase Dashboard -> SQL Editor

-- 1. Adicionar o campo denominacao à tabela order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS denominacao text;

-- 2. Verificar se o campo foi adicionado
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'order_items' 
AND column_name = 'denominacao';

-- 3. Comentário sobre o problema:
-- O campo 'denominacao' armazena a descrição completa dos impostos DARF
-- Ex: "PIS - NÃO CUMULATIVO (LEI 10.637/02)" em vez de apenas o código "6912"
-- Sem este campo, as descrições dos impostos são perdidas após salvar o pedido

-- 4. Verificar dados existentes (opcional)
SELECT id, code, denominacao, tax_type 
FROM order_items 
WHERE tax_type = 'DARF' 
LIMIT 5; 