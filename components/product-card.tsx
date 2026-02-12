import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import BuyButton from "./buy-button"

interface ProductCardProps {
  title: string
  price: number
  platform: string
  imageURL: string
  affiliateLink: string
}

export default function ProductCard({ title, price, platform, imageURL, affiliateLink }: ProductCardProps) {
  return (
    <Card className="overflow-hidden hover:border-primary/50 transition-colors">
      <div className="relative aspect-square bg-muted">
        <Image src={imageURL || "/placeholder.svg"} alt={title} fill className="object-cover" />
      </div>
      <CardContent className="p-4">
        <Badge variant="secondary" className="mb-2">
          {platform}
        </Badge>
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{title}</h3>
        <p className="text-2xl font-bold text-primary">${price.toFixed(2)}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <BuyButton affiliateLink={affiliateLink} />
      </CardFooter>
    </Card>
  )
}
