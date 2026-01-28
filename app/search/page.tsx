"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Sparkles, Search, ArrowLeft, Bookmark } from "lucide-react"
import ProductCard from "@/components/product-card"
import AlternativeCard from "@/components/alternative-card"
import Loading from "@/components/loading"
import LiveAgentStep from "@/components/live-agent-step"
import AdvancedFilters, { type FilterOptions } from "@/components/search/advanced-filters"
import { useAuth } from "@/hooks/use-auth"
import { apiClient, type SearchResponse, type Product } from "@/lib/api/client"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

const analysisSteps = [
  { step: 1, label: "Analyzing product URL", status: "pending" as const },
  { step: 2, label: "Scanning 1,000+ stores", status: "pending" as const },
  { step: 3, label: "Finding alternatives", status: "pending" as const },
  { step: 4, label: "Comparing prices", status: "pending" as const },
  { step: 5, label: "Generating results", status: "pending" as const },
]

const defaultFilters: FilterOptions = {
  categories: [],
  brands: [],
  priceRange: [0, 10000],
  minRating: 0,
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading, supabase } = useAuth()
  
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null)
  const [filteredResults, setFilteredResults] = useState<Product[]>([])
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterOptions>(defaultFilters)

  // Check for query parameter on mount
  useEffect(() => {
    const query = searchParams.get('q')
    if (query) {
      setSearchQuery(query)
      // Auto-trigger search if user is authenticated
      if (user) {
        handleSearch(undefined, query)
      }
    }
  }, [searchParams, user])

  // Apply filters when search results or filters change
  useEffect(() => {
    if (searchResults) {
      applyFilters()
    }
  }, [searchResults, filters])

  const applyFilters = () => {
    if (!searchResults) return

    let filtered = [...searchResults.alternatives]

    // Filter by categories (mock - in real app, products would have category field)
    if (filters.categories.length > 0) {
      // For demo purposes, we'll keep all products
      // In production, filter based on product.category
    }

    // Filter by brands (mock - in real app, products would have brand field)
    if (filters.brands.length > 0) {
      // For demo purposes, we'll keep all products
      // In production, filter based on product.brand
    }

    // Filter by price range
    filtered = filtered.filter(
      (product) =>
        product.price >= filters.priceRange[0] &&
        product.price <= filters.priceRange[1]
    )

    // Filter by rating
    if (filters.minRating > 0) {
      filtered = filtered.filter(
        (product) => (product.rating || 0) >= filters.minRating
      )
    }

    setFilteredResults(filtered)
  }

  const handleSearch = async (e?: React.FormEvent, queryOverride?: string) => {
    if (e) e.preventDefault()
    
    const query = queryOverride || searchQuery
    if (!query.trim()) return

    // Check authentication
    if (!user) {
      toast.error("Please sign in to search for products")
      router.push("/auth")
      return
    }

    setIsSearching(true)
    setHasSearched(false)
    setCurrentStep(0)
    setError(null)
    setSearchResults(null)
    setFilters(defaultFilters) // Reset filters on new search

    try {
      // Simulate AI analysis steps
      for (let i = 0; i < analysisSteps.length; i++) {
        setCurrentStep(i + 1)
        await new Promise((resolve) => setTimeout(resolve, 600))
      }

      // Call real search API
      const results = await apiClient.search(query)
      
      setSearchResults(results)
      setHasSearched(true)
      toast.success("Search completed successfully!")
    } catch (err) {
      console.error("Search error:", err)
      setError(err instanceof Error ? err.message : "Failed to search. Please try again.")
      toast.error("Search failed. Please try again.")
      setHasSearched(false)
    } finally {
      setIsSearching(false)
      setCurrentStep(0)
    }
  }

  const handleSaveProduct = async (product: Product) => {
    try {
      await apiClient.saveProduct({
        productName: product.name,
        productUrl: product.url,
        productPrice: product.price,
        productCurrency: product.currency,
        productImage: product.image,
        store: product.store,
      })
      toast.success("Product saved!")
    } catch (error) {
      toast.error("Failed to save product")
    }
  }

  const handleAddToCompare = (product: Product) => {
    const compareProducts = JSON.parse(localStorage.getItem("compareProducts") || "[]")
    
    if (compareProducts.length >= 4) {
      toast.error("You can only compare up to 4 products")
      return
    }

    if (compareProducts.find((p: Product) => p.id === product.id)) {
      toast.info("Product already in comparison")
      return
    }

    compareProducts.push(product)
    localStorage.setItem("compareProducts", JSON.stringify(compareProducts))
    toast.success("Added to comparison")
  }

  const handleApplyFilters = (newFilters: FilterOptions) => {
    setFilters(newFilters)
    toast.success("Filters applied")
  }

  const handleClearFilters = () => {
    setFilters(defaultFilters)
    toast.success("Filters cleared")
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast.success("Signed out successfully")
    router.push("/")
  }

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const displayResults = filteredResults.length > 0 ? filteredResults : searchResults?.alternatives || []

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="size-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">SaveAI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/search">Search</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/compare">Compare</Link>
            </Button>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <Button onClick={handleSignOut} variant="outline" size="sm">
                Sign Out
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link href="/auth">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Search Section */}
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-3xl mx-auto mb-12">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Find the Best Deals</h1>
            <p className="text-muted-foreground text-lg">Paste a product URL or search by keyword</p>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              type="text"
              placeholder="Paste product URL or enter keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 h-12 text-base"
              disabled={isSearching}
            />
            <Button type="submit" size="lg" disabled={isSearching || !user}>
              <Search className="mr-2 size-4" />
              Search
            </Button>
          </form>
          
          {!user && (
            <p className="text-sm text-muted-foreground text-center mt-4">
              Please <Link href="/auth" className="text-primary hover:underline">sign in</Link> to search for products
            </p>
          )}
        </div>

        {/* Loading / Live Agent Analysis */}
        {isSearching && (
          <Card className="max-w-3xl mx-auto p-6 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-6">
                <Loading />
                <h3 className="text-lg font-semibold">AI Analysis in Progress</h3>
              </div>
              <div className="space-y-3">
                {analysisSteps.map((stepData, index) => (
                  <LiveAgentStep
                    key={index}
                    step={stepData.step}
                    label={stepData.label}
                    status={index < currentStep ? "complete" : index === currentStep ? "active" : "pending"}
                  />
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Error State */}
        {error && !isSearching && (
          <Card className="max-w-3xl mx-auto p-6 mb-12 border-destructive">
            <div className="text-center">
              <p className="text-destructive font-semibold mb-2">Search Failed</p>
              <p className="text-muted-foreground">{error}</p>
              <Button onClick={() => handleSearch()} className="mt-4">
                Try Again
              </Button>
            </div>
          </Card>
        )}

        {/* Results Section */}
        {hasSearched && !isSearching && searchResults && (
          <div className="space-y-8">
            {/* Filters and Actions Bar */}
            <div className="flex items-center justify-between">
              <AdvancedFilters
                onApplyFilters={handleApplyFilters}
                onClearFilters={handleClearFilters}
                activeFilters={filters}
              />
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/compare">
                    View Comparison ({JSON.parse(localStorage.getItem("compareProducts") || "[]").length})
                  </Link>
                </Button>
              </div>
            </div>

            {/* Active Filters Display */}
            {(filters.categories.length > 0 || filters.brands.length > 0 || 
              filters.priceRange[0] > 0 || filters.priceRange[1] < 10000 || 
              filters.minRating > 0) && (
              <div className="flex flex-wrap gap-2">
                {filters.categories.map((cat) => (
                  <Badge key={cat} variant="secondary">
                    {cat}
                  </Badge>
                ))}
                {filters.brands.map((brand) => (
                  <Badge key={brand} variant="secondary">
                    {brand}
                  </Badge>
                ))}
                {(filters.priceRange[0] > 0 || filters.priceRange[1] < 10000) && (
                  <Badge variant="secondary">
                    ${filters.priceRange[0]} - ${filters.priceRange[1]}
                  </Badge>
                )}
                {filters.minRating > 0 && (
                  <Badge variant="secondary">
                    {filters.minRating}⭐ & above
                  </Badge>
                )}
              </div>
            )}

            {/* Original Product */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Original Product</h2>
              <div className="max-w-md">
                <ProductCard
                  productName={searchResults.product.name}
                  price={searchResults.product.price}
                  store={searchResults.product.store}
                  imageURL={searchResults.product.image || "/placeholder.jpg"}
                  affiliateLink={searchResults.product.url}
                />
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSaveProduct(searchResults.product)}
                  >
                    <Bookmark className="mr-2 size-4" />
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddToCompare(searchResults.product)}
                  >
                    Add to Compare
                  </Button>
                </div>
              </div>
            </div>

            {/* Alternative Products */}
            {displayResults.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Better Deals Found</h2>
                  <p className="text-muted-foreground">Showing {displayResults.length} alternatives</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {displayResults.map((product, index) => (
                    <div key={product.id || index}>
                      <AlternativeCard
                        productName={product.name}
                        price={product.price}
                        store={product.store}
                        imageURL={product.image || "/placeholder.jpg"}
                        affiliateLink={product.url}
                      />
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleSaveProduct(product)}
                        >
                          <Bookmark className="size-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleAddToCompare(product)}
                        >
                          Compare
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {displayResults.length === 0 && searchResults.alternatives.length > 0 && (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground">No products match your filters. Try adjusting them.</p>
                <Button onClick={handleClearFilters} variant="outline" className="mt-4">
                  Clear Filters
                </Button>
              </Card>
            )}

            {/* Cheapest Option CTA */}
            <Card className="p-6 bg-primary/10 border-primary/50">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold mb-2">Best Deal Found!</h3>
                  <p className="text-muted-foreground">
                    {searchResults.cheapest.price < searchResults.product.price ? (
                      <>
                        Save ${(searchResults.product.price - searchResults.cheapest.price).toFixed(2)} by purchasing from{" "}
                        {searchResults.cheapest.store}
                      </>
                    ) : (
                      <>Cheapest option available at {searchResults.cheapest.store}</>
                    )}
                  </p>
                </div>
                <Button size="lg" asChild>
                  <a href={searchResults.cheapest.url} target="_blank" rel="noopener noreferrer">
                    Buy Cheapest - ${searchResults.cheapest.price}
                  </a>
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Empty State */}
        {!hasSearched && !isSearching && !error && (
          <div className="text-center py-16">
            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Search className="size-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Start Your Search</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Enter a product URL or keyword above to find the best prices across thousands of stores
            </p>
          </div>
        )}
      </div>
    </div>
  )
}