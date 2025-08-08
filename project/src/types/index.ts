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
  } | null;
  senha_certificado?: string; // Add optional certificate password field
  certificado_validade?: string | null; // Add optional certificate expiry date (YYYY-MM-DD)
  status?: 'Prospect' | 'Proposta Enviada' | 'Aguardando Assinatura' | 'Ativo' | 'Inativo/Pausado';
  user_id: string;
}

export interface DocumentInfo {
  url: string;
  name: string;
  type: string;
  size: number;
  file?: File; // Optional: to hold the file object before upload
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
  valor_reducao?: number;
  fornecedor: string;
  vencimento: string;
  notas: string;
  // Section inclusion flags for total calculation
  include_pendencias_debito?: boolean;
  include_debitos_exig_suspensa?: boolean;
  include_parcelamentos_siefpar?: boolean;
  include_pendencias_inscricao?: boolean;
  include_pendencias_parcelamento?: boolean;
  include_simples_nacional?: boolean;
  include_darf?: boolean;
  documentos?: {
    situacaoFiscal?: DocumentInfo & {
      // Dados completos da situação fiscal extraídos pela IA
      debitosExigSuspensaSief?: any[];
      parcelamentosSipade?: any[];
      pendenciasDebito?: any[];
      processosFiscais?: any[];
      parcelamentosSiefpar?: any[];
      debitosSicob?: any[];
      pendenciasInscricao?: any[];
    };
    darf?: DocumentInfo;
    vendas?: DocumentInfo[];
    juridico?: DocumentInfo[];
  };
  customer: Customer;
  itens_pedido: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  tax_type: 'DEBITO' | 'DEBITO_EXIG_SUSPENSA_SIEF' | 'PARCELAMENTO_SIEFPAR' | 'PENDENCIA_INSCRICAO_SIDA' | 'PENDENCIA_PARCELAMENTO_SISPAR' | 'SIMPLES_NACIONAL' | string; // Tipo mais específico
  // Campos comuns/Débito SIEF
  cnpj?: string; // Adicionado CNPJ como opcional geral
  code?: string; // Código da Receita ou Inscrição ou Conta ou Parcelamento
  denominacao?: string; // Denominação/descrição do imposto (especialmente importante para DARF)
  start_period?: string; // Período Apuração ou Data Inscrição
  end_period?: string; // Geralmente igual a start_period para débitos
  due_date?: string; // Vencimento (não aplicável a SIDA)
  original_value?: number; // Valor Original (não aplicável a SIDA)
  current_balance?: number; // Saldo Devedor (não aplicável a SIDA)
  fine?: number; // Multa (não aplicável a SIDA)
  interest?: number; // Juros (não aplicável a SIDA)
  status?: string; // Situação
  cno?: string; // CNO (aplicável a Débito Exig Suspensa)
  saldo_devedor_consolidado?: number; // Saldo Consolidado (Débito SIEF)
  // Campos específicos SIDA
  inscricao?: string;
  receita?: string; // Receita também existe em SIDA
  inscrito_em?: string; // Data de Inscrição
  ajuizado_em?: string; // Data de Ajuizamento
  processo?: string; // Número do Processo
  tipo_devedor?: string; // Tipo de Devedor
  devedor_principal?: string; // Devedor Principal (se corresponsável)
  // Campos específicos SIEFPAR
  parcelamento?: string; // Número do Parcelamento
  valor_suspenso?: number; // Valor Suspenso
  modalidade?: string; // Modalidade do Parcelamento SIEFPAR
  // Campos específicos SISPAR
  sispar_conta?: string;
  sispar_descricao?: string;
  sispar_modalidade?: string; // Modalidade do Parcelamento SISPAR
  // Timestamps
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
