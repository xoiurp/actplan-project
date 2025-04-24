import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

// Interfaces para cada tipo de item que pode ser extraído do PDF
interface ParcelamentoSipade {
  cnpj: string;
  processo: string;
  receita: string;
  situacao: string;
}

interface PendenciaDebito {
  cnpj: string;
  receita: string;
  periodo_apuracao: string;
  vencimento: string;
  valor_original: number;
  saldo_devedor: number;
  multa: number;
  juros: number;
  saldo_devedor_consolidado: number;
  situacao: string;
}

interface ProcessoFiscal {
  cnpj: string;
  processo: string;
  situacao: string;
  localizacao: string;
}

interface ParcelamentoSiefpar {
  cnpj: string;
  parcelamento: string;
  valor_suspenso: number;
  tipo: string;
}

interface DebitoSicob {
  cnpj: string;
  parcelamento: string;
  situacao: string;
  tipo: string;
}

interface PendenciaInscricao {
  cnpj: string;
  inscricao: string;
  receita: string;
  data_inscricao: string;
  processo: string;
  tipo_devedor: string;
  situacao: string;
}

// Interface que agrupa todos os tipos de dados que podem ser extraídos
export interface SituacaoFiscalData {
  parcelamentosSipade: ParcelamentoSipade[];
  pendenciasDebito: PendenciaDebito[];
  processosFiscais: ProcessoFiscal[];
  parcelamentosSiefpar: ParcelamentoSiefpar[];
  debitosSicob: DebitoSicob[];
  pendenciasInscricao: PendenciaInscricao[];
}

export async function processSituacaoFiscalPDF(file: File): Promise<SituacaoFiscalData> {
  try {
    // Nova implementação será feita aqui
    throw new Error('Implementação em desenvolvimento');
  } catch (error) {
    console.error('Erro no processamento do PDF:', error);
    throw error;
  }
}
