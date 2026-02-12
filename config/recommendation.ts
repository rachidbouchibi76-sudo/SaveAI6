/**
 * Centralized configuration for the recommendation engine
 * Defines strictness levels and trust signals for all business rules
 */

export const RecommendationConfig = {
  global: {
    minRating: 4.0,
    minReviews: 10,
    priceOutlierThreshold: 0.4, // 40% below median is suspicious
  },
  categorySpecific: {
    Electronics: {
      minReviews: 50, // Electronics need more social proof
      minRating: 4.2,
      priceOutlierThreshold: 0.35, // Even stricter for electronics
    },
    Fashion: {
      minReviews: 5,
      minRating: 3.8,
      priceOutlierThreshold: 0.45, // More lenient for fashion
    },
    Home: {
      minReviews: 15,
      minRating: 4.0,
      priceOutlierThreshold: 0.4,
    },
    Gifts: {
      minReviews: 8,
      minRating: 3.9,
      priceOutlierThreshold: 0.4,
    },
    Books: {
      minReviews: 5,
      minRating: 3.7,
      priceOutlierThreshold: 0.5,
    },
  },
  trustSignals: {
    fastShippingThresholdDays: 3,
    highReviewCountThreshold: 1000,
    mediumReviewCountThreshold: 500,
    verifiedBadgeReviewsRequired: 100,
    premiumSellersMinRating: 4.5,
  },
  priceOutlierDetection: {
    // Allow extreme leniency or strictness per category to override global
    strictCategories: ['Electronics', 'Jewelry'],
    lenientCategories: ['Books', 'Digital'],
  },
}
