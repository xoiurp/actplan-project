import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { CustomerCombobox } from '../components/CustomerCombobox';
import { DatePicker } from '../components/ui/date-picker';
import { addDays, format } from 'date-fns';

export default function Reports() {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined, to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Customer Selection will go here */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente
              </label>
              <CustomerCombobox />
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
            <Button variant="outline">Limpar Filtros</Button>
            <Button>Gerar Relatório</Button>
          </div>
        </CardContent>
      </Card>

      {/* Report results will be displayed below */}
      <div className="mt-6">
        {/* Placeholder for report content */}
      </div>
    </div>
  );
}
