// Este arquivo foi limpo para reimplementação do sistema de extração de PDF.
// Implemente a nova lógica de extração a partir deste ponto.

export interface SituacaoFiscalData {
  parcelamentosSipade: any[];
  pendenciasDebito: any[];
  processosFiscais: any[];
  parcelamentosSiefpar: any[];
  debitosSicob: any[];
  pendenciasInscricao: any[];
  debitosExigSuspensaSief: any[]; // Adicionado para compatibilidade com backend/IA
}

/** 
 * Envia o PDF para o backend FastAPI e retorna o texto extraído.
 */
export async function processSituacaoFiscalPDF(file: File): Promise<SituacaoFiscalData> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('http://localhost:8000/extract', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Erro ao processar PDF no backend');
  }

  const data = await response.json();

  // Usa os campos estruturados retornados pelo backend
  return {
    parcelamentosSipade: [],
    pendenciasDebito: data.pendenciasDebito || [],
    processosFiscais: [],
    parcelamentosSiefpar: [],
    debitosSicob: [],
    pendenciasInscricao: [],
  };
}

// Função para conversão dos dados extraídos para OrderItem[]
export function convertToOrderItems(data: SituacaoFiscalData): any[] {
  const now = new Date().toISOString();

  // Mapeia Pendências de Débito (SIEF)
  const debitos = (data.pendenciasDebito || []).map((debito: any) => ({
    id: crypto.randomUUID(),
    order_id: "",
    code: debito.receita || "",
    tax_type: "DEBITO",
    start_period: debito.periodo_apuracao || "",
    end_period: debito.periodo_apuracao || "",
    due_date: debito.vencimento || "",
    original_value: debito.valor_original || 0,
    current_balance: debito.saldo_devedor || 0,
    fine: debito.multa || 0,
    interest: debito.juros || 0,
    status: debito.situacao || "",
    cno: debito.cno || "",
    saldo_devedor_consolidado: debito.saldo_devedor_consolidado || 0, // campo customizado
    created_at: now,
    updated_at: now,
  }));

  // Mapeia Débito com Exigibilidade Suspensa (SIEF)
  const debitosExigSuspensa = (data.debitosExigSuspensaSief || []).map((debito: any) => ({
    id: crypto.randomUUID(),
    order_id: "",
    code: debito.receita || "",
    tax_type: "DEBITO_EXIG_SUSPENSA_SIEF",
    start_period: debito.periodo_apuracao || "",
    end_period: debito.periodo_apuracao || "",
    due_date: debito.vencimento || "",
    original_value: debito.valor_original || 0,
    current_balance: debito.saldo_devedor || 0,
    fine: debito.multa || 0,
    interest: debito.juros || 0,
    status: debito.situacao || "",
    cno: debito.cno || "",
    saldo_devedor_consolidado: debito.saldo_devedor_consolidado || 0, // campo customizado
    created_at: now,
    updated_at: now,
  }));

  // Retorna todos os itens juntos
  return [...debitos, ...debitosExigSuspensa];
}
