export interface ExplanationInputs {
  productTitle: string;
  average_rating?: number;
  number_of_reviews?: number;
  price?: number;
  category_avg_price?: number;
  trust_score?: number; // 0-100
}

export function generateExplanation(inputs: ExplanationInputs): string {
  const parts: string[] = [];

  if (inputs.average_rating != null && inputs.number_of_reviews != null) {
    parts.push(`has ${inputs.average_rating.toFixed(1)}⭐ rating from ${inputs.number_of_reviews.toLocaleString()} buyers`);
  } else if (inputs.average_rating != null) {
    parts.push(`has ${inputs.average_rating.toFixed(1)}⭐ rating`);
  }

  if (inputs.price != null && inputs.category_avg_price != null) {
    const pct = ((1 - inputs.price / inputs.category_avg_price) * 100).toFixed(0);
    if (Number(pct) > 0) {
      parts.push(`costs ${pct}% less than similar products`);
    } else if (Number(pct) < 0) {
      parts.push(`costs ${Math.abs(Number(pct))}% more than similar products`);
    }
  }

  if (inputs.trust_score != null) {
    parts.push(`trust score ${Math.round(inputs.trust_score)} / 100`);
  }

  if (parts.length === 0) return `Recommended: ${inputs.productTitle}`;
  return `Recommended because it ${parts.join(' and ')}`;
}
