import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const DEBUG = true;

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
  cno?: string;
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

import { OrderItem } from '@/types';

// Funções auxiliares
function formatDate(date: string): string {
  const [month, year] = date.split('/');
  return `01/${month}/${year}`;
}

function parseValue(value: string): number {
  return parseFloat(value.replace(/\./g, '').replace(',', '.'));
}

function isCodeLine(line: string): boolean {
  return /^\d{4}[\s-]+\d{2}(?:\s*[-\s]+[A-Z]+)?/.test(line) ||
         /^\d{4}-[A-Z]+$/.test(line);
}

function isTaxTypeLine(line: string): boolean {
  return (/^(?:CP-)?[A-Z]/.test(line) && !line.startsWith('CNO:')) ||
         /^\d{4}[\s-]+\d{2}\s*[-\s]+(IRPJ|CSLL|PIS|COFINS)$/.test(line) ||
         /^(IRPJ|CSLL|PIS|COFINS)$/.test(line);
}

function isDateLine(line: string): boolean {
  return /^\d{2}\/(?:\d{2}\/)?\d{4}$/.test(line);
}

function isValueLine(line: string): boolean {
  return /^\d+(?:\.\d+)*,\d+$/.test(line) ||
         /^\d+\.\d+\.\d+\/\d+-\d+$/.test(line);
}

function extractValue(line: string): number {
  if (/^\d+(?:\.\d+)*,\d+$/.test(line)) {
    return parseValue(line);
  } else if (/^\d+\.\d+\.\d+\/\d+-\d+$/.test(line)) {
    const parts = line.split('/')[0].split('.');
    return parseFloat(parts.join(''));
  }
  return 0;
}

function isStatusLine(line: string): boolean {
  return /^(DEVEDOR|ATIVO|SUSPENSO|CANCELADO)$/i.test(line);
}

function extractSIEFItems(text: string, currentCnpj: string): PendenciaDebito[] {
  const items: PendenciaDebito[] = [];
  
  // Split the text into lines
  let allLines = text.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('CNO:'));
  
  if (DEBUG) {
    console.log('=== Starting SIEF extraction ===');
    console.log('Total lines:', allLines.length);
  }

  let currentItem: Partial<PendenciaDebito> = {};
  let values: string[] = [];

  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    const nextLine = i < allLines.length - 1 ? allLines[i + 1] : '';
    
    if (DEBUG) {
      console.log(`Processing line ${i}:`, line);
    }

    if (isCodeLine(line)) {
      // Se temos um item completo, adicionamos à lista
      if (currentItem.receita && currentItem.periodo_apuracao && 
          currentItem.vencimento && values.length >= 5) {
        try {
          items.push({
            cnpj: currentCnpj,
            receita: currentItem.receita,
            periodo_apuracao: currentItem.periodo_apuracao,
            vencimento: currentItem.vencimento,
            valor_original: values[0] ? extractValue(values[0]) : 0,
            saldo_devedor: values[1] ? extractValue(values[1]) : 0,
            multa: values[2] ? extractValue(values[2]) : 0,
            juros: values[3] ? extractValue(values[3]) : 0,
            saldo_devedor_consolidado: values[4] ? extractValue(values[4]) : 0,
            situacao: currentItem.situacao || 'DEVEDOR'
          } as PendenciaDebito);
          
          if (DEBUG) {
            console.log('Added item:', items[items.length - 1]);
          }
        } catch (error) {
          console.error('Error creating item:', error);
        }
      }

      // Extract code and possibly tax type
      let codeMatch = line.match(/^(\d{4})[\s-]+(\d{2})(?:\s*[-\s]+([A-Z]+))?/);
      if (codeMatch) {
        currentItem = { receita: `${codeMatch[1]}-${codeMatch[2]}` };
        if (codeMatch[3]) {
          currentItem.receita += ` - ${codeMatch[3]}`;
        }
      }
      
      values = [];
      
      if (DEBUG) {
        console.log('Started new item with code:', currentItem.receita);
      }
    } else if (isDateLine(line)) {
      if (!currentItem.periodo_apuracao && line.length === 7) {
        currentItem.periodo_apuracao = line;
      } else if (!currentItem.vencimento && line.length === 10) {
        currentItem.vencimento = line;
      }
    } else if (isValueLine(line)) {
      values.push(line);
    } else if (isStatusLine(line)) {
      currentItem.situacao = line;
    }
  }

  // Tenta adicionar o último item se estiver completo
  if (currentItem.receita && currentItem.periodo_apuracao && 
      currentItem.vencimento && values.length >= 5) {
    items.push({
      cnpj: currentCnpj,
      receita: currentItem.receita,
      periodo_apuracao: currentItem.periodo_apuracao,
      vencimento: currentItem.vencimento,
      valor_original: values[0] ? extractValue(values[0]) : 0,
      saldo_devedor: values[1] ? extractValue(values[1]) : 0,
      multa: values[2] ? extractValue(values[2]) : 0,
      juros: values[3] ? extractValue(values[3]) : 0,
      saldo_devedor_consolidado: values[4] ? extractValue(values[4]) : 0,
      situacao: currentItem.situacao || 'DEVEDOR'
    } as PendenciaDebito);
  }

  return items;
}

export async function processSituacaoFiscalPDF(file: File): Promise<SituacaoFiscalData> {
  try {
    console.log('Iniciando processamento do PDF...');
    const arrayBuffer = await file.arrayBuffer();
    console.log('ArrayBuffer criado');
    
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    console.log(`PDF carregado. Total de páginas: ${pdf.numPages}`);
    
    const result: SituacaoFiscalData = {
      parcelamentosSipade: [],
      pendenciasDebito: [],
      processosFiscais: [],
      parcelamentosSiefpar: [],
      debitosSicob: [],
      pendenciasInscricao: []
    };

    let currentCnpj = '';
    let currentSection = '';
    let sectionText = '';

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

      // Extrair CNPJ principal
      const cnpjMatch = text.match(/CNPJ[:\s]*(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/);
      if (cnpjMatch) {
        currentCnpj = cnpjMatch[1];
        console.log('CNPJ encontrado:', currentCnpj);
      }

      // Processa o texto por seções
      const sections = text.split(/(?=Pendência|Parcelamento|Processo|Débito)/);
      for (const section of sections) {
        if (section.includes('Pendência - Débito (SIEF)')) {
          console.log('Encontrada seção SIEF');
          const items = extractSIEFItems(section, currentCnpj);
          result.pendenciasDebito.push(...items);
        }
        // Adicione aqui o processamento das outras seções conforme necessário
      }
    }

    console.log('Processamento concluído. Resultado:', {
      parcelamentosSipade: result.parcelamentosSipade.length,
      pendenciasDebito: result.pendenciasDebito.length,
      processosFiscais: result.processosFiscais.length,
      parcelamentosSiefpar: result.parcelamentosSiefpar.length,
      debitosSicob: result.debitosSicob.length,
      pendenciasInscricao: result.pendenciasInscricao.length
    });

    return result;
  } catch (error) {
    console.error('Erro no processamento do PDF:', error);
    throw error;
  }
}

export function convertToOrderItems(data: SituacaoFiscalData): OrderItem[] {
  const items: OrderItem[] = [];

  // Converter Pendências de Débito
  data.pendenciasDebito.forEach(debito => {
    items.push({
      id: crypto.randomUUID(),
      order_id: '',
      code: debito.receita,
      tax_type: 'DEBITO',
      start_period: debito.periodo_apuracao,
      end_period: debito.periodo_apuracao,
      due_date: debito.vencimento,
      original_value: debito.valor_original,
      current_balance: debito.saldo_devedor,
      fine: debito.multa,
      interest: debito.juros,
      status: debito.situacao,
      cno: debito.cno,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  });

  // Converter Parcelamentos SIPADE
  data.parcelamentosSipade.forEach(parcelamento => {
    items.push({
      id: crypto.randomUUID(),
      order_id: '',
      code: parcelamento.processo,
      tax_type: 'PARCELAMENTO_SIPADE',
      start_period: '',
      end_period: '',
      due_date: '',
      original_value: 0,
      current_balance: 0,
      fine: 0,
      interest: 0,
      status: parcelamento.situacao,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  });

  // Converter Parcelamentos SIEFPAR
  data.parcelamentosSiefpar.forEach(parcelamento => {
    items.push({
      id: crypto.randomUUID(),
      order_id: '',
      code: parcelamento.parcelamento,
      tax_type: 'PARCELAMENTO_SIEFPAR',
      start_period: '',
      end_period: '',
      due_date: '',
      original_value: parcelamento.valor_suspenso,
      current_balance: parcelamento.valor_suspenso,
      fine: 0,
      interest: 0,
      status: 'SUSPENSO',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  });

  // Converter Débitos SICOB
  data.debitosSicob.forEach(debito => {
    items.push({
      id: crypto.randomUUID(),
      order_id: '',
      code: debito.parcelamento,
      tax_type: 'DEBITO_SICOB',
      start_period: '',
      end_period: '',
      due_date: '',
      original_value: 0,
      current_balance: 0,
      fine: 0,
      interest: 0,
      status: debito.situacao,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  });

  // Converter Pendências de Inscrição
  data.pendenciasInscricao.forEach(inscricao => {
    items.push({
      id: crypto.randomUUID(),
      order_id: '',
      code: inscricao.inscricao,
      tax_type: inscricao.receita,
      start_period: '',
      end_period: '',
      due_date: inscricao.data_inscricao,
      original_value: 0,
      current_balance: 0,
      fine: 0,
      interest: 0,
      status: inscricao.situacao,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  });

  return items;
}
