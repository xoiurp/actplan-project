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
    setDisplayValue(formatCurrency(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^\d]/g, '');
    const numericValue = (parseInt(rawValue, 10) / 100).toFixed(2);
    
    const event = {
      target: {
        name: name,
        value: numericValue,
      },
    } as React.ChangeEvent<HTMLInputElement>;

    onChange(event);
  };

  return (
    <input
      type="text"
      id={id}
      name={name}
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  );
}
