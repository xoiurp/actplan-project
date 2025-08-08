/*
  # Adicionar campo valor_reducao à tabela orders
  
  1. Alterações
    - Adiciona campo `valor_reducao` à tabela `orders` para armazenar o valor absoluto da redução/economia
    - Este campo armazenará o valor calculado (total * reducao_percentage / 100)
    
  2. Justificativa
    - Permitir consultas e relatórios diretos do valor da economia sem necessidade de recalcular
    - Manter histórico preciso do valor da redução mesmo se os itens do pedido forem alterados
*/

-- Adicionar coluna valor_reducao à tabela orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS valor_reducao numeric DEFAULT 0;

-- Comentário explicativo para a coluna
COMMENT ON COLUMN orders.valor_reducao IS 'Valor absoluto da redução/economia calculado como (total * reducao_percentage / 100)';

-- Atualizar valores existentes baseado no cálculo atual
-- Este UPDATE calculará o valor_reducao para pedidos existentes
UPDATE orders o
SET valor_reducao = (
  SELECT SUM(
    COALESCE(oi.saldo_devedor_consolidado, oi.current_balance, 0)
  ) * (o.reducao_percentage / 100)
  FROM order_items oi
  WHERE oi.order_id = o.id
)
WHERE o.valor_reducao IS NULL OR o.valor_reducao = 0;
