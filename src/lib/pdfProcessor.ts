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
  
  console.log('🌐 Fazendo chamada para API:', `${apiUrl}/api/extraction/extract`);
  
  const response = await fetch(`${apiUrl}/api/extraction/extract`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Erro ao processar PDF no backend: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log('📥 Resposta completa da API:', data);

  // Mapeia os campos da resposta da API (que podem ter nomes diferentes)
  const mappedData = {
    parcelamentosSipade: data.parcelamentosSipade || [],
    pendenciasDebito: data.pendenciasDebito || [],
    processosFiscais: data.processosFiscais || [],
    parcelamentosSiefpar: data.parcelamentosSiefpar || [],
    debitosSicob: data.debitosSicob || [],
    pendenciasInscricao: data.pendenciasInscricao || [],
    debitosExigSuspensaSief: data.debitosExigSuspensaSief || [],
    pendenciasParcelamentoSispar: data.pendenciasParcelamentoSispar || [],
  };

  console.log('🔄 Dados mapeados:', mappedData);
  console.log('📊 Contagem por seção:', {
    parcelamentosSipade: mappedData.parcelamentosSipade.length,
    pendenciasDebito: mappedData.pendenciasDebito.length,
    processosFiscais: mappedData.processosFiscais.length,
    parcelamentosSiefpar: mappedData.parcelamentosSiefpar.length,
    debitosSicob: mappedData.debitosSicob.length,
    pendenciasInscricao: mappedData.pendenciasInscricao.length,
    debitosExigSuspensaSief: mappedData.debitosExigSuspensaSief.length,
    pendenciasParcelamentoSispar: mappedData.pendenciasParcelamentoSispar.length,
  });

  return mappedData;
}

// Função para conversão dos dados extraídos para OrderItem[]
export function convertToOrderItems(data: SituacaoFiscalData): any[] {
  const now = new Date().toISOString();
  
  console.log('🔄 Iniciando conversão de dados para OrderItems...', data);
  console.log('📊 Contagem de entrada por seção:', {
    pendenciasDebito: data.pendenciasDebito?.length || 0,
    debitosExigSuspensaSief: data.debitosExigSuspensaSief?.length || 0,
    parcelamentosSiefpar: data.parcelamentosSiefpar?.length || 0,
    pendenciasInscricao: data.pendenciasInscricao?.length || 0,
    pendenciasParcelamentoSispar: data.pendenciasParcelamentoSispar?.length || 0,
  });

  const allSections = [];

  // Seção 1: Mapeia Pendências de Débito (SIEF)
  console.log('🔄 Processando Pendências de Débito (SIEF)...');
  const debitos = (data.pendenciasDebito || []).map((debito: any, index: number) => {
    console.log(`📋 Processando débito ${index + 1}/${data.pendenciasDebito?.length}:`, debito);
    
    // Detecção mais abrangente de itens do Simples Nacional
    const isSimples = (debito.receita || "").toUpperCase().includes('SIMPLES NAC') ||
                     (debito.receita || "").toUpperCase().includes('SIMPLES') ||
                     (debito.receita || "").includes('1507-SIMPLES') ||
                     (debito.receita || "").includes('1507');
    const tax_type = isSimples ? "SIMPLES_NACIONAL" : "DEBITO";
    
    console.log(`   - É Simples Nacional: ${isSimples}`);
    console.log(`   - Tax Type: ${tax_type}`);
    console.log(`   - Receita original: "${debito.receita}"`);
    
    // Tratamento melhorado de código - GARANTIR que sempre há um código
    let code = debito.receita || "";
    
    // Se não tem código OU é um código vazio/inválido
    if (!code || code.trim() === "" || code === "SEM CÓDIGO" || code.startsWith("ITEM-")) {
      if (isSimples) {
        code = "SIMPLES_NACIONAL";
      } else if (debito.periodo_apuracao && debito.periodo_apuracao.trim() !== "") {
        // Gera código baseado no período se não houver código
        const periodo = debito.periodo_apuracao.replace(/[\/\s]/g, "-");
        code = `ITEM-${periodo}`;
      } else if (debito.cnpj) {
        // Se não tem período, usa CNPJ como base
        const cnpjLimpo = debito.cnpj.replace(/[^\d]/g, '');
        code = `ITEM-${cnpjLimpo.slice(-6)}`;
      } else {
        // Último recurso - usa timestamp
        code = `ITEM-${Date.now()}-${index}`;
      }
      console.log(`   - Código gerado: ${code}`);
    }
    
    // Para itens do Simples Nacional, garante que sempre temos dados válidos
    let startPeriod = debito.periodo_apuracao || "";
    let endPeriod = debito.periodo_apuracao || "";
    let dueDate = debito.vencimento || "";
    
    // Se for Simples Nacional e não tiver período/vencimento, usa valores padrão mais úteis
    if (isSimples) {
      if (!startPeriod || startPeriod === "N/A" || startPeriod.trim() === "") {
        startPeriod = "SIMPLES NAC.";
      }
      if (!endPeriod || endPeriod === "N/A" || endPeriod.trim() === "") {
        endPeriod = "SIMPLES NAC.";
      }
      if (!dueDate || dueDate === "N/A" || dueDate.trim() === "") {
        dueDate = "A DEFINIR";
      }
      console.log(`   - Dados ajustados para Simples: período=${startPeriod}, vencimento=${dueDate}`);
    }
    
    // Se ainda não tem período/vencimento, usa valores padrão
    if (!startPeriod || startPeriod.trim() === "") {
      startPeriod = "N/A";
    }
    if (!endPeriod || endPeriod.trim() === "") {
      endPeriod = startPeriod; // Usa o mesmo que o período inicial
    }
    if (!dueDate || dueDate.trim() === "") {
      dueDate = "N/A";
    }
    
    const orderItem = {
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
      cnpj: debito.cnpj || "",
      saldo_devedor_consolidado: debito.saldo_devedor_consolidado || 0, // campo customizado
      created_at: now,
      updated_at: now
    };
    
    // Validação final - garante que o item tem dados mínimos
    if (!orderItem.code || !orderItem.tax_type) {
      console.error(`❌ Item inválido detectado - sem código ou tipo:`, orderItem);
      console.error(`   - Dados originais:`, debito);
      // Força valores mínimos
      orderItem.code = orderItem.code || `ERRO-${Date.now()}-${index}`;
      orderItem.tax_type = orderItem.tax_type || "DEBITO";
    }
    
    console.log(`   ✅ Item débito convertido:`, orderItem);
    return orderItem;
  });
  allSections.push({ name: 'debitos', items: debitos });
  console.log(`✅ Convertidos ${debitos.length} débitos SIEF`);

  // Seção 2: Mapeia Débito com Exigibilidade Suspensa (SIEF)
  console.log('🔄 Processando Débitos com Exigibilidade Suspensa (SIEF)...');
  const debitosExigSuspensa = (data.debitosExigSuspensaSief || []).map((debito: any, index: number) => {
    console.log(`📋 Processando débito exig. suspensa ${index + 1}/${data.debitosExigSuspensaSief?.length}:`, debito);
    
    // Tratamento especial para códigos vazios ou indefinidos
    let code = debito.receita || "";
    if (!code || code.trim() === "") {
      if (debito.periodo_apuracao) {
        const periodo = debito.periodo_apuracao.replace(/[\/\s]/g, "-");
        code = `EXIG-SUSPENSA-${periodo}`;
      } else {
        code = `EXIG-SUSPENSA-${Date.now()}`;
      }
      console.log(`   - Código gerado para exig. suspensa: ${code}`);
    }
    
    const orderItem = {
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
    
    console.log(`   ✅ Item exig. suspensa convertido:`, orderItem);
    return orderItem;
  });
  allSections.push({ name: 'debitosExigSuspensa', items: debitosExigSuspensa });
  console.log(`✅ Convertidos ${debitosExigSuspensa.length} débitos exig. suspensa`);

  // Seção 3: Mapeia Parcelamentos SIEFPAR
  console.log('🔄 Processando Parcelamentos SIEFPAR...');
  const parcelamentosSiefpar = (data.parcelamentosSiefpar || []).map((item: any, index: number) => {
    console.log(`📋 Processando parcelamento SIEFPAR ${index + 1}/${data.parcelamentosSiefpar?.length}:`, item);
    
    // Garante que sempre temos um código válido
    let code = item.parcelamento || "";
    if (!code || code.trim() === "") {
      code = `PARCELAMENTO-${Date.now()}`;
      console.log(`   - Código gerado para SIEFPAR: ${code}`);
    }
    
    const orderItem = {
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
    
    console.log(`   ✅ Item SIEFPAR convertido:`, orderItem);
    return orderItem;
  });
  allSections.push({ name: 'parcelamentosSiefpar', items: parcelamentosSiefpar });
  console.log(`✅ Convertidos ${parcelamentosSiefpar.length} parcelamentos SIEFPAR`);

  // Seção 4: Mapeia Pendências de Inscrição (SIDA)
  console.log('🔄 Processando Pendências de Inscrição (SIDA)...');
  const pendenciasInscricao = (data.pendenciasInscricao || []).map((item: any, index: number) => {
    console.log(`📋 Processando inscrição SIDA ${index + 1}/${data.pendenciasInscricao?.length}:`, item);
    
    // Usa a inscrição como código principal
    let code = item.inscricao || "";
    if (!code || code.trim() === "") {
      code = `INSCRICAO-${Date.now()}`;
      console.log(`   - Código gerado para SIDA: ${code}`);
    }
    
    const orderItem = {
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
    
    console.log(`   ✅ Item SIDA convertido:`, orderItem);
    return orderItem;
  });
  allSections.push({ name: 'pendenciasInscricao', items: pendenciasInscricao });
  console.log(`✅ Convertidos ${pendenciasInscricao.length} inscrições SIDA`);

  // Seção 5: Mapeia Pendências de Parcelamento (SISPAR)
  console.log('🔄 Processando Pendências de Parcelamento (SISPAR)...');
  const pendenciasParcelamentoSispar = (data.pendenciasParcelamentoSispar || []).map((item: any, index: number) => {
    console.log(`📋 Processando parcelamento SISPAR ${index + 1}/${data.pendenciasParcelamentoSispar?.length}:`, item);
    
    // Usa a conta como código
    let code = item.conta || "";
    if (!code || code.trim() === "") {
      code = `SISPAR-${Date.now()}`;
      console.log(`   - Código gerado para SISPAR: ${code}`);
    }
    
    const orderItem = {
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
    
    console.log(`   ✅ Item SISPAR convertido:`, orderItem);
    return orderItem;
  });
  allSections.push({ name: 'pendenciasParcelamentoSispar', items: pendenciasParcelamentoSispar });
  console.log(`✅ Convertidos ${pendenciasParcelamentoSispar.length} parcelamentos SISPAR`);

  // Consolida todos os itens
  const allItems = [
    ...debitos,
    ...debitosExigSuspensa,
    ...parcelamentosSiefpar,
    ...pendenciasInscricao,
    ...pendenciasParcelamentoSispar
  ];

  console.log(`🔄 Conversão concluída: ${allItems.length} itens processados`);
  console.log('📊 Resumo da conversão:', {
    debitos: debitos.length,
    debitosExigSuspensa: debitosExigSuspensa.length,
    parcelamentosSiefpar: parcelamentosSiefpar.length,
    pendenciasInscricao: pendenciasInscricao.length,
    pendenciasParcelamentoSispar: pendenciasParcelamentoSispar.length,
    total: allItems.length
  });

  // Log detalhado de cada seção
  allSections.forEach(section => {
    console.log(`📋 Seção ${section.name}: ${section.items.length} itens`, section.items);
  });

  return allItems;
}
