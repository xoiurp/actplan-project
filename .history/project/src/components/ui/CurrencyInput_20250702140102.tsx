import React, { useState, useEffect } from 'react';

interface CurrencyInputProps {
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
}

const formatCurrency = (value: string) => {
  if (!value) return '';
  const numberValue = parseFloat(value.replace(/\./g, '').replace(',', '.'));
  if (isNaN(numberValue)) return '';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
  }).format(numberValue);
};

const unformatCurrency = (value: string) => {
  if (!value) return '';
  return value.replace(/\./g, '').replace(',', '.');
};

export function CurrencyInput({ id, name, value, onChange, placeholder, className }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    // Formata o valor inicial que vem do formulário
    const numberValue = parseFloat(value);
    if (!isNaN(numberValue)) {
      setDisplayValue(new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(numberValue));
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 1. Pega o valor digitado e remove tudo que não for dígito
    let rawValue = e.target.value.replace(/[^\d]/g, '');

    // 2. Se o valor estiver vazio, limpa tudo
    if (rawValue === '') {
      setDisplayValue('');
      const event = { target: { name, value: '' } } as React.ChangeEvent<HTMLInputElement>;
      onChange(event);
      return;
    }

    // 3. Converte para número, dividindo por 100 para ter os centavos
    const numericValue = parseInt(rawValue, 10) / 100;

    // 4. Formata para exibição no padrão BRL (ex: "1.234,56")
    const formattedValue = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);
    setDisplayValue(formattedValue);

    // 5. Propaga a mudança para o formulário no formato numérico padrão (ex: "1234.56")
    const eventForForm = {
      target: {
        name: name,
        value: numericValue.toFixed(2), // Envia com ponto decimal
      },
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(eventForForm);
  };

  return (
    <input
      type="text"
      inputMode="decimal" // Melhora a experiência em mobile
      id={id}
      name={name}
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  );
}
