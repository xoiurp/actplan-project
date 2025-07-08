/*
  # Initial Schema Setup

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `name` (text)
      - `created_at` (timestamp)
    
    - `customers`
      - `id` (uuid, primary key)
      - `razao_social` (text)
      - `cnpj` (text, unique)
      - `endereco` (text)
      - `cidade` (text)
      - `estado` (text)
      - `cep` (text)
      - `numero` (text)
      - `complemento` (text)
      - `nome_responsavel` (text)
      - `sobrenome_responsavel` (text)
      - `whatsapp_responsavel` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `user_id` (uuid, foreign key)

    - `orders`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key)
      - `status` (text)
      - `data_pedido` (date)
      - `comissao_percentage` (numeric)
      - `reducao_percentage` (numeric)
      - `fornecedor` (text)
      - `vencimento` (date)
      - `notas` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `order_items`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key)
      - `code` (text)
      - `tax_type` (text)
      - `start_period` (date)
      - `end_period` (date)
      - `due_date` (date)
      - `original_value` (numeric)
      - `current_balance` (numeric)
      - `fine` (numeric)
      - `interest` (numeric)
      - `status` (text)
      - `cno` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  name text,
  created_at timestamptz DEFAULT now()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  razao_social text NOT NULL,
  cnpj text UNIQUE NOT NULL,
  endereco text,
  cidade text,
  estado text,
  cep text,
  numero text,
  complemento text,
  nome_responsavel text,
  sobrenome_responsavel text,
  whatsapp_responsavel text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL,
  data_pedido date NOT NULL,
  comissao_percentage numeric DEFAULT 0,
  reducao_percentage numeric DEFAULT 0,
  fornecedor text,
  vencimento date,
  notas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  code text NOT NULL,
  tax_type text NOT NULL,
  start_period date NOT NULL,
  end_period date NOT NULL,
  due_date date NOT NULL,
  original_value numeric NOT NULL,
  current_balance numeric NOT NULL,
  fine numeric DEFAULT 0,
  interest numeric DEFAULT 0,
  status text NOT NULL,
  cno text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can read own customers" ON customers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own customers" ON customers
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own customers" ON customers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own customers" ON customers
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can read own orders" ON orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own orders" ON orders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own orders" ON orders
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own orders" ON orders
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can read order items through orders" ON order_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert order items through orders" ON order_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Users can update order items through orders" ON order_items
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete order items through orders" ON order_items
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  ));

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_items_updated_at
  BEFORE UPDATE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();