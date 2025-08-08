"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "../lib/utils"
import { Button } from "./ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover"
import { getCustomers } from "../lib/api"
import { useQuery } from "@tanstack/react-query"
import { Customer } from "../types"

export function CustomerCombobox() {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState("")

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: getCustomers,
  });

  const customerList = customers?.map(c => ({ label: c.razao_social, value: c.id })) || [];

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
      <PopoverContent className="w-[300px] p-0 z-50">
        <Command>
          <CommandInput placeholder="Buscar cliente..." />
          <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
          <CommandGroup>
            {isLoading ? (
              <CommandItem disabled>Carregando...</CommandItem>
            ) : (
              customerList.map((customer) => (
                <CommandItem
                  key={customer.value}
                  value={customer.value}
                  onSelect={(currentValue: string) => {
                    setValue(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === customer.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {customer.label}
                </CommandItem>
              ))
            )}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
