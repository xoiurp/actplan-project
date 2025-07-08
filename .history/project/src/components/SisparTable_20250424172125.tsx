import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'; // Ajuste o caminho se necessário
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'; // Ajuste o caminho se necessário

// Define a interface para os dados de um item SISPAR
interface SisparItem {
  id: string; // Adicionado id para key na iteração
  cnpj: string;
  sispar_conta: string;
  sispar_descricao: string;
  sispar_modalidade: string;
  // Adicione outros campos se necessário
}

interface SisparTableProps {
  items: SisparItem[];
}

export const SisparTable: React.FC<SisparTableProps> = ({ items }) => {
  if (!items || items.length === 0) {
    return null; // Não renderiza nada se não houver itens
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pendências - Parcelamento (SISPAR)</CardTitle>
        <CardDescription>
          Lista de pendências de parcelamento identificadas no sistema SISPAR.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CNPJ</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Modalidade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.cnpj}</TableCell>
                <TableCell>{item.sispar_conta}</TableCell>
                <TableCell>{item.sispar_descricao}</TableCell>
                <TableCell>{item.sispar_modalidade}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
