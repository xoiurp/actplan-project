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

    // Processar cada página do PDF
    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`Processando página ${i}...`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items.map((item: any) => item.str).join(' ');
      console.log('Texto extraído:', text.substring(0, 100) + '...');

      // Extrair CNPJ principal
      const cnpjMatch = text.match(/CNPJ:\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);
      if (cnpjMatch) {
        currentCnpj = cnpjMatch[1];
        console.log('CNPJ encontrado:', currentCnpj);
      }

      // Identificar seções e extrair dados
      if (text.includes('Parcelamento com Exigibilidade Suspensa (SIPADE)')) {
        console.log('Encontrada seção SIPADE');
        currentSection = 'SIPADE';
        const regex = /(\d{5}\.\d{3}\.\d{3}\/\d{4}-\d{2})\s+(\d{4}-[\w\s]+)\s+(ATIVO|SUSPENSO|CANCELADO)/g;
        const matches = text.matchAll(regex);
        for (const match of matches) {
          result.parcelamentosSipade.push({
            cnpj: currentCnpj,
            processo: match[1],
            receita: match[2].trim(),
            situacao: match[3]
          });
          console.log('Parcelamento SIPADE adicionado:', {
            processo: match[1],
            receita: match[2].trim()
          });
        }
      }

      if (text.includes('Pendência - Débito (SIEF)')) {
        console.log('Encontrada seção SIEF');
        currentSection = 'SIEF';
        const regex = /(\d{4}-\d{2}\s*-\s*[A-Z]+|\d{4}\s*-\s*[A-Z]+)\s+(\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(\d+[.,]\d+)\s+(\d+[.,]\d+)\s+(\d+[.,]\d+)\s+(\d+[.,]\d+)\s+(\d+[.,]\d+)\s+(\w+)(?:\s+CNO:\s+(\d+(?:\.\d+)*\/\d+))?/g;
        const matches = text.matchAll(regex);
        let count = 0;
        for (const match of matches) {
          result.pendenciasDebito.push({
            cnpj: currentCnpj,
            receita: match[1].trim(),
            periodo_apuracao: match[2],
            vencimento: match[3],
            valor_original: parseFloat(match[4].replace(',', '.')),
            saldo_devedor: parseFloat(match[5].replace(',', '.')),
            multa: parseFloat(match[6].replace(',', '.')),
            juros: parseFloat(match[7].replace(',', '.')),
            saldo_devedor_consolidado: parseFloat(match[8].replace(',', '.')),
            situacao: match[9],
            cno: match[10] || undefined
          });
          count++;
          console.log('Pendência SIEF adicionada:', {
            periodo: match[1],
            valor: match[3],
            cno: match[9] || 'N/A'
          });
        }
        console.log(`Total de pendências SIEF encontradas: ${count}`);
      }

      if (text.includes('Processo Fiscal com Exigibilidade Suspensa (SIEF)')) {
        console.log('Encontrada seção Processo Fiscal');
        currentSection = 'PROCESSO_FISCAL';
        const regex = /(\d{5}\.\d{3}\.\d{3}\/\d{4}-\d{2})\s+([\w-]+(?:\s*-\s*[\w\s]+)?)\s+(.*)/g;
        const matches = text.matchAll(regex);
        for (const match of matches) {
          result.processosFiscais.push({
            cnpj: currentCnpj,
            processo: match[1],
            situacao: match[2],
            localizacao: match[3].trim()
          });
        }
      }

      if (text.includes('Parcelamento com Exigibilidade Suspensa (SIEFPAR)')) {
        console.log('Encontrada seção SIEFPAR');
        currentSection = 'SIEFPAR';
        const regex = /Parcelamento:\s*(\d{23})\s*Valor Suspenso:\s*([\d,.]+)\s*(.*)/g;
        const matches = text.matchAll(regex);
        for (const match of matches) {
          result.parcelamentosSiefpar.push({
            cnpj: currentCnpj,
            parcelamento: match[1],
            valor_suspenso: parseFloat(match[2].replace('.', '').replace(',', '.')),
            tipo: match[3].trim()
          });
        }
      }

      if (text.includes('Débito com Exigibilidade Suspensa (SICOB)')) {
        console.log('Encontrada seção SICOB');
        currentSection = 'SICOB';
        const regex = /Parcelamento:\s*(\d{8}-\d)\s*Situacao:\s*([\w\/\s]+)\s*Tipo:\s*(.*?)(?=\n|$)/g;
        const matches = text.matchAll(regex);
        for (const match of matches) {
          result.debitosSicob.push({
            cnpj: currentCnpj,
            parcelamento: match[1],
            situacao: match[2].trim(),
            tipo: match[3].trim()
          });
        }
      }

      if (text.includes('Pendência - Inscrição (SIDA)')) {
        console.log('Encontrada seção SIDA');
        currentSection = 'SIDA';
        const regex = /(\d{2}\.\d{1}\.\d{2}\.\d{6}-\d{2})\s+(\d{4}-[\w\s]+)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{5}\.\d{3}\.\d{3}\/\d{4}-\d{2})\s+([\w\s]+)\s+([\w\s]+(?:\s+A\s+SER\s+AJUIZADA)?)/g;
        const matches = text.matchAll(regex);
        for (const match of matches) {
          result.pendenciasInscricao.push({
            cnpj: currentCnpj,
            inscricao: match[1],
            receita: match[2],
            data_inscricao: match[3],
            processo: match[4],
            tipo_devedor: match[5].trim(),
            situacao: match[6].trim()
          });
        }
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

// Função para converter os dados extraídos em OrderItems
export function convertToOrderItems(data: SituacaoFiscalData): OrderItem[] {
  const items: OrderItem[] = [];

  // Converter Pendências de Débito
  data.pendenciasDebito.forEach(debito => {
    items.push({
      id: crypto.randomUUID(), // Gera um ID único temporário
      order_id: '', // Será preenchido quando o pedido for criado
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
      start_period: '', // Não disponível no SIPADE
      end_period: '', // Não disponível no SIPADE
      due_date: '', // Não disponível no SIPADE
      original_value: 0, // Não disponível no SIPADE
      current_balance: 0, // Não disponível no SIPADE
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
      start_period: '', // Não disponível no SIEFPAR
      end_period: '', // Não disponível no SIEFPAR
      due_date: '', // Não disponível no SIEFPAR
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
      start_period: '', // Não disponível no SICOB
      end_period: '', // Não disponível no SICOB
      due_date: '', // Não disponível no SICOB
      original_value: 0, // Não disponível no SICOB
      current_balance: 0, // Não disponível no SICOB
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
      start_period: '', // Não disponível na inscrição
      end_period: '', // Não disponível na inscrição
      due_date: inscricao.data_inscricao,
      original_value: 0, // Não disponível na inscrição
      current_balance: 0, // Não disponível na inscrição
      fine: 0,
      interest: 0,
      status: inscricao.situacao,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  });

  return items;
}
