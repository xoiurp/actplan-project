import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const DEBUG = true;

export interface DarfData {
  periodo_apuracao: string;
  vencimento: string;
  receita: string;
  valor_principal: number;
  valor_multa: number;
  valor_juros: number;
  valor_total: number;
}

function parseValue(value: string): number {
  return parseFloat(value.replace(/\./g, '').replace(',', '.'));
}

function isDateLine(line: string): boolean {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(line);
}

function isValueLine(line: string): boolean {
  return /^\d+(?:\.\d+)*,\d+$/.test(line);
}

function isReceitaLine(line: string): boolean {
  return /^\d{4}[\s-]+\d{2}(?:\s*[-\s]+[A-Z]+)?/.test(line);
}

export function convertDarfToOrderItems(darf: DarfData): OrderItem[] {
  return [{
    id: crypto.randomUUID(),
    order_id: '',
    code: darf.receita,
    tax_type: 'DARF',
    start_period: darf.periodo_apuracao,
    end_period: darf.periodo_apuracao,
    due_date: darf.vencimento,
    original_value: darf.valor_principal,
    current_balance: darf.valor_total,
    fine: darf.valor_multa,
    interest: darf.valor_juros,
    status: 'DEVEDOR',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }];
}

export async function processDarfPDF(file: File): Promise<DarfData> {
  try {
    console.log('Iniciando processamento do DARF...');
    const arrayBuffer = await file.arrayBuffer();
    console.log('ArrayBuffer criado');
    
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    console.log(`PDF carregado. Total de páginas: ${pdf.numPages}`);

    let result: Partial<DarfData> = {};
    let values: string[] = [];

    // Processar cada página do PDF
    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`Processando página ${i}...`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Preserva a estrutura do texto mantendo as quebras de linha
      let lastY: number | null = null;
      const text = textContent.items
        .map((item: any) => {
          const currentY = item.transform[5];
          let result = item.str;
          
          if (lastY !== null && Math.abs(currentY - lastY) > 5) {
            result = '\n' + result;
          }
          
          lastY = currentY;
          return result;
        })
        .join(' ')
        .replace(/\s{3,}/g, '\n')
        .replace(/\n\s+/g, '\n')
        .trim();

      // Log do texto completo para debug
      if (DEBUG) {
        console.log('=== TEXTO COMPLETO DA PÁGINA ===');
        console.log(text);
        console.log('===============================');
      }

      // Processa linha por linha
      const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
      for (const line of lines) {
        if (DEBUG) {
          console.log('Processando linha:', line);
        }

        if (isDateLine(line)) {
          if (!result.periodo_apuracao) {
            result.periodo_apuracao = line;
          } else if (!result.vencimento) {
            result.vencimento = line;
          }
        } else if (isReceitaLine(line)) {
          result.receita = line;
        } else if (isValueLine(line)) {
          values.push(line);
        }
      }
    }

    // Processa os valores encontrados
    if (values.length >= 4) {
      result.valor_principal = parseValue(values[0]);
      result.valor_multa = parseValue(values[1]);
      result.valor_juros = parseValue(values[2]);
      result.valor_total = parseValue(values[3]);
    }

    if (!result.periodo_apuracao || !result.vencimento || !result.receita || values.length < 4) {
      throw new Error('Dados incompletos no DARF');
    }

    console.log('Processamento do DARF concluído:', result);
    return result as DarfData;
  } catch (error) {
    console.error('Erro no processamento do DARF:', error);
    throw error;
  }
}
