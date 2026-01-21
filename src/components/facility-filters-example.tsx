"use client"

import * as React from "react"
import { FacilityFilters, FacilityFiltersState } from "./facility-filters"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * Example usage of FacilityFilters component
 * 
 * This demonstrates how to integrate the FacilityFilters component
 * into your facility data page/component.
 */
export function FacilityFiltersExample() {
  const [filters, setFilters] = React.useState<FacilityFiltersState>({
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
  })

  const [filteredData, setFilteredData] = React.useState<any[]>([])

  // This function would typically call your API with the filter parameters
  const applyFilters = async () => {
    // Example: Build query parameters from filters
    const queryParams = new URLSearchParams()
    
    Object.entries(filters).forEach(([key, values]) => {
      if (values.length > 0) {
        queryParams.append(key, values.join(","))
      }
    })

    // Example API call (replace with your actual API endpoint)
    try {
      const response = await fetch(`/api/facilities?${queryParams.toString()}`)
      const data = await response.json()
      setFilteredData(data)
    } catch (error) {
      console.error("Error fetching filtered data:", error)
    }
  }

  // Apply filters when they change (optional - you might want to debounce this)
  React.useEffect(() => {
    // Uncomment to auto-apply filters on change
    // applyFilters()
  }, [filters])

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Facility Management</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Facility Filters Component */}
          <FacilityFilters
            filters={filters}
            onFiltersChange={setFilters}
            onReset={() => {
              // Reset any other state if needed
              setFilteredData([])
            }}
            className="mb-6"
          />

          {/* Apply Filters Button */}
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setFilters({
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
                })
              }}
            >
              Reset Filters
            </Button>
            <Button onClick={applyFilters}>Apply Filters</Button>
          </div>

          {/* Display filtered results */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Filtered Results</h3>
            <pre className="p-4 bg-muted rounded-md text-sm overflow-auto">
              {JSON.stringify(filters, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
