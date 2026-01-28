"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { X, SlidersHorizontal } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export interface FilterOptions {
  categories: string[]
  brands: string[]
  priceRange: [number, number]
  minRating: number
}

interface AdvancedFiltersProps {
  onApplyFilters: (filters: FilterOptions) => void
  onClearFilters: () => void
  activeFilters: FilterOptions
}

const CATEGORIES = [
  "Electronics",
  "Fashion",
  "Home & Garden",
  "Sports & Outdoors",
  "Books",
  "Toys & Games",
  "Health & Beauty",
  "Automotive",
]

const BRANDS = [
  "Apple",
  "Samsung",
  "Sony",
  "LG",
  "Nike",
  "Adidas",
  "Amazon",
  "Generic",
]

export default function AdvancedFilters({
  onApplyFilters,
  onClearFilters,
  activeFilters,
}: AdvancedFiltersProps) {
  const [localFilters, setLocalFilters] = useState<FilterOptions>(activeFilters)
  const [isOpen, setIsOpen] = useState(false)

  const handleCategoryToggle = (category: string) => {
    setLocalFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category],
    }))
  }

  const handleBrandToggle = (brand: string) => {
    setLocalFilters(prev => ({
      ...prev,
      brands: prev.brands.includes(brand)
        ? prev.brands.filter(b => b !== brand)
        : [...prev.brands, brand],
    }))
  }

  const handlePriceRangeChange = (value: number[]) => {
    setLocalFilters(prev => ({
      ...prev,
      priceRange: [value[0], value[1]],
    }))
  }

  const handleRatingChange = (value: number[]) => {
    setLocalFilters(prev => ({
      ...prev,
      minRating: value[0],
    }))
  }

  const handleApply = () => {
    onApplyFilters(localFilters)
    setIsOpen(false)
  }

  const handleClear = () => {
    const defaultFilters: FilterOptions = {
      categories: [],
      brands: [],
      priceRange: [0, 10000],
      minRating: 0,
    }
    setLocalFilters(defaultFilters)
    onClearFilters()
    setIsOpen(false)
  }

  const activeFilterCount =
    localFilters.categories.length +
    localFilters.brands.length +
    (localFilters.priceRange[0] > 0 || localFilters.priceRange[1] < 10000 ? 1 : 0) +
    (localFilters.minRating > 0 ? 1 : 0)

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <SlidersHorizontal className="mr-2 size-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Advanced Filters</SheetTitle>
          <SheetDescription>
            Refine your search results with advanced filtering options
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {CATEGORIES.map((category) => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category}`}
                    checked={localFilters.categories.includes(category)}
                    onCheckedChange={() => handleCategoryToggle(category)}
                  />
                  <Label
                    htmlFor={`category-${category}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {category}
                  </Label>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Price Range */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Price Range</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>${localFilters.priceRange[0]}</span>
                <span>${localFilters.priceRange[1]}</span>
              </div>
              <Slider
                min={0}
                max={10000}
                step={50}
                value={localFilters.priceRange}
                onValueChange={handlePriceRangeChange}
                className="w-full"
              />
            </CardContent>
          </Card>

          {/* Brands */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Brands</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {BRANDS.map((brand) => (
                <div key={brand} className="flex items-center space-x-2">
                  <Checkbox
                    id={`brand-${brand}`}
                    checked={localFilters.brands.includes(brand)}
                    onCheckedChange={() => handleBrandToggle(brand)}
                  />
                  <Label
                    htmlFor={`brand-${brand}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {brand}
                  </Label>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Minimum Rating */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Minimum Rating</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>{localFilters.minRating} ⭐ and above</span>
              </div>
              <Slider
                min={0}
                max={5}
                step={0.5}
                value={[localFilters.minRating]}
                onValueChange={handleRatingChange}
                className="w-full"
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleClear} variant="outline" className="flex-1">
              Clear All
            </Button>
            <Button onClick={handleApply} className="flex-1">
              Apply Filters
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}