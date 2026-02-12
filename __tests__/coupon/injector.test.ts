import { attachCouponToUrl } from '../../lib/coupon/injector';

describe('attachCouponToUrl', () => {
  test('attaches coupon to well-formed URL', () => {
    const res = attachCouponToUrl('https://example.com/product/1?foo=bar', { code: 'SAVE10', discount_percent: 10 });
    expect(res.final_url).toContain('coupon=SAVE10');
    expect(res.final_url).toContain('discount_percent=10');
  });

  test('appends coupon to malformed URL safely', () => {
    const res = attachCouponToUrl('not-a-url', { code: 'SAVE10' });
    expect(res.final_url).toContain('coupon=SAVE10');
  });
});
