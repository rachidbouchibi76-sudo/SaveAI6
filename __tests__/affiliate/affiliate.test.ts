import { buildAffiliateLink } from '../../lib/affiliate/builder';
import { loadAffiliateConfig } from '../../lib/affiliate/config';

describe('AffiliateLinkBuilder', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test('generates amazon affiliate link when config present', () => {
    process.env.AFFILIATE_AMAZON_ID = 'mytag-20';
    process.env.AFFILIATE_AMAZON_TEMPLATE = '{base_url}/dp/{product_id}?tag={affiliate_id}';

    const cfg = loadAffiliateConfig();
    const inputUrl = 'https://www.amazon.com/dp/B08N5WRWNW';
    const res = buildAffiliateLink('amazon', inputUrl, cfg);

    expect(res.platform).toBe('amazon');
    expect(res.product_id).toBe('B08N5WRWNW');
    expect(res.final_url).toContain('mytag-20');
    expect(res.final_url).toContain('B08N5WRWNW');
  });

  test('generates shein affiliate link when config present', () => {
    process.env.AFFILIATE_SHEIN_ID = 'shein-aff-123';
    process.env.AFFILIATE_SHEIN_TEMPLATE = '{base_url}/product/{product_id}.html?aff={affiliate_id}';

    const cfg = loadAffiliateConfig();
    const inputUrl = 'https://us.shein.com/product/123456.html';
    const res = buildAffiliateLink('shein', inputUrl, cfg);

    expect(res.platform).toBe('shein');
    expect(res.product_id).toBe('123456');
    expect(res.final_url).toContain('shein-aff-123');
  });

  test('generates aliexpress affiliate link when config present', () => {
    process.env.AFFILIATE_ALIEXPRESS_ID = 'ali-aff-999';
    process.env.AFFILIATE_ALIEXPRESS_TEMPLATE = '{base_url}/item/{product_id}.html?aff={affiliate_id}';

    const cfg = loadAffiliateConfig();
    const inputUrl = 'https://www.aliexpress.com/item/4001234567890.html';
    const res = buildAffiliateLink('aliexpress', inputUrl, cfg);

    expect(res.platform).toBe('aliexpress');
    expect(res.product_id).toBe('4001234567890');
    expect(res.final_url).toContain('ali-aff-999');
  });

  test('falls back safely when affiliate id missing', () => {
    delete process.env.AFFILIATE_AMAZON_ID;
    const cfg = loadAffiliateConfig();
    const inputUrl = 'https://www.amazon.com/dp/B08N5WRWNW';
    const res = buildAffiliateLink('amazon', inputUrl, cfg);

    // final_url should be the original URL since no affiliate id
    expect(res.final_url).toBe(inputUrl);
  });
});
