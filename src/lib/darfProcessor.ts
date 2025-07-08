// Este arquivo foi limpo para reimplementação do sistema de extração de DARF.
// Implemente a nova lógica de extração a partir deste ponto.

export interface DarfData {
  code: string;
  taxType: string;
  period: string;
  dueDate: string;
  principal: number;
  fine: number;
  interest: number;
  totalValue: number;
}

interface BackendDarfData {
  codigo: string;
  denominacao: string;
  periodo_apuracao: string;
  vencimento: string;
  principal: number;
  multa: number;
  juros: number;
  total: number;
}

// Função para processamento de PDF DARF
export async function processDarfPDF(file: File): Promise<DarfData[]> {
  console.log('Iniciando processamento do DARF...');
  
  if (!file) {
    console.error('Arquivo não fornecido');
    throw new Error('Arquivo não fornecido');
  }

  const formData = new FormData();
  formData.append('file', file);

  // Use a nova variável de ambiente para o Cloud Run
  const apiUrl = import.meta.env.VITE_PDF_PROCESSOR_URL || 'http://localhost:8000';
  
  console.log('DARF API URL:', `${apiUrl}/api/extraction/extract-darf`); // Debug log
  
  try {
    const response = await fetch(`${apiUrl}/api/extraction/extract-darf`, {
      method: 'POST',
      body: formData,
    });

    console.log('Resposta recebida:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na resposta:', errorText);
      throw new Error(`Erro ao processar PDF do DARF no backend: ${response.status} ${errorText}`);
    }

    const responseData = await response.json();
    console.log('Dados recebidos:', responseData);
    
    if (responseData.error) {
      console.error('Erro nos dados:', responseData.error);
      throw new Error(responseData.error);
    }

    const backendData: BackendDarfData[] = responseData.data || [];
    console.log('Dados do backend:', backendData);
    
    // Converte do formato do backend para o formato esperado pelo frontend
    const result = backendData.map(item => ({
      code: item.codigo,
      taxType: item.denominacao,
      period: item.periodo_apuracao,
      dueDate: formatDateFromDDMMYYYY(item.vencimento),
      principal: item.principal,
      fine: item.multa,
      interest: item.juros,
      totalValue: item.total
    }));

    console.log('Dados convertidos:', result);
    return result;
  } catch (error) {
    console.error('Erro durante o processamento:', error);
    throw error;
  }
}

// Função placeholder para conversão dos dados extraídos (a ser implementada)
export function convertDarfToOrderItems(darfData: DarfData[]): any[] {
  const now = new Date().toISOString();

  return darfData.map((darf, index) => {
    console.log(`\n🔍 [Item ${index}] Processando DARF:`, {
      code: darf.code,
      period: darf.period,
      dueDate: darf.dueDate,
      principal: darf.principal
    });

    // Garantir que nunca seja null, undefined ou string vazia
    let startPeriod = darf.period;
    let endPeriod = darf.period;
    let dueDate = darf.dueDate;

    // Validação e fallback para start_period
    if (!startPeriod || startPeriod === "" || startPeriod === null || startPeriod === undefined) {
      console.warn(`⚠️ [Item ${index}] start_period inválido: "${startPeriod}", usando fallback`);
      startPeriod = darf.dueDate || '2024-01-01';
    }

    // Validação e fallback para end_period
    if (!endPeriod || endPeriod === "" || endPeriod === null || endPeriod === undefined) {
      console.warn(`⚠️ [Item ${index}] end_period inválido: "${endPeriod}", usando fallback`);
      endPeriod = darf.dueDate || '2024-01-01';
    }

    // Validação e fallback para due_date
    if (!dueDate || dueDate === "" || dueDate === null || dueDate === undefined) {
      console.warn(`⚠️ [Item ${index}] due_date inválido: "${dueDate}", usando fallback`);
      dueDate = '2024-01-01';
    }

    const orderItem = {
      id: crypto.randomUUID(),
      order_id: "",
      code: darf.code,
      tax_type: "DARF",
      start_period: startPeriod,
      end_period: endPeriod,
      due_date: dueDate,
      original_value: darf.principal || 0,
      current_balance: darf.totalValue || 0,
      fine: darf.fine || 0,
      interest: darf.interest || 0,
      status: "PENDING",
      cno: "",
      denominacao: darf.taxType || "", // Preserva a denominação para exibição
      created_at: now,
      updated_at: now,
    };

    console.log(`✅ [Item ${index}] OrderItem criado:`, {
      code: orderItem.code,
      start_period: orderItem.start_period,
      end_period: orderItem.end_period,
      due_date: orderItem.due_date
    });

    // Validação final antes de retornar
    if (!orderItem.start_period || !orderItem.due_date) {
      console.error(`❌ [Item ${index}] ERRO: Item ainda tem campos null após processamento:`, orderItem);
      throw new Error(`Item ${index} (código ${darf.code}) ainda tem campos null: start_period="${orderItem.start_period}", due_date="${orderItem.due_date}"`);
    }

    return orderItem;
  });
}

// Helper function to convert various date formats to YYYY-MM-DD
function formatDateFromDDMMYYYY(dateStr: string): string {
  if (!dateStr) {
    console.warn('Data vazia recebida, usando data padrão');
    return "2024-01-01";
  }
  
  console.log(`🔍 Processando data: "${dateStr}"`);
  
  // Formato DD/MM/YYYY
  const ddmmyyyyMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    const result = `${year}-${month}-${day}`;
    console.log(`✅ Data DD/MM/YYYY convertida: "${dateStr}" -> "${result}"`);
    return result;
  }
  
  // Formato trimestral: "1 TRI/2023", "2 TRI/2023", etc.
  const trimestralMatch = dateStr.match(/(\d+)\s*TRI\/(\d{4})/i);
  if (trimestralMatch) {
    const [, trimestre, year] = trimestralMatch;
    // Converte trimestre para mês (1º tri = março, 2º tri = junho, etc.)
    const monthByTrimestre: Record<string, string> = {
      '1': '03', // 1º trimestre = março
      '2': '06', // 2º trimestre = junho  
      '3': '09', // 3º trimestre = setembro
      '4': '12'  // 4º trimestre = dezembro
    };
    const month = monthByTrimestre[trimestre] || '03';
    const result = `${year}-${month}-31`; // Último dia do trimestre
    console.log(`✅ Data trimestral convertida: "${dateStr}" -> "${result}"`);
    return result;
  }
  
  // Formato MM/YYYY
  const mmyyyyMatch = dateStr.match(/(\d{2})\/(\d{4})/);
  if (mmyyyyMatch) {
    const [, month, year] = mmyyyyMatch;
    const result = `${year}-${month}-01`;
    console.log(`✅ Data MM/YYYY convertida: "${dateStr}" -> "${result}"`);
    return result;
  }
  
  // Formato YYYY-MM-DD (já correto)
  const yyyymmddMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (yyyymmddMatch) {
    console.log(`✅ Data já no formato correto: "${dateStr}"`);
    return dateStr;
  }
  
  console.warn(`❌ Formato de data não reconhecido: "${dateStr}", usando data padrão`);
  return "2024-01-01";
}
