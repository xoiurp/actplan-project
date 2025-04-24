"use client" // Required for client-side interactions like state

import * as React from "react"
import { format } from "date-fns"
import { ptBR } from 'date-fns/locale'; // Import Brazilian Portuguese locale
import { Calendar as CalendarIcon } from "lucide-react" // Renamed to avoid conflict

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar" // The actual calendar component
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  className?: string;
  placeholder?: string;
}

export function DatePicker({ date, setDate, className, placeholder = "Selecione uma data" }: DatePickerProps) {

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal", // Changed width to full
            !date && "text-muted-foreground",
            className // Allow passing additional classes
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" /> {/* Added margin */}
          {date ? format(date, "PPP", { locale: ptBR }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
          locale={ptBR} // Set locale for calendar display
        />
      </PopoverContent>
    </Popover>
  )
}
