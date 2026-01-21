"use client"

import * as React from "react"
import { MultiSelectFilter, MultiSelectOption } from "./multi-select-filter"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X } from "lucide-react"

export interface FacilityFiltersState {
  year: string[]
  facilityType2025: string[]
  facilityType2018: string[]
  managingAuthority2025: string[]
  managingAuthority2018: string[]
  lgaName: string[]
  wardName: string[]
  residenceOfFacility: string[]
  facilityClassification: string[]
  levelOfCare: string[]
  facilityName: string[]
}

interface FacilityFiltersProps {
  filters: FacilityFiltersState
  onFiltersChange: (filters: FacilityFiltersState) => void
  onReset?: () => void
  className?: string
}

// Mock data - replace with actual data from your API
const mockYears: MultiSelectOption[] = [
  { label: "2025", value: "2025" },
  { label: "2024", value: "2024" },
  { label: "2023", value: "2023" },
]

const mockFacilityTypes: MultiSelectOption[] = [
  { label: "Primary Health Care", value: "primary" },
  { label: "Secondary Health Care", value: "secondary" },
  { label: "Tertiary Health Care", value: "tertiary" },
  { label: "Specialist Hospital", value: "specialist" },
]

const mockManagingAuthorities: MultiSelectOption[] = [
  { label: "Federal Government", value: "federal" },
  { label: "State Government", value: "state" },
  { label: "Local Government", value: "local" },
  { label: "Private", value: "private" },
  { label: "Mission", value: "mission" },
]

const mockLGAs: MultiSelectOption[] = [
  { label: "LGA 1", value: "lga1" },
  { label: "LGA 2", value: "lga2" },
  { label: "LGA 3", value: "lga3" },
]

const mockWards: MultiSelectOption[] = [
  { label: "Ward 1", value: "ward1" },
  { label: "Ward 2", value: "ward2" },
  { label: "Ward 3", value: "ward3" },
]

const mockResidence: MultiSelectOption[] = [
  { label: "Urban", value: "urban" },
  { label: "Rural", value: "rural" },
  { label: "Semi-Urban", value: "semi-urban" },
]

const mockClassification: MultiSelectOption[] = [
  { label: "Public", value: "public" },
  { label: "Private", value: "private" },
  { label: "Mission", value: "mission" },
]

const mockLevelOfCare: MultiSelectOption[] = [
  { label: "Primary", value: "primary" },
  { label: "Secondary", value: "secondary" },
  { label: "Tertiary", value: "tertiary" },
]

const mockFacilityNames: MultiSelectOption[] = [
  { label: "General Hospital", value: "general" },
  { label: "Teaching Hospital", value: "teaching" },
  { label: "Specialist Hospital", value: "specialist" },
]

export function FacilityFilters({
  filters,
  onFiltersChange,
  onReset,
  className,
}: FacilityFiltersProps) {
  const updateFilter = (key: keyof FacilityFiltersState, values: string[]) => {
    onFiltersChange({
      ...filters,
      [key]: values,
    })
  }

  const handleReset = () => {
    const emptyFilters: FacilityFiltersState = {
      year: [],
      facilityType2025: [],
      facilityType2018: [],
      managingAuthority2025: [],
      managingAuthority2018: [],
      lgaName: [],
      wardName: [],
      residenceOfFacility: [],
      facilityClassification: [],
      levelOfCare: [],
      facilityName: [],
    }
    onFiltersChange(emptyFilters)
    if (onReset) {
      onReset()
    }
  }

  const hasActiveFilters = Object.values(filters).some(
    (values) => values.length > 0
  )

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filters</CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8 text-xs"
            >
              <X className="mr-1 h-3 w-3" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Year */}
          <MultiSelectFilter
            label="Year"
            options={mockYears}
            selectedValues={filters.year}
            onSelectionChange={(values) => updateFilter("year", values)}
            placeholder="All Years"
            searchable
          />

          {/* Facility Type - 2025 */}
          <MultiSelectFilter
            label="Facility Type - 2025"
            options={mockFacilityTypes}
            selectedValues={filters.facilityType2025}
            onSelectionChange={(values) =>
              updateFilter("facilityType2025", values)
            }
            placeholder="All Types"
            searchable
          />

          {/* Facility Type - 2018 */}
          <MultiSelectFilter
            label="Facility Type - 2018"
            options={mockFacilityTypes}
            selectedValues={filters.facilityType2018}
            onSelectionChange={(values) =>
              updateFilter("facilityType2018", values)
            }
            placeholder="All Types"
            searchable
          />

          {/* Managing Authority - 2025 */}
          <MultiSelectFilter
            label="Managing Authority - 2025"
            options={mockManagingAuthorities}
            selectedValues={filters.managingAuthority2025}
            onSelectionChange={(values) =>
              updateFilter("managingAuthority2025", values)
            }
            placeholder="All Authorities"
            searchable
          />

          {/* Managing Authority - 2018 */}
          <MultiSelectFilter
            label="Managing Authority - 2018"
            options={mockManagingAuthorities}
            selectedValues={filters.managingAuthority2018}
            onSelectionChange={(values) =>
              updateFilter("managingAuthority2018", values)
            }
            placeholder="All Authorities"
            searchable
          />

          {/* Select LGA Name */}
          <MultiSelectFilter
            label="Select LGA Name"
            options={mockLGAs}
            selectedValues={filters.lgaName}
            onSelectionChange={(values) => updateFilter("lgaName", values)}
            placeholder="All LGAs"
            searchable
          />

          {/* Select Ward Name */}
          <MultiSelectFilter
            label="Select Ward Name"
            options={mockWards}
            selectedValues={filters.wardName}
            onSelectionChange={(values) => updateFilter("wardName", values)}
            placeholder="All Wards"
            searchable
          />

          {/* Residence of Facility */}
          <MultiSelectFilter
            label="Residence of Facility"
            options={mockResidence}
            selectedValues={filters.residenceOfFacility}
            onSelectionChange={(values) =>
              updateFilter("residenceOfFacility", values)
            }
            placeholder="All Residences"
            searchable
          />

          {/* Facility Classification */}
          <MultiSelectFilter
            label="Facility Classification"
            options={mockClassification}
            selectedValues={filters.facilityClassification}
            onSelectionChange={(values) =>
              updateFilter("facilityClassification", values)
            }
            placeholder="All Classifications"
            searchable
          />

          {/* Select Level of Care */}
          <MultiSelectFilter
            label="Select Level of Care"
            options={mockLevelOfCare}
            selectedValues={filters.levelOfCare}
            onSelectionChange={(values) => updateFilter("levelOfCare", values)}
            placeholder="All Levels"
            searchable
          />

          {/* Facility Name */}
          <MultiSelectFilter
            label="Facility Name"
            options={mockFacilityNames}
            selectedValues={filters.facilityName}
            onSelectionChange={(values) => updateFilter("facilityName", values)}
            placeholder="All Facilities"
            searchable
          />
        </div>
      </CardContent>
    </Card>
  )
}
