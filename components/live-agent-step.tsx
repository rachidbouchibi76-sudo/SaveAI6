import { Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LiveAgentStepProps {
  step: number
  label: string
  status: "pending" | "active" | "complete"
}

export default function LiveAgentStep({ step, label, status }: LiveAgentStepProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "size-8 rounded-full flex items-center justify-center font-semibold text-sm transition-colors",
          status === "complete" && "bg-primary text-primary-foreground",
          status === "active" && "bg-primary/20 text-primary border-2 border-primary",
          status === "pending" && "bg-muted text-muted-foreground",
        )}
      >
        {status === "complete" ? (
          <Check className="size-4" />
        ) : status === "active" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          step
        )}
      </div>
      <div className="flex-1">
        <p
          className={cn(
            "text-sm font-medium transition-colors",
            status === "complete" && "text-foreground",
            status === "active" && "text-primary font-semibold",
            status === "pending" && "text-muted-foreground",
          )}
        >
          {label}
        </p>
      </div>
    </div>
  )
}
