import React from 'react';
import { Switch } from './ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Calculator, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface SectionInclusionFlags {
  include_pendencias_debito?: boolean;
  include_debitos_exig_suspensa?: boolean;
  include_parcelamentos_siefpar?: boolean;
  include_pendencias_inscricao?: boolean;
  include_pendencias_parcelamento?: boolean;
  include_simples_nacional?: boolean;
  include_darf?: boolean;
}

interface SectionInclusionControlProps {
  flags: SectionInclusionFlags;
  onChange: (flags: SectionInclusionFlags) => void;
  itemCounts?: Record<string, number>;
  itemTotals?: Record<string, number>;
}

const sectionConfig = [
  {
    key: 'include_pendencias_debito' as keyof SectionInclusionFlags,
    label: 'Pendências - Débito',
    description: 'Débitos pendentes identificados na situação fiscal',
    defaultValue: true,
    taxTypes: ['DEBITO', 'PIS', 'COFINS', 'IRPJ', 'CSLL', 'CP-TERCEIROS', 'CP-PATRONAL', 'IRRF']
  },
  {
    key: 'include_debitos_exig_suspensa' as keyof SectionInclusionFlags,
    label: 'Débitos com Exigibilidade Suspensa',
    description: 'Débitos suspensos que podem não ser cobrados imediatamente',
    defaultValue: false,
    taxTypes: ['DEBITO_EXIG_SUSPENSA_SIEF']
  },
  {
    key: 'include_parcelamentos_siefpar' as keyof SectionInclusionFlags,
    label: 'Parcelamentos SIEFPAR',
    description: 'Parcelamentos em andamento que podem não gerar cobrança adicional',
    defaultValue: false,
    taxTypes: ['PARCELAMENTO_SIEFPAR']
  },
  {
    key: 'include_pendencias_inscricao' as keyof SectionInclusionFlags,
    label: 'Pendências - Inscrição',
    description: 'Pendências de inscrição em dívida ativa',
    defaultValue: true,
    taxTypes: ['PENDENCIA_INSCRICAO_SIDA']
  },
  {
    key: 'include_pendencias_parcelamento' as keyof SectionInclusionFlags,
    label: 'Pendências - Parcelamento',
    description: 'Pendências de parcelamento SISPAR',
    defaultValue: true,
    taxTypes: ['PENDENCIA_PARCELAMENTO_SISPAR']
  },
  {
    key: 'include_simples_nacional' as keyof SectionInclusionFlags,
    label: 'Simples Nacional',
    description: 'Débitos do Simples Nacional',
    defaultValue: true,
    taxTypes: ['SIMPLES_NACIONAL']
  },
  {
    key: 'include_darf' as keyof SectionInclusionFlags,
    label: 'DARF',
    description: 'Documentos de Arrecadação de Receitas Federais',
    defaultValue: true,
    taxTypes: ['DARF']
  }
];

export default function SectionInclusionControl({ flags, onChange, itemCounts = {}, itemTotals = {} }: SectionInclusionControlProps) {
  const handleToggle = (key: keyof SectionInclusionFlags, value: boolean) => {
    onChange({
      ...flags,
      [key]: value
    });
  };

  const getItemCountForSection = (taxTypes: string[]): number => {
    return taxTypes.reduce((total, taxType) => total + (itemCounts[taxType] || 0), 0);
  };

  const getItemTotalForSection = (taxTypes: string[]): number => {
    return taxTypes.reduce((total, taxType) => total + (itemTotals[taxType] || 0), 0);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <CardTitle>Controle de Cálculo do Total</CardTitle>
        </div>
        <CardDescription>
          Configure quais seções devem ser incluídas no cálculo do total do pedido
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sectionConfig.map((section) => {
          const isEnabled = flags[section.key] ?? section.defaultValue;
          const itemCount = getItemCountForSection(section.taxTypes);
          const itemTotal = getItemTotalForSection(section.taxTypes);
          
          return (
            <div key={section.key} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                                 <Switch
                   checked={isEnabled}
                   onCheckedChange={(checked: boolean) => handleToggle(section.key, checked)}
                   disabled={itemCount === 0}
                 />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{section.label}</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">{section.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-xs text-gray-500">
                    {itemCount > 0 ? (
                      <>
                        {itemCount} {itemCount === 1 ? 'item' : 'itens'} • {formatCurrency(itemTotal)}
                      </>
                    ) : (
                      'Nenhum item nesta seção'
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${isEnabled && itemCount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                  {isEnabled && itemCount > 0 ? 'Incluído' : 'Excluído'}
                </div>
              </div>
            </div>
          );
        })}
        
        <div className="pt-4 border-t">
          <div className="text-sm text-gray-600">
            <strong>Dica:</strong> Seções como "Débitos com Exigibilidade Suspensa" e "Parcelamentos SIEFPAR" 
            geralmente não são incluídas no total por representarem valores suspensos ou já parcelados.
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 