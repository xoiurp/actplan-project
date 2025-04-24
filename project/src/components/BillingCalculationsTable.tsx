import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Calculation {
  id: number;
  total: number;
  reductionPercentage: number;
  reductionValue: number;
  commissionPercentage: number;
  commissionValue: number;
}

interface BillingCalculationsTableProps {
  calculations: Calculation[];
}

export function BillingCalculationsTable({ calculations }: BillingCalculationsTableProps) {
  return (
    <div className="bg-white rounded-lg border border-shadow-dark overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Número</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Redução (%)</TableHead>
            <TableHead>Valor Reduzido</TableHead>
            <TableHead>Comissão (%)</TableHead>
            <TableHead>Valor Comissão</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {calculations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                Nenhum cálculo realizado ainda
              </TableCell>
            </TableRow>
          ) : (
            calculations.map((calc) => (
              <TableRow key={calc.id}>
                <TableCell>{calc.id}</TableCell>
                <TableCell>${calc.total.toFixed(2)}</TableCell>
                <TableCell>{calc.reductionPercentage}%</TableCell>
                <TableCell>${calc.reductionValue.toFixed(2)}</TableCell>
                <TableCell>{calc.commissionPercentage}%</TableCell>
                <TableCell>${calc.commissionValue.toFixed(2)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}