"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, ArrowLeft, Plus, X, TrendingDown } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface ComparisonProduct {
  id: string
  name: string
  price: number
  store: string
  image?: string
  url: string
  rating?: number
  reviews?: number
}

export default function ComparePage() {
  const router = useRouter()
  const { user, loading: authLoading, supabase } = useAuth()
  
  const [products, setProducts] = useState<ComparisonProduct[]>([])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth")
      return
    }

    // Load products from localStorage or URL params
    const savedProducts = localStorage.getItem("compareProducts")
    if (savedProducts) {
      try {
        setProducts(JSON.parse(savedProducts))
      } catch (error) {
        console.error("Failed to load comparison products:", error)
      }
    }
  }, [user, authLoading, router])

  const handleRemoveProduct = (id: string) => {
    const updated = products.filter(p => p.id !== id)
    setProducts(updated)
    localStorage.setItem("compareProducts", JSON.stringify(updated))
    toast.success("Product removed from comparison")
  }

  const handleClearAll = () => {
    setProducts([])
    localStorage.removeItem("compareProducts")
    toast.success("Comparison cleared")
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast.success("Signed out successfully")
    router.push("/")
  }

  const getBestValue = () => {
    if (products.length === 0) return null
    return products.reduce((best, current) => 
      current.price < best.price ? current : best
    )
  }

  const bestValue = getBestValue()

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
            <Button onClick={handleSignOut} variant="outline" size="sm">
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Compare Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Product Comparison</h1>
              <p className="text-muted-foreground">Compare products side by side</p>
            </div>
            {products.length > 0 && (
              <Button variant="destructive" onClick={handleClearAll}>
                Clear All
              </Button>
            )}
          </div>
        </div>

        {products.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Plus className="size-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Products to Compare</h3>
              <p className="text-muted-foreground mb-6">
                Search for products and add them to comparison
              </p>
              <Button asChild>
                <Link href="/search">Start Searching</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Best Value Highlight */}
            {bestValue && (
              <Card className="bg-primary/10 border-primary/50">
                <CardContent className="py-4">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="size-5 text-primary" />
                    <span className="font-semibold">Best Value:</span>
                    <span>{bestValue.name}</span>
                    <span className="text-primary font-bold">${bestValue.price.toFixed(2)}</span>
                    <span className="text-muted-foreground">at {bestValue.store}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Comparison Table */}
            <Card>
              <CardHeader>
                <CardTitle>Side-by-Side Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[150px]">Feature</TableHead>
                        {products.map((product) => (
                          <TableHead key={product.id} className="text-center">
                            <div className="flex flex-col items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveProduct(product.id)}
                                className="ml-auto"
                              >
                                <X className="size-4" />
                              </Button>
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Product Images */}
                      <TableRow>
                        <TableCell className="font-medium">Image</TableCell>
                        {products.map((product) => (
                          <TableCell key={product.id} className="text-center">
                            <div className="relative size-24 mx-auto bg-muted rounded">
                              <Image
                                src={product.image || "/images/Product.jpg"}
                                alt={product.name}
                                fill
                                className="object-cover rounded"
                              />
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>

                      {/* Product Names */}
                      <TableRow>
                        <TableCell className="font-medium">Product</TableCell>
                        {products.map((product) => (
                          <TableCell key={product.id} className="text-center">
                            <p className="font-semibold line-clamp-2">{product.name}</p>
                          </TableCell>
                        ))}
                      </TableRow>

                      {/* Store */}
                      <TableRow>
                        <TableCell className="font-medium">Store</TableCell>
                        {products.map((product) => (
                          <TableCell key={product.id} className="text-center">
                            <Badge variant="secondary">{product.store}</Badge>
                          </TableCell>
                        ))}
                      </TableRow>

                      {/* Price */}
                      <TableRow>
                        <TableCell className="font-medium">Price</TableCell>
                        {products.map((product) => (
                          <TableCell key={product.id} className="text-center">
                            <p className={`text-xl font-bold ${product.id === bestValue?.id ? 'text-primary' : ''}`}>
                              ${product.price.toFixed(2)}
                            </p>
                            {product.id === bestValue?.id && (
                              <Badge variant="default" className="mt-1">Best Price</Badge>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>

                      {/* Rating */}
                      <TableRow>
                        <TableCell className="font-medium">Rating</TableCell>
                        {products.map((product) => (
                          <TableCell key={product.id} className="text-center">
                            {product.rating ? (
                              <div>
                                <p className="font-semibold">{product.rating} ⭐</p>
                                <p className="text-sm text-muted-foreground">
                                  {product.reviews} reviews
                                </p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>

                      {/* Action Buttons */}
                      <TableRow>
                        <TableCell className="font-medium">Action</TableCell>
                        {products.map((product) => (
                          <TableCell key={product.id} className="text-center">
                            <Button asChild size="sm">
                              <a href={product.url} target="_blank" rel="noopener noreferrer">
                                View Product
                              </a>
                            </Button>
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Add More Products */}
            {products.length < 4 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground mb-4">
                    You can compare up to 4 products
                  </p>
                  <Button asChild variant="outline">
                    <Link href="/search">
                      <Plus className="mr-2 size-4" />
                      Add More Products
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}