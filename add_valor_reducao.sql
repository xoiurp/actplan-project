-- Adicionar campo valor_reducao à tabela orders se não existir
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS valor_reducao numeric DEFAULT 0;

-- Comentário explicativo para a coluna
COMMENT ON COLUMN orders.valor_reducao IS 'Valor absoluto da redução/economia calculado como (total * reducao_percentage / 100)';

-- Atualizar valores existentes baseado no cálculo atual
UPDATE orders o
SET valor_reducao = (
  SELECT SUM(
    COALESCE(oi.saldo_devedor_consolidado, oi.current_balance, 0)
  ) * (o.reducao_percentage / 100)
  FROM order_items oi
  WHERE oi.order_id = o.id
)
WHERE (o.valor_reducao IS NULL OR o.valor_reducao = 0) 
  AND o.reducao_percentage > 0;
