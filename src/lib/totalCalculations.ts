import { OrderItem, Order } from '../types';

interface SectionInclusionFlags {
  include_pendencias_debito?: boolean;
  include_debitos_exig_suspensa?: boolean;
  include_parcelamentos_siefpar?: boolean;
  include_pendencias_inscricao?: boolean;
  include_pendencias_parcelamento?: boolean;
  include_simples_nacional?: boolean;
  include_darf?: boolean;
}

// Mapeia tipos de imposto para suas respectivas seções
const TAX_TYPE_TO_SECTION: Record<string, keyof SectionInclusionFlags> = {
  'DEBITO': 'include_pendencias_debito',
  'PIS': 'include_pendencias_debito',
  'COFINS': 'include_pendencias_debito',
  'IRPJ': 'include_pendencias_debito',
  'CSLL': 'include_pendencias_debito',
  'CP-TERCEIROS': 'include_pendencias_debito',
  'CP-PATRONAL': 'include_pendencias_debito',
  'IRRF': 'include_pendencias_debito',
  'DEBITO_EXIG_SUSPENSA_SIEF': 'include_debitos_exig_suspensa',
  'PARCELAMENTO_SIEFPAR': 'include_parcelamentos_siefpar',
  'PENDENCIA_INSCRICAO_SIDA': 'include_pendencias_inscricao',
  'PENDENCIA_PARCELAMENTO_SISPAR': 'include_pendencias_parcelamento',
  'SIMPLES_NACIONAL': 'include_simples_nacional',
  'DARF': 'include_darf'
};

// Valores padrão das flags (mesmos da migração)
const DEFAULT_FLAGS: SectionInclusionFlags = {
  include_pendencias_debito: true,
  include_debitos_exig_suspensa: false,
  include_parcelamentos_siefpar: false,
  include_pendencias_inscricao: true,
  include_pendencias_parcelamento: true,
  include_simples_nacional: true,
  include_darf: true
};

/**
 * Verifica se um item deve ser incluído no cálculo baseado nas flags
 */
export function shouldIncludeItem(item: OrderItem, flags: SectionInclusionFlags): boolean {
  const sectionKey = TAX_TYPE_TO_SECTION[item.tax_type];
  
  if (!sectionKey) {
    // Se não conhecemos o tipo, usa o padrão de incluir
    console.warn(`Tipo de imposto desconhecido: ${item.tax_type}`);
    return true;
  }
  
  // Usa a flag específica ou o valor padrão
  return flags[sectionKey] ?? DEFAULT_FLAGS[sectionKey] ?? true;
}

/**
 * Calcula o total de itens baseado nas flags de inclusão
 */
export function calculateFilteredTotal(
  items: OrderItem[], 
  flags: SectionInclusionFlags,
  selector: (item: OrderItem) => number = (item) => item.saldo_devedor_consolidado || item.current_balance || 0
): number {
  return items
    .filter(item => shouldIncludeItem(item, flags))
    .reduce((sum, item) => sum + selector(item), 0);
}

/**
 * Calcula totais por seção
 */
export function calculateSectionTotals(
  items: OrderItem[],
  selector: (item: OrderItem) => number = (item) => item.saldo_devedor_consolidado || item.current_balance || 0
): Record<string, number> {
  const totals: Record<string, number> = {};
  
  items.forEach(item => {
    const sectionKey = TAX_TYPE_TO_SECTION[item.tax_type];
    if (sectionKey) {
      if (!totals[sectionKey]) {
        totals[sectionKey] = 0;
      }
      totals[sectionKey] += selector(item);
    }
  });
  
  return totals;
}

/**
 * Calcula contagens por seção
 */
export function calculateSectionCounts(items: OrderItem[]): Record<string, number> {
  const counts: Record<string, number> = {};
  
  items.forEach(item => {
    const sectionKey = TAX_TYPE_TO_SECTION[item.tax_type];
    if (sectionKey) {
      if (!counts[sectionKey]) {
        counts[sectionKey] = 0;
      }
      counts[sectionKey] += 1;
    }
  });
  
  return counts;
}

/**
 * Calcula contagens e totais por tax_type para uso no componente de controle
 */
export function calculateItemStatsByTaxType(items: OrderItem[]): {
  counts: Record<string, number>;
  totals: Record<string, number>;
} {
  const counts: Record<string, number> = {};
  const totals: Record<string, number> = {};
  
  items.forEach(item => {
    const taxType = item.tax_type;
    
    // Contagem
    counts[taxType] = (counts[taxType] || 0) + 1;
    
    // Total
    const value = item.saldo_devedor_consolidado || item.current_balance || 0;
    totals[taxType] = (totals[taxType] || 0) + value;
  });
  
  return { counts, totals };
}

/**
 * Extrai flags de inclusão de um objeto Order
 */
export function extractInclusionFlags(order?: Partial<Order>): SectionInclusionFlags {
  if (!order) return DEFAULT_FLAGS;
  
  return {
    include_pendencias_debito: order.include_pendencias_debito ?? DEFAULT_FLAGS.include_pendencias_debito,
    include_debitos_exig_suspensa: order.include_debitos_exig_suspensa ?? DEFAULT_FLAGS.include_debitos_exig_suspensa,
    include_parcelamentos_siefpar: order.include_parcelamentos_siefpar ?? DEFAULT_FLAGS.include_parcelamentos_siefpar,
    include_pendencias_inscricao: order.include_pendencias_inscricao ?? DEFAULT_FLAGS.include_pendencias_inscricao,
    include_pendencias_parcelamento: order.include_pendencias_parcelamento ?? DEFAULT_FLAGS.include_pendencias_parcelamento,
    include_simples_nacional: order.include_simples_nacional ?? DEFAULT_FLAGS.include_simples_nacional,
    include_darf: order.include_darf ?? DEFAULT_FLAGS.include_darf
  };
} 