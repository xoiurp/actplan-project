import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { CustomerCombobox } from '../components/CustomerCombobox';
import { DatePicker } from '../components/ui/date-picker';
import { addDays } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { getOrders } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { Loader2 } from 'lucide-react';

export default function Reports() {
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined, to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [reportData, setReportData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: getOrders,
  });

  const generateReport = () => {
    setIsGenerating(true);
    
    // Filtrar pedidos baseado nos critérios selecionados
    let filteredOrders = orders || [];
    
    // Filtrar por cliente se selecionado
    if (selectedCustomer) {
      filteredOrders = filteredOrders.filter(order => order.customer_id === selectedCustomer);
    }
    
    // Filtrar por período se selecionado
    if (dateRange.from || dateRange.to) {
      filteredOrders = filteredOrders.filter(order => {
        const orderDate = new Date(order.data_pedido);
        if (dateRange.from && orderDate < dateRange.from) return false;
        if (dateRange.to && orderDate > dateRange.to) return false;
        return true;
      });
    }
    
    // Calcular totais
    const totalOrders = filteredOrders.length;
    const totalReduction = filteredOrders.reduce((sum, order) => {
      // Usar valor_reducao se disponível, senão calcular
      if (order.valor_reducao) {
        return sum + order.valor_reducao;
      }
      // Fallback: calcular baseado nos itens
      const orderTotal = order.itens_pedido?.reduce((itemSum: number, item: any) => {
        return itemSum + (item.saldo_devedor_consolidado || item.current_balance || 0);
      }, 0) || 0;
      return sum + (orderTotal * (order.reducao_percentage / 100));
    }, 0);
    
    const totalCommission = filteredOrders.reduce((sum, order) => {
      const orderTotal = order.itens_pedido?.reduce((itemSum: number, item: any) => {
        return itemSum + (item.saldo_devedor_consolidado || item.current_balance || 0);
      }, 0) || 0;
      return sum + (orderTotal * (order.comissao_percentage / 100));
    }, 0);
    
    setReportData({
      totalOrders,
      totalReduction,
      totalCommission,
      orders: filteredOrders
    });
    
    setIsGenerating(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Customer Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente
              </label>
              <CustomerCombobox 
                value={selectedCustomer}
                onValueChange={setSelectedCustomer}
              />
            </div>

            {/* Date Range Selection will go here */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Período
              </label>
              <div className="flex items-center space-x-2">
                <DatePicker
                  date={dateRange.from}
                  setDate={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                  placeholder="Data inicial"
                />
                <span>-</span>
                <DatePicker
                  date={dateRange.to}
                  setDate={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                  placeholder="Data final"
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setDateRange({ from: addDays(new Date(), -30), to: new Date() })}>Últimos 30 dias</Button>
            <Button variant="outline" size="sm" onClick={() => setDateRange({ from: addDays(new Date(), -90), to: new Date() })}>Últimos 3 meses</Button>
            <Button variant="outline" size="sm" onClick={() => setDateRange({ from: addDays(new Date(), -365), to: new Date() })}>Último ano</Button>
          </div>

          <div className="flex justify-end space-x-4 mt-4">
            <Button 
              variant="outline"
              onClick={() => {
                setSelectedCustomer('');
                setDateRange({ from: undefined, to: undefined });
              }}
            >
              Limpar Filtros
            </Button>
            <Button 
              onClick={generateReport}
              disabled={isLoading || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                'Gerar Relatório'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report results */}
      {reportData && (
        <div className="space-y-6">
          {/* Cards de resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total de Pedidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{reportData.totalOrders}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Economia Total (Redução)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(reportData.totalReduction)}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Comissão Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(reportData.totalCommission)}
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Tabela detalhada de pedidos */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhamento por Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Pedido</th>
                      <th className="text-left p-2">Cliente</th>
                      <th className="text-left p-2">Data</th>
                      <th className="text-right p-2">Total</th>
                      <th className="text-right p-2">% Redução</th>
                      <th className="text-right p-2">Valor Economia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.orders.map((order: any) => {
                      const orderTotal = order.itens_pedido?.reduce((sum: number, item: any) => {
                        return sum + (item.saldo_devedor_consolidado || item.current_balance || 0);
                      }, 0) || 0;
                      const reduction = order.valor_reducao || (orderTotal * (order.reducao_percentage / 100));
                      
                      return (
                        <tr key={order.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            #{order.order_year}/{order.order_number.toString().padStart(4, '0')}
                          </td>
                          <td className="p-2">{order.customer.razao_social}</td>
                          <td className="p-2">{order.data_pedido}</td>
                          <td className="p-2 text-right">{formatCurrency(orderTotal)}</td>
                          <td className="p-2 text-right">{order.reducao_percentage}%</td>
                          <td className="p-2 text-right font-semibold text-green-600">
                            {formatCurrency(reduction)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
