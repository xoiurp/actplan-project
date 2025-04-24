import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface DarfData {
  code: string;
  taxType: string;
  period: string; 
  dueDate: string;
  principal: number;
  fine: number;
  interest: number;
  totalValue: number;
  cno?: string;
}

export async function processDarfPDF(file: File): Promise<DarfData[]> {
  try {
    // Nova implementação será feita aqui
    throw new Error('Implementação em desenvolvimento');
  } catch (error) {
    console.error('Erro no processamento do DARF:', error);
    throw error;
  }
}
