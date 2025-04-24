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

import { OrderItem } from '@/types';

export async function processSituacaoFiscalPDF(file: File): Promise<SituacaoFiscalData> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const result: SituacaoFiscalData = {
      parcelamentosSipade: [],
      pendenciasDebito: [],
      processosFiscais: [],
      parcelamentosSiefpar: [],
      debitosSicob: [],
      pendenciasInscricao: []
    };

    // Processar cada página do PDF
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items.map((item: any) => item.str).join(' ');

      // Identificar seções baseado em palavras-chave
      if (text.includes('SIPADE') || text.includes('Parcelamento com Exigibilidade Suspensa')) {
        // Extrair dados do SIPADE
        const matches = text.match(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/g);
        if (matches) {
          matches.forEach(processo => {
            result.parcelamentosSipade.push({
              cnpj: '', // Será preenchido quando encontrarmos o padrão de CNPJ
              processo,
              receita: 'SIPADE',
              situacao: 'ATIVO'
            });
          });
        }
      }

      if (text.includes('SIEF') || text.includes('Pendência - Débito')) {
        // Extrair dados de Pendências de Débito
        const matches = text.match(/(\d{2}\/\d{4})/g); // Padrão de período (MM/YYYY)
        if (matches) {
          matches.forEach(periodo => {
            result.pendenciasDebito.push({
              cnpj: '',
              receita: 'SIEF',
              periodo_apuracao: periodo,
              vencimento: '',
              valor_original: 0,
              saldo_devedor: 0,
              multa: 0,
              juros: 0,
              saldo_devedor_consolidado: 0,
              situacao: 'PENDENTE'
            });
          });
        }
      }

      // Procurar por CNPJs em toda a página
      const cnpjMatches = text.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g);
      if (cnpjMatches && cnpjMatches.length > 0) {
        const cnpj = cnpjMatches[0];
        // Atualizar o CNPJ em todos os itens
        result.parcelamentosSipade.forEach(item => item.cnpj = cnpj);
        result.pendenciasDebito.forEach(item => item.cnpj = cnpj);
        result.processosFiscais.forEach(item => item.cnpj = cnpj);
        result.parcelamentosSiefpar.forEach(item => item.cnpj = cnpj);
        result.debitosSicob.forEach(item => item.cnpj = cnpj);
        result.pendenciasInscricao.forEach(item => item.cnpj = cnpj);
      }
    }

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
