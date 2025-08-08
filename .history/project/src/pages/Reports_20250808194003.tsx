import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

export default function Reports() {
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
              {/* Placeholder for customer combobox */}
              <div className="w-full h-10 bg-gray-200 rounded-md animate-pulse" />
            </div>

            {/* Date Range Selection will go here */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Período
              </label>
              {/* Placeholder for date pickers */}
              <div className="w-full h-10 bg-gray-200 rounded-md animate-pulse" />
            </div>
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
