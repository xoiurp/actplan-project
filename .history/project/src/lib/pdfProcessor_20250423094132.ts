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


      // Identificar seções e extrair dados
      if (text.includes('Parcelamento com Exigibilidade Suspensa (SIPADE)')) {
        console.log('Encontrada seção SIPADE');
        currentSection = 'SIPADE';
        const regex = /(\d{5}\.\d{3}\.\d{3}\/\d{4}-\d{2})\s+(\d{4}-[A-Z]+(?:-[A-Z]+)?)\s+(ATIVO|SUSPENSO|CANCELADO)/g;
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

      if (text.includes('Pendência - Débito (SIEF)') || text.includes('Pendência - Débito ( SIEF )')) {
        console.log('Encontrada seção SIEF');
        console.log('Texto completo da seção:', text);
        currentSection = 'SIEF';
        
        // Extrai a tabela de débitos (mais flexível com espaços e cabeçalho)
        // Extrai a tabela de débitos incluindo o cabeçalho
        const tableMatch = text.match(/Pendência\s*-\s*Débito\s*\(\s*SIEF\s*\)(.*?)(?=(?:Processo\s+Fiscal|Parcelamento\s+com\s+Exigibilidade|Débito\s+com\s+Exigibilidade|Pendência\s*-\s*Inscrição|$))/s);
        if (tableMatch) {
          const tableText = tableMatch[1];
          console.log('=== TABELA DE DÉBITOS ===');
          console.log(tableText);
          
          // Regex mais precisa para capturar os dados da tabela SIEF
          // Regex mais flexível para capturar os dados da tabela SIEF
          const regex = /(\d{4}-\d{2}\s*-\s*[A-Z]+(?:\s*-\s*[A-Z]+)?|\d{4}-\d{2}\s*-\s*[A-Z]+(?:\s+-\s+[A-Z]+)?)\s+(\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(\d+(?:\.\d{3})*(?:,\d{2})?)\s+(\d+(?:\.\d{3})*(?:,\d{2})?)\s+(\d+(?:\.\d{3})*(?:,\d{2})?)\s+(\d+(?:\.\d{3})*(?:,\d{2})?)\s+(\d+(?:\.\d{3})*(?:,\d{2})?)\s+([\w\/]+(?:\s+[\w\/]+)*)(?:\s+CNO:\s*(\d+(?:\.\d+)*\/\d+))?/g;
          
          console.log('=== TENTANDO MATCH COM REGEX ===');
          console.log('Regex pattern:', regex.source);
          const matches = tableText.matchAll(regex);
          let count = 0;
          for (const match of matches) {
            result.pendenciasDebito.push({
              cnpj: currentCnpj,
              receita: match[1].trim(),
              periodo_apuracao: match[2],
              vencimento: match[3],
              valor_original: parseFloat(match[4].replace(/\./g, '').replace(',', '.')),
              saldo_devedor: parseFloat(match[5].replace(/\./g, '').replace(',', '.')),
              multa: parseFloat(match[6].replace(/\./g, '').replace(',', '.')),
              juros: parseFloat(match[7].replace(/\./g, '').replace(',', '.')),
              saldo_devedor_consolidado: parseFloat(match[8].replace(/\./g, '').replace(',', '.')),
              situacao: match[9],
              cno: match[10] || undefined
            });
            count++;
            console.log('Match encontrado:', {
              receita: match[1].trim(),
              periodo: match[2],
              vencimento: match[3],
              valor_original: match[4],
              saldo_devedor: match[5],
              multa: match[6],
              juros: match[7],
              saldo_consolidado: match[8],
              situacao: match[9],
              cno: match[10] || 'N/A'
            });
          }
          console.log(`Total de pendências SIEF encontradas: ${count}`);
        }
      }

      if (text.includes('Processo Fiscal com Exigibilidade Suspensa (SIEF)')) {
        console.log('Encontrada seção Processo Fiscal');
        currentSection = 'PROCESSO_FISCAL';
        const regex = /(\d{5}\.\d{3}\.\d{3}\/\d{4}-\d{2})\s+([\w-]+(?:\s*-\s*[\w\s]+)*)\s+(.*)/g;
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
        const regex = /(\d{2}\.\d{1}\.\d{2}\.\d{6}-\d{2})\s+(\d{4}-[A-Z]+)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{5}\.\d{3}\.\d{3}\/\d{4}-\d{2})\s+(PRINCIPAL|CORRESPONSAVEL)\s+(ATIVA(?:\s+A\s+SER\s+AJUIZADA)?|SUSPENSA)/g;
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
