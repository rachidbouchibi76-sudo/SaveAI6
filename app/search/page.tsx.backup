"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Sparkles, Search, ArrowLeft } from "lucide-react"
import ProductCard from "@/components/product-card"
import AlternativeCard from "@/components/alternative-card"
import Loading from "@/components/loading"
import LiveAgentStep from "@/components/live-agent-step"
import { useAuth } from "@/hooks/use-auth"
import { apiClient, type SearchResponse, type Product } from "@/lib/api/client"
import { toast } from "sonner"

const analysisSteps = [
  { step: 1, label: "Analyzing product URL", status: "pending" as const },
  { step: 2, label: "Scanning 1,000+ stores", status: "pending" as const },
  { step: 3, label: "Finding alternatives", status: "pending" as const },
  { step: 4, label: "Comparing prices", status: "pending" as const },
  { step: 5, label: "Generating results", status: "pending" as const },
]

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading, supabase } = useAuth()
  
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

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
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
              <Link href="/">
                <ArrowLeft className="mr-2 size-4" />
                Home
              </Link>
            </Button>
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
              </div>
            </div>

            {/* Alternative Products */}
            {searchResults.alternatives.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Better Deals Found</h2>
                  <p className="text-muted-foreground">Showing {searchResults.alternatives.length} alternatives</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {searchResults.alternatives.map((product, index) => (
                    <AlternativeCard
                      key={product.id || index}
                      productName={product.name}
                      price={product.price}
                      store={product.store}
                      imageURL={product.image || "/placeholder.jpg"}
                      affiliateLink={product.url}
                    />
                  ))}
                </div>
              </div>
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