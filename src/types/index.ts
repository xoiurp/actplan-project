export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Customer {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  razao_social: string;
  cnpj: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  numero: string;
  complemento: string;
  nome_responsavel: string;
  sobrenome_responsavel: string;
  whatsapp_responsavel: string;
  certificado?: {
    url: string;
    name: string;
    type: string;
    size: number;
  };
  senha_certificado?: string; // Add optional certificate password field
  certificado_validade?: string; // Add optional certificate expiry date (YYYY-MM-DD)
  user_id: string;
}

export interface Order {
  id: string;
  order_number: number;
  order_year: number;
  created_at: number;
  updated_at: string;
  customer_id: string;
  user_id: string;
  status: string;
  data_pedido: string;
  comissao_percentage: number;
  reducao_percentage: number;
  fornecedor: string;
  vencimento: string;
  notas: string;
  documentos?: {
    situacaoFiscal?: {
      url: string;
      name: string;
      type: string;
      size: number;
      // Dados completos da situação fiscal extraídos pela IA
      debitosExigSuspensaSief?: any[];
      parcelamentosSipade?: any[];
      pendenciasDebito?: any[];
      processosFiscais?: any[];
      parcelamentosSiefpar?: any[];
      debitosSicob?: any[];
      pendenciasInscricao?: any[];
    };
    darf?: {
      url: string;
      name: string;
      type: string;
      size: number;
    };
  };
  customer: Customer;
  itens_pedido: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  code: string;
  tax_type: string;
  start_period: string;
  end_period: string;
  due_date: string;
  original_value: number;
  current_balance: number;
  fine: number;
  interest: number;
  status: string;
  cno?: string;
  saldo_devedor_consolidado?: number; // Novo campo para Sdo. Dev. Cons
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  pendingPayments: number;
  newCustomers: number;
}

export interface PaymentPlan {
  id: string;
  order_id: string;
  user_id: string;
  total_amount: number;
  installments_count: number;
  status: string;
  created_at: string;
  updated_at: string;
  order: Order;
  installments: Installment[];
}

export interface Installment {
  id: string;
  payment_plan_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  status: string;
  paid_amount?: number;
  paid_at?: string;
  receipt?: {
    url: string;
    name: string;
    type: string;
    size: number;
  };
  edit_mode?: boolean;
  created_at: string;
  updated_at: string;
}
