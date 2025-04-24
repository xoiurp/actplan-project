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

  const response = await fetch('https:api.actplanconsultoria.com/api/extraction/extract', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Erro ao processar PDF no backend');
  }

  const data = await response.json();

  // Usa os campos estruturados retornados pelo backend
// Garante que todos os campos da interface estejam presentes
  return {
    parcelamentosSipade: data.parcelamentosSipade || [],
    pendenciasDebito: data.pendenciasDebito || [],
    processosFiscais: data.processosFiscais || [],
    parcelamentosSiefpar: data.parcelamentosSiefpar || [],
    debitosSicob: data.debitosSicob || [],
    pendenciasInscricao: data.pendenciasInscricao || [],
    debitosExigSuspensaSief: data.debitosExigSuspensaSief || [],
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

  // Mapeia Parcelamentos SIEFPAR
  const parcelamentosSiefpar = (data.parcelamentosSiefpar || []).map((item: any) => ({
    id: crypto.randomUUID(),
    order_id: "",
    code: item.parcelamento || "", // Usando 'parcelamento' como código
    tax_type: "PARCELAMENTO_SIEFPAR", // Novo tipo
    start_period: "", // Não disponível
    end_period: "", // Não disponível
    due_date: "", // Não disponível
    original_value: item.valor_suspenso || 0, // Usando 'valor_suspenso'
    current_balance: item.valor_suspenso || 0, // Assumindo saldo = valor suspenso
    fine: 0, // Não disponível
    interest: 0, // Não disponível
    status: item.tipo || "", // Usando 'tipo' como status
    cno: "", // Não disponível
    created_at: now,
    updated_at: now,
  }));

  // Mapeia Pendências de Inscrição (SIDA)
  const pendenciasInscricao = (data.pendenciasInscricao || []).map((item: any) => ({
    id: crypto.randomUUID(),
    order_id: "",
    code: item.inscricao || "", // Usando 'inscricao' como código
    tax_type: "PENDENCIA_INSCRICAO", // Novo tipo
    start_period: item.data_inscricao || "", // Usando 'data_inscricao' como período inicial
    end_period: "", // Não disponível
    due_date: "", // Não disponível (data_inscricao pode ser usada aqui se fizer sentido)
    original_value: 0, // Não disponível
    current_balance: 0, // Não disponível
    fine: 0, // Não disponível
    interest: 0, // Não disponível
    status: item.situacao || "", // Usando 'situacao' como status
    cno: "", // Não disponível
    // Poderíamos adicionar outros campos como 'receita' ou 'processo' em 'notas' se necessário
    created_at: now,
    updated_at: now,
  }));


  // Retorna todos os itens juntos, incluindo os novos tipos
  return [
      ...debitos, 
      ...debitosExigSuspensa,
      ...parcelamentosSiefpar,
      ...pendenciasInscricao
    ];
}
