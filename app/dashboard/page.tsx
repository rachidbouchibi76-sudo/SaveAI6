"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sparkles, ArrowLeft, Search, Bookmark, TrendingUp, Clock, Trash2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { apiClient, type SearchHistoryItem, type SavedProduct } from "@/lib/api/client"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import Image from "next/image"

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading, supabase } = useAuth()
  
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([])
  const [savedProducts, setSavedProducts] = useState<SavedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalSearches: 0,
    totalSaved: 0,
    totalSavings: 0,
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth")
      return
    }

    if (user) {
      loadDashboardData()
    }
  }, [user, authLoading, router])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [history, saved] = await Promise.all([
        apiClient.getSearchHistory(),
        apiClient.getSavedProducts(),
      ])

      setSearchHistory(history)
      setSavedProducts(saved)

      // Calculate stats
      const totalSavings = saved.reduce((sum, product) => {
        // Estimate savings (this would be more accurate with price history)
        return sum + (product.product_price * 0.1) // Assume 10% average savings
      }, 0)

      setStats({
        totalSearches: history.length,
        totalSaved: saved.length,
        totalSavings: totalSavings,
      })
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
      toast.error("Failed to load dashboard data")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteHistory = async (id: string) => {
    try {
      await apiClient.deleteSearchHistory(id)
      setSearchHistory(prev => prev.filter(item => item.id !== id))
      setStats(prev => ({ ...prev, totalSearches: prev.totalSearches - 1 }))
      toast.success("Search history deleted")
    } catch (error) {
      toast.error("Failed to delete history")
    }
  }

  const handleClearAllHistory = async () => {
    try {
      await apiClient.deleteSearchHistory()
      setSearchHistory([])
      setStats(prev => ({ ...prev, totalSearches: 0 }))
      toast.success("All search history cleared")
    } catch (error) {
      toast.error("Failed to clear history")
    }
  }

  const handleDeleteSaved = async (id: string) => {
    try {
      await apiClient.deleteSavedProduct(id)
      setSavedProducts(prev => prev.filter(item => item.id !== id))
      setStats(prev => ({ ...prev, totalSaved: prev.totalSaved - 1 }))
      toast.success("Product removed")
    } catch (error) {
      toast.error("Failed to remove product")
    }
  }

  const handleRetrySearch = async (historyId: string) => {
    try {
      const { redirectUrl } = await apiClient.retrySearch(historyId)
      router.push(redirectUrl)
    } catch (error) {
      toast.error("Failed to retry search")
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast.success("Signed out successfully")
    router.push("/")
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
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
          <nav className="hidden md:flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/search">
                <Search className="mr-2 size-4" />
                Search
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </nav>
          <div className="flex items-center gap-3">
            <Button onClick={handleSignOut} variant="outline" size="sm">
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.user_metadata?.name || "User"}!</h1>
          <p className="text-muted-foreground">Here's your shopping activity and savings</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
              <Search className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSearches}</div>
              <p className="text-xs text-muted-foreground mt-1">Products searched</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Saved Products</CardTitle>
              <Bookmark className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSaved}</div>
              <p className="text-xs text-muted-foreground mt-1">Products bookmarked</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Estimated Savings</CardTitle>
              <TrendingUp className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalSavings.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">Money saved</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for History and Saved Products */}
        <Tabs defaultValue="history" className="space-y-4">
          <TabsList>
            <TabsTrigger value="history">
              <Clock className="mr-2 size-4" />
              Search History
            </TabsTrigger>
            <TabsTrigger value="saved">
              <Bookmark className="mr-2 size-4" />
              Saved Products
            </TabsTrigger>
          </TabsList>

          {/* Search History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Searches</CardTitle>
                    <CardDescription>Your search history and results</CardDescription>
                  </div>
                  {searchHistory.length > 0 && (
                    <Button variant="destructive" size="sm" onClick={handleClearAllHistory}>
                      <Trash2 className="mr-2 size-4" />
                      Clear All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {searchHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Search className="size-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No search history yet</p>
                    <Button asChild className="mt-4">
                      <Link href="/search">Start Searching</Link>
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {searchHistory.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium">{item.query}</p>
                              <Badge variant="secondary">{item.type}</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{item.result_count} results</span>
                              <span>Cheapest: ${item.cheapest_price?.toFixed(2) || "N/A"}</span>
                              <span>{new Date(item.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetrySearch(item.id)}
                            >
                              Retry
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteHistory(item.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Saved Products Tab */}
          <TabsContent value="saved" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Saved Products</CardTitle>
                <CardDescription>Products you've bookmarked for later</CardDescription>
              </CardHeader>
              <CardContent>
                {savedProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <Bookmark className="size-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No saved products yet</p>
                    <Button asChild className="mt-4">
                      <Link href="/search">Find Products</Link>
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {savedProducts.map((product) => (
                        <div
                          key={product.id}
                          className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
                        >
                          <div className="flex gap-4">
                            <div className="relative size-20 bg-muted rounded flex-shrink-0">
                              <Image
                                src={product.product_image || "/images/ProductImage.jpg"}
                                alt={product.product_name}
                                fill
                                className="object-cover rounded"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <Badge variant="secondary" className="mb-1">
                                {product.store}
                              </Badge>
                              <h3 className="font-semibold line-clamp-2 mb-1">
                                {product.product_name}
                              </h3>
                              <p className="text-lg font-bold text-primary">
                                ${product.product_price.toFixed(2)}
                              </p>
                              {product.notes && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                  {product.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              asChild
                            >
                              <a href={product.product_url} target="_blank" rel="noopener noreferrer">
                                View Product
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSaved(product.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}