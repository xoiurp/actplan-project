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

  // Use localhost for development, production URL for deployment
  const apiUrl = import.meta.env.VITE_EXTRACTION_API_URL?.replace('/extract', '/extract-darf') || 'http://localhost:8000/api/extraction/extract-darf';
  
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

  return darfData.map(darf => ({
    id: crypto.randomUUID(),
    order_id: "",
    code: darf.code,
    tax_type: "DARF",
    start_period: darf.period,
    end_period: darf.period,
    due_date: darf.dueDate,
    original_value: darf.principal,
    current_balance: darf.totalValue,
    fine: darf.fine,
    interest: darf.interest,
    status: "PENDING",
    cno: "",
    created_at: now,
    updated_at: now,
  }));
}

// Helper function to convert DD/MM/YYYY to YYYY-MM-DD
function formatDateFromDDMMYYYY(dateStr: string): string {
  if (!dateStr) return "";
  
  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month}-${day}`;
  }
  
  return dateStr; // Return as-is if format doesn't match
}
