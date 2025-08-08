import { Customer } from '@/types';

type StatusColor = 'green' | 'yellow' | 'red' | 'blue' | 'gray';

export interface StatusInfo {
  label: string;
  color: StatusColor;
  description: string;
}

// Mapeamento de status de negociação para informações visuais
const negotiationStatusMap: Record<NonNullable<Customer['status']>, StatusInfo> = {
  'Prospect': { label: 'Prospect', color: 'blue', description: 'Cliente em fase inicial de contato.' },
  'Proposta Enviada': { label: 'Proposta Enviada', color: 'blue', description: 'A proposta comercial foi enviada ao cliente.' },
  'Aguardando Assinatura': { label: 'Aguardando Assinatura', color: 'yellow', description: 'Aguardando a assinatura do contrato pelo cliente.' },
  'Ativo': { label: 'Ativo', color: 'green', description: 'Cliente com contrato assinado e serviços ativos.' },
  'Inativo/Pausado': { label: 'Inativo/Pausado', color: 'gray', description: 'O contrato com o cliente está inativo ou pausado.' },
};

// Mapeamento de status do certificado para informações visuais
const certificateStatusMap = {
  valid: { label: 'Certificado Válido', color: 'green', description: 'O certificado digital está válido.' },
  expired: { label: 'Certificado Vencido', color: 'red', description: 'O certificado digital do cliente está vencido.' },
  no_certificate: { label: 'Sem Certificado', color: 'yellow', description: 'O cliente não possui um certificado digital cadastrado.' },
};

export function useCustomerStatus(customer: Customer | null | undefined) {
  if (!customer) {
    return {
      negotiationStatus: null,
      certificateStatus: null,
      allStatuses: [],
    };
  }

  // 1. Determinar o Status de Negociação
  const negotiationStatusInfo = negotiationStatusMap[customer.status || 'Prospect'];

  // 2. Determinar o Status do Certificado
  let certificateStatusInfo: StatusInfo;
  if (!customer.certificado) {
    certificateStatusInfo = certificateStatusMap.no_certificate;
  } else if (customer.certificado_validade) {
    const expiryDate = new Date(customer.certificado_validade);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zera a hora para comparar apenas a data

    if (expiryDate < today) {
      certificateStatusInfo = certificateStatusMap.expired;
    } else {
      certificateStatusInfo = certificateStatusMap.valid;
    }
  } else {
    // Se tem o objeto certificado mas não tem a data de validade, considera como se não tivesse.
    certificateStatusInfo = certificateStatusMap.no_certificate;
  }

  // 3. Compilar todos os status para exibição (ex: Badges)
  const allStatuses: StatusInfo[] = [];
  if (negotiationStatusInfo) {
    allStatuses.push(negotiationStatusInfo);
  }
  // Adiciona o status do certificado apenas se não for "Válido", para não poluir a UI.
  if (certificateStatusInfo && certificateStatusInfo.label !== 'Certificado Válido') {
    allStatuses.push(certificateStatusInfo);
  }

  return {
    negotiationStatus: negotiationStatusInfo,
    certificateStatus: certificateStatusInfo,
    allStatuses,
  };
}
