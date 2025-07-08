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

// Função placeholder para processamento de PDF DARF (a ser implementada)
export async function processDarfPDF(file: File): Promise<DarfData[]> {
  const formData = new FormData();
  formData.append('file', file);

  // Construct DARF API URL properly
  const baseExtractionUrl = import.meta.env.VITE_EXTRACTION_API_URL || 'http://localhost:8000/api/extraction/extract';
  
  // Replace only the endpoint at the end
  const apiUrl = baseExtractionUrl.replace(/\/extract$/, '/extract-darf');
  
  console.log('DARF API URL:', apiUrl); // Debug log
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Erro ao processar PDF do DARF no backend');
  }

  const responseData = await response.json();
  
  if (responseData.error) {
    throw new Error(responseData.error);
  }

  const backendData: BackendDarfData[] = responseData.data || [];
  
  // Converte do formato do backend para o formato esperado pelo frontend
  return backendData.map(item => ({
    code: item.codigo,
    taxType: item.denominacao,
    period: item.periodo_apuracao,
    dueDate: formatDateFromDDMMYYYY(item.vencimento),
    principal: item.principal,
    fine: item.multa,
    interest: item.juros,
    totalValue: item.total
  }));
}

// Função placeholder para conversão dos dados extraídos (a ser implementada)
export function convertDarfToOrderItems(darfData: DarfData[]): any[] {
  const now = new Date().toISOString();

  return darfData.map(darf => {
    // Garante que start_period e end_period nunca sejam string vazia
    const startPeriod = darf.period || darf.dueDate || '2024-01-01';
    const endPeriod = darf.period || darf.dueDate || '2024-01-01';
    const dueDate = darf.dueDate || '2024-01-01';

    console.log(`Criando OrderItem DARF - Code: ${darf.code}, Period: "${darf.period}", DueDate: "${darf.dueDate}"`);
    console.log(`  -> start_period: "${startPeriod}", end_period: "${endPeriod}", due_date: "${dueDate}"`);

    return {
      id: crypto.randomUUID(),
      order_id: "",
      code: darf.code,
      tax_type: "DARF",
      start_period: startPeriod,
      end_period: endPeriod,
      due_date: dueDate,
      original_value: darf.principal,
      current_balance: darf.totalValue,
      fine: darf.fine,
      interest: darf.interest,
      status: "PENDING",
      cno: "",
      denominacao: darf.taxType, // Preserva a denominação para exibição
      created_at: now,
      updated_at: now,
    };
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
