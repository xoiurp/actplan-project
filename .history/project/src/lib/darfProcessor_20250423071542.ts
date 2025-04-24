import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const DEBUG = true;

interface DarfData {
  code: string;
  taxType: string;
  period: string; 
  dueDate: string;
  principal: number;
  fine: number;
  interest: number;
  totalValue: number;
  cno?: string; // CNO para CP-PATRONAL
}

export async function processDarfPDF(file: File): Promise<DarfData[]> {
  // A nova lógica de extração será implementada aqui
  console.log('Processamento de DARF desabilitado temporariamente.');
  return [];
}
