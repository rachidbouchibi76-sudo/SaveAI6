export interface TrustInputs {
  average_rating?: number; // 0-5
  number_of_reviews?: number; // count
  price?: number; // numeric
  category_avg_price?: number; // numeric
  seller_reputation?: number; // 0-100
  return_rate?: number | null; // 0-1
}

export interface TrustResult {
  trust_score: number; // 0-100
  components: Record<string, number>;
}

// Compute a heuristic trust score (0-100) from inputs.
export function computeTrustScore(input: TrustInputs): TrustResult {
  // Defensive normalization with sensible defaults
  const rating = Math.max(0, Math.min(5, input.average_rating ?? 0));
  const reviews = Math.max(0, input.number_of_reviews ?? 0);
  const price = input.price ?? 0;
  const catAvg = input.category_avg_price ?? price || 1;
  const sellerRep = Math.max(0, Math.min(100, input.seller_reputation ?? 50));
  const returnRate = input.return_rate == null ? 0.1 : Math.max(0, Math.min(1, input.return_rate));

  // Component scores (0-100)
  const ratingScore = (rating / 5) * 100;
  // Log-scaled review score to avoid huge counts dominating
  const reviewsScore = Math.min(100, Math.log10(reviews + 1) / 5 * 100);
  // Price comparison: cheaper-than-average is a small bonus, overpriced small penalty
  const priceRatio = catAvg > 0 ? price / catAvg : 1;
  const priceScore = Math.max(0, Math.min(100, (1 / priceRatio) * 100));
  // Seller reputation passed through
  const sellerScore = sellerRep;
  // Return rate penalizes trust
  const returnScore = Math.max(0, 100 * (1 - returnRate));

  // Weights (tunable)
  const weights = {
    rating: 0.35,
    reviews: 0.2,
    price: 0.15,
    seller: 0.2,
    returns: 0.1,
  };

  const trustScore = Math.round(
    ratingScore * weights.rating +
      reviewsScore * weights.reviews +
      priceScore * weights.price +
      sellerScore * weights.seller +
      returnScore * weights.returns
  );

  return {
    trust_score: Math.max(0, Math.min(100, trustScore)),
    components: {
      rating: Math.round(ratingScore),
      reviews: Math.round(reviewsScore),
      price: Math.round(priceScore),
      seller: Math.round(sellerScore),
      returns: Math.round(returnScore),
    },
  };
}
