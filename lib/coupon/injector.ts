export interface Coupon {
  code: string;
  discount_percent?: number;
  description?: string;
}

export interface CouponResult {
  final_url: string;
  applied?: Coupon | null;
}

// Pure function to attach coupon to an affiliate URL. Returns modified URL and coupon applied.
export function attachCouponToUrl(url: string, coupon?: Coupon | null): CouponResult {
  if (!coupon) return { final_url: url, applied: null };

  try {
    const u = new URL(url);
    // attach coupon as query param `coupon` and `discount`
    u.searchParams.set('coupon', coupon.code);
    if (coupon.discount_percent != null) u.searchParams.set('discount_percent', String(coupon.discount_percent));
    return { final_url: u.toString(), applied: coupon };
  } catch (err) {
    // If URL parsing fails, append safely
    const sep = url.includes('?') ? '&' : '?';
    const appended = `${url}${sep}coupon=${encodeURIComponent(coupon.code)}`;
    return { final_url: appended, applied: coupon };
  }
}
