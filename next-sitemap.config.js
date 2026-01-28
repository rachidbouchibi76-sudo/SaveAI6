/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://saveai.example.com',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  exclude: ['/auth', '/dashboard', '/compare', '/api/*', '/share/*'],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/auth', '/dashboard', '/compare'],
      },
    ],
  },
}