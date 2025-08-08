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
  pendenciasParcelamentoSispar: any[]; // Novo campo para SISPAR
}

/**
 * Envia o PDF para o backend FastAPI e retorna o texto extraído.
 */
export async function processSituacaoFiscalPDF(file: File): Promise<SituacaoFiscalData> {
  const formData = new FormData();
  formData.append('file', file);

  // Use a nova variável de ambiente para o Cloud Run
  const apiUrl = import.meta.env.VITE_PDF_PROCESSOR_URL || 'http://localhost:8000';
  
  const response = await fetch(`${apiUrl}/api/extraction/extract`, {
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
    pendenciasParcelamentoSispar: data.pendenciasParcelamentoSispar || [], // Adiciona o novo campo
  };
}

// Função para conversão dos dados extraídos para OrderItem[]
export function convertToOrderItems(data: SituacaoFiscalData): any[] {
  const now = new Date().toISOString();

  // Mapeia Pendências de Débito (SIEF)
  const debitos = (data.pendenciasDebito || []).map((debito: any) => {
    const isSimples = (debito.receita || "").toUpperCase().includes('SIMPLES NAC');
    const tax_type = isSimples ? "SIMPLES_NACIONAL" : "DEBITO";
    
    // Melhora o tratamento de código para itens sem código
    let code = debito.receita || "";
    if (!code || code === "SEM CÓDIGO" || code.startsWith("ITEM-")) {
      if (isSimples) {
        code = "SIMPLES_NACIONAL";
      } else if (debito.periodo_apuracao) {
        // Gera código baseado no período se não houver código
        const periodo = debito.periodo_apuracao.replace(/[\/\s]/g, "-");
        code = `ITEM-${periodo}`;
      } else {
        code = "ITEM-SEM-CODIGO";
      }
    }
    
    // Para itens do Simples Nacional, garante que sempre temos dados válidos
    let startPeriod = debito.periodo_apuracao || "";
    let endPeriod = debito.periodo_apuracao || "";
    let dueDate = debito.vencimento || "";
    
    // Se for Simples Nacional e não tiver período/vencimento, usa valores padrão mais úteis
    if (isSimples) {
      if (!startPeriod || startPeriod === "N/A") {
        startPeriod = "SIMPLES NAC.";
      }
      if (!endPeriod || endPeriod === "N/A") {
        endPeriod = "SIMPLES NAC.";
      }
      if (!dueDate || dueDate === "N/A") {
        dueDate = "A DEFINIR";
      }
    }
    
    return {
      id: crypto.randomUUID(),
      order_id: "",
      code: code,
      tax_type: tax_type,
      start_period: startPeriod,
      end_period: endPeriod,
      due_date: dueDate,
      original_value: debito.valor_original || 0,
      current_balance: debito.saldo_devedor || 0,
      fine: debito.multa || 0,
      interest: debito.juros || 0,
      status: debito.situacao || "DEVEDOR",
      cno: debito.cno || "",
      saldo_devedor_consolidado: debito.saldo_devedor_consolidado || 0, // campo customizado
      created_at: now,
      updated_at: now
    };
  });

  // Mapeia Débito com Exigibilidade Suspensa (SIEF)
  const debitosExigSuspensa = (data.debitosExigSuspensaSief || []).map((debito: any) => {
    // Tratamento especial para códigos vazios ou indefinidos
    let code = debito.receita || "";
    if (!code || code.trim() === "") {
      if (debito.periodo_apuracao) {
        const periodo = debito.periodo_apuracao.replace(/[\/\s]/g, "-");
        code = `EXIG-SUSPENSA-${periodo}`;
      } else {
        code = `EXIG-SUSPENSA-${Date.now()}`;
      }
    }
    
    return {
      id: crypto.randomUUID(),
      order_id: "",
      code: code,
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
    };
  });

  // Mapeia Parcelamentos SIEFPAR
  const parcelamentosSiefpar = (data.parcelamentosSiefpar || []).map((item: any) => {
    // Garante que sempre temos um código válido
    let code = item.parcelamento || "";
    if (!code || code.trim() === "") {
      code = `PARCELAMENTO-${Date.now()}`;
    }
    
    return {
      id: crypto.randomUUID(),
      order_id: "",
      code: code,
      tax_type: "PARCELAMENTO_SIEFPAR",
      start_period: "PARCELAMENTO",
      end_period: "PARCELAMENTO",
      due_date: "SUSPENSO",
      original_value: item.valor_suspenso || 0,
      current_balance: item.valor_suspenso || 0,
      fine: 0,
      interest: 0,
      status: item.modalidade || "ATIVO",
      cno: "",
      cnpj: item.cnpj || "",
      created_at: now,
      updated_at: now,
    };
  });

  // Mapeia Pendências de Inscrição (SIDA)
  const pendenciasInscricao = (data.pendenciasInscricao || []).map((item: any) => {
    // Usa a inscrição como código principal
    let code = item.inscricao || "";
    if (!code || code.trim() === "") {
      code = `INSCRICAO-${Date.now()}`;
    }
    
    return {
      id: crypto.randomUUID(),
      order_id: "",
      // Campos específicos SIDA
      inscricao: item.inscricao || "",
      receita: item.receita || "",
      inscrito_em: item.inscrito_em || "",
      ajuizado_em: item.ajuizado_em || "",
      processo: item.processo || "",
      tipo_devedor: item.tipo_devedor || "",
      devedor_principal: item.devedor_principal || "",
      status: item.situacao || "ATIVA",
      // Campos genéricos
      tax_type: "PENDENCIA_INSCRICAO_SIDA",
      code: code,
      start_period: item.inscrito_em || "INSCRICAO",
      end_period: item.inscrito_em || "INSCRICAO",
      due_date: item.ajuizado_em || "NAO AJUIZADO",
      original_value: 0,
      current_balance: 0,
      fine: 0,
      interest: 0,
      cno: "",
      cnpj: item.cnpj || "",
      saldo_devedor_consolidado: 0,
      created_at: now,
      updated_at: now,
    };
  });

  // Mapeia Pendências de Parcelamento (SISPAR)
  const pendenciasParcelamentoSispar = (data.pendenciasParcelamentoSispar || []).map((item: any) => {
    // Usa a conta como código
    let code = item.conta || "";
    if (!code || code.trim() === "") {
      code = `SISPAR-${Date.now()}`;
    }
    
    return {
      id: crypto.randomUUID(),
      order_id: "",
      code: code,
      tax_type: "PENDENCIA_PARCELAMENTO_SISPAR",
      start_period: "PARCELAMENTO",
      end_period: "PARCELAMENTO",
      due_date: "NEGOCIADO",
      original_value: 0,
      current_balance: 0,
      fine: 0,
      interest: 0,
      status: item.modalidade || item.descricao || "ATIVO",
      cno: "",
      cnpj: item.cnpj || "",
      saldo_devedor_consolidado: 0,
      // Campos específicos SISPAR
      sispar_conta: item.conta || "",
      sispar_descricao: item.descricao || "",
      sispar_modalidade: item.modalidade || "",
      created_at: now,
      updated_at: now,
    };
  });

  // Consolida todos os itens
  const allItems = [
    ...debitos,
    ...debitosExigSuspensa,
    ...parcelamentosSiefpar,
    ...pendenciasInscricao,
    ...pendenciasParcelamentoSispar
  ];

  console.log(`🔄 Conversão concluída: ${allItems.length} itens processados`, {
    debitos: debitos.length,
    debitosExigSuspensa: debitosExigSuspensa.length,
    parcelamentosSiefpar: parcelamentosSiefpar.length,
    pendenciasInscricao: pendenciasInscricao.length,
    pendenciasParcelamentoSispar: pendenciasParcelamentoSispar.length
  });

  return allItems;
}
