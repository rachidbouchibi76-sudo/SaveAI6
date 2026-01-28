import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Search, TrendingDown, Zap, ShieldCheck, Globe } from "lucide-react"

export default function HomePage() {
  const features = [
    {
      icon: Search,
      title: "Smart Search",
      description: "Paste any product URL or search by keyword to find the best prices instantly",
    },
    {
      icon: TrendingDown,
      title: "Best Deals",
      description: "AI-powered comparison across multiple stores to find you the lowest prices",
    },
    {
      icon: Zap,
      title: "Real-Time Analysis",
      description: "Live agent technology that analyzes prices and alternatives in seconds",
    },
    {
      icon: ShieldCheck,
      title: "Trusted Stores",
      description: "Only verified retailers and secure affiliate links for your safety",
    },
    {
      icon: Globe,
      title: "Global Coverage",
      description: "Compare prices across thousands of stores worldwide",
    },
    {
      icon: Sparkles,
      title: "AI-Powered",
      description: "Advanced machine learning to find alternatives and hidden deals",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="size-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">SaveAI</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm hover:text-primary transition-colors">
              Home
            </Link>
            <Link href="/search" className="text-sm hover:text-primary transition-colors">
              Search
            </Link>
            <Link href="/auth" className="text-sm hover:text-primary transition-colors">
              Sign In
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
              <Link href="/auth">Sign In</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/search">Start Saving</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="size-4" />
            <span>AI-Powered Price Comparison</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance">
            Find the Best Deals with <span className="text-primary">Smart AI</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground text-pretty max-w-2xl mx-auto">
            SaveAI analyzes thousands of stores in real-time to find you the lowest prices and best alternatives. Save
            money effortlessly with our intelligent price comparison platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/search">
                <Search className="mr-2 size-4" />
                Start Searching
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto bg-transparent">
              <Link href="/auth">Create Account</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose SaveAI?</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Our AI-powered platform helps you make smarter shopping decisions
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="border-border hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="size-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <Card className="border-primary/50 bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Saving?</CardTitle>
            <CardDescription className="text-lg max-w-2xl mx-auto">
              Join thousands of smart shoppers who are already saving money with SaveAI
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/search">
                <Search className="mr-2 size-4" />
                Search Products
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/auth">Sign Up Free</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="size-6 rounded bg-primary flex items-center justify-center">
                <Sparkles className="size-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">SaveAI</span>
            </div>
            <p className="text-sm text-muted-foreground">© 2025 SaveAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
