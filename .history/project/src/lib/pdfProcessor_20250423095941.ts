// Este arquivo foi limpo para reimplementação do sistema de extração de PDF.
// Implemente a nova lógica de extração a partir deste ponto.

export interface SituacaoFiscalData {
  parcelamentosSipade: any[];
  pendenciasDebito: any[];
  processosFiscais: any[];
  parcelamentosSiefpar: any[];
  debitosSicob: any[];
  pendenciasInscricao: any[];
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

  // Retorna o texto extraído no campo pendenciasDebito como exemplo
  // Ajuste conforme a estrutura desejada posteriormente
  return {
    parcelamentosSipade: [],
    pendenciasDebito: [{ texto: data.text }],
    processosFiscais: [],
    parcelamentosSiefpar: [],
    debitosSicob: [],
    pendenciasInscricao: [],
  };
}

// Função placeholder para conversão dos dados extraídos (a ser implementada)
export function convertToOrderItems(data: SituacaoFiscalData): any[] {
  // TODO: Implementar conversão dos dados extraídos para OrderItem[]
  return [];
}
