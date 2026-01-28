"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, TrendingDown } from "lucide-react"
import { apiClient, type SharedComparison } from "@/lib/api/client"
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

export default function SharedComparisonPage() {
  const params = useParams()
  const token = params.token as string
  
  const [comparison, setComparison] = useState<SharedComparison | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadComparison()
  }, [token])

  const loadComparison = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await apiClient.getSharedComparison(token)
      setComparison(data)
    } catch (err) {
      console.error("Failed to load comparison:", err)
      setError(err instanceof Error ? err.message : "Failed to load comparison")
    } finally {
      setLoading(false)
    }
  }

  const getBestValue = () => {
    if (!comparison || comparison.products.length === 0) return null
    return comparison.products.reduce((best, current) => 
      current.price < best.price ? current : best
    )
  }

  const bestValue = getBestValue()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading comparison...</p>
        </div>
      </div>
    )
  }

  if (error || !comparison) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
                <Sparkles className="size-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">SaveAI</span>
            </Link>
          </div>
        </header>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Comparison Not Found</h1>
          <p className="text-muted-foreground mb-6">{error || "This comparison link is invalid or has expired"}</p>
          <Button asChild>
            <Link href="/">Go to Home</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="size-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">SaveAI</span>
          </Link>
          <Button asChild>
            <Link href="/search">Search Products</Link>
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{comparison.title}</h1>
          <p className="text-muted-foreground">Shared product comparison</p>
        </div>

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
              <CardTitle>Product Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Feature</TableHead>
                      {comparison.products.map((product) => (
                        <TableHead key={product.id} className="text-center">
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-sm">{product.store}</span>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Product Images */}
                    <TableRow>
                      <TableCell className="font-medium">Image</TableCell>
                      {comparison.products.map((product) => (
                        <TableCell key={product.id} className="text-center">
                          <div className="relative size-24 mx-auto bg-muted rounded">
                            <Image
                              src={product.image || "/images/photo1767761087.jpg"}
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
                      {comparison.products.map((product) => (
                        <TableCell key={product.id} className="text-center">
                          <p className="font-semibold line-clamp-2">{product.name}</p>
                        </TableCell>
                      ))}
                    </TableRow>

                    {/* Store */}
                    <TableRow>
                      <TableCell className="font-medium">Store</TableCell>
                      {comparison.products.map((product) => (
                        <TableCell key={product.id} className="text-center">
                          <Badge variant="secondary">{product.store}</Badge>
                        </TableCell>
                      ))}
                    </TableRow>

                    {/* Price */}
                    <TableRow>
                      <TableCell className="font-medium">Price</TableCell>
                      {comparison.products.map((product) => (
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
                      {comparison.products.map((product) => (
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
                      {comparison.products.map((product) => (
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

          {/* CTA */}
          <Card className="bg-primary/10 border-primary/50">
            <CardContent className="py-8 text-center">
              <h3 className="text-xl font-bold mb-2">Want to find your own deals?</h3>
              <p className="text-muted-foreground mb-4">
                Use SaveAI to compare prices and find the best deals on any product
              </p>
              <Button asChild size="lg">
                <Link href="/search">Start Searching</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}