import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"

interface BuyButtonProps {
  affiliateLink: string
}

export default function BuyButton({ affiliateLink }: BuyButtonProps) {
  return (
    <Button asChild className="w-full" size="lg">
      <a href={affiliateLink} target="_blank" rel="noopener noreferrer">
        Buy Now
        <ExternalLink className="ml-2 size-4" />
      </a>
    </Button>
  )
}
