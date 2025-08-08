import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "./ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover"
import { getCustomers } from "../lib/api"
import { useQuery } from "@tanstack/react-query"
import { Customer } from "../types"

interface CustomerComboboxProps {
  value?: string;
  onValueChange?: (value: string) => void;
}

export function CustomerCombobox({ value: externalValue, onValueChange }: CustomerComboboxProps = {}) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [internalValue, setInternalValue] = React.useState("")
  
  const value = externalValue !== undefined ? externalValue : internalValue;
  const setValue = (newValue: string) => {
    if (externalValue === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: getCustomers,
  });

  const customerList = customers?.map(c => ({ 
    label: c.razao_social, 
    value: c.id 
  })) || [];

  // Filtrar clientes baseado na busca
  const filteredCustomers = customerList.filter(customer =>
    customer.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (customerId: string) => {
    setValue(customerId === value ? "" : customerId);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value
            ? customerList.find((customer) => customer.value === value)?.label
            : "Selecione o cliente..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <div className="flex flex-col">
          {/* Campo de busca */}
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          {/* Lista de clientes */}
          <div className="max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="py-6 text-center text-sm">Carregando...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="py-6 text-center text-sm">Nenhum cliente encontrado.</div>
            ) : (
              <div className="p-1">
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.value}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                      value === customer.value && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => handleSelect(customer.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === customer.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {customer.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
