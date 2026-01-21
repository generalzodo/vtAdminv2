"use client"

import * as React from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

export interface MultiSelectOption {
  label: string
  value: string
}

interface MultiSelectFilterProps {
  label: string
  options: MultiSelectOption[]
  selectedValues: string[]
  onSelectionChange: (values: string[]) => void
  placeholder?: string
  className?: string
  searchable?: boolean
}

export function MultiSelectFilter({
  label,
  options,
  selectedValues,
  onSelectionChange,
  placeholder = "All",
  className,
  searchable = false,
}: MultiSelectFilterProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")

  const filteredOptions = React.useMemo(() => {
    if (!searchable || !searchTerm) return options
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [options, searchTerm, searchable])

  const handleToggle = (value: string) => {
    if (selectedValues.includes(value)) {
      onSelectionChange(selectedValues.filter((v) => v !== value))
    } else {
      onSelectionChange([...selectedValues, value])
    }
  }

  const handleSelectAll = () => {
    if (selectedValues.length === filteredOptions.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(filteredOptions.map((opt) => opt.value))
    }
  }

  const handleClearAll = () => {
    onSelectionChange([])
  }

  const displayText =
    selectedValues.length === 0
      ? placeholder
      : selectedValues.length === 1
      ? options.find((opt) => opt.value === selectedValues[0])?.label || placeholder
      : `${selectedValues.length} selected`

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-10 text-sm font-normal"
          >
            <span className="truncate">{displayText}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <div className="p-3 space-y-2">
            {searchable && (
              <div className="pb-2 border-b">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
            <div className="flex items-center justify-between pb-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-primary hover:underline"
              >
                {selectedValues.length === filteredOptions.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
              {selectedValues.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs text-destructive hover:underline flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              )}
            </div>
          </div>
          <ScrollArea className="h-[200px]">
            <div className="p-2 space-y-1">
              {filteredOptions.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  No options found
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                    onClick={() => handleToggle(option.value)}
                  >
                    <Checkbox
                      checked={selectedValues.includes(option.value)}
                      onCheckedChange={() => handleToggle(option.value)}
                    />
                    <Label
                      className="text-sm font-normal cursor-pointer flex-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {option.label}
                    </Label>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  )
}
