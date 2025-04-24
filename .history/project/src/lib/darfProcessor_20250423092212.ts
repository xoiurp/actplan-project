import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

import { OrderItem } from '@/types';

export interface DarfData {
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
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const result: DarfData[] = [];

    // Processar cada página do PDF
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items.map((item: any) => item.str).join(' ');

      // Extrair dados do DARF usando expressões regulares
      // Aqui serão implementadas as regras específicas para extração dos dados do DARF
      throw new Error('Implementação em desenvolvimento');
    }

    return result;
  } catch (error) {
    console.error('Erro no processamento do DARF:', error);
    throw error;
  }
}

export function convertDarfToOrderItems(darfData: DarfData[]): OrderItem[] {
  return darfData.map(darf => ({
    id: crypto.randomUUID(),
    order_id: '',
    code: darf.code,
    tax_type: darf.taxType,
    start_period: darf.period,
    end_period: darf.period,
    due_date: darf.dueDate,
    original_value: darf.principal,
    current_balance: darf.totalValue,
    fine: darf.fine,
    interest: darf.interest,
    status: 'PENDENTE',
    cno: darf.cno,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
}
