import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}