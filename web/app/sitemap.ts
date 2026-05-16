import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getSiteUrl, type BlogArticleDoc } from '@/lib/blog'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl()
  const now = new Date()
  const staticPaths = [
    '',
    '/blog',
    '/demo',
    '/tools/credit',
    '/tools/optimizare',
    '/tools/depozit',
    '/tools/investitii',
    '/tools/comparator',
  ] as const
  const staticRoutes: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency: path === '' || path === '/blog' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : path === '/blog' ? 0.85 : 0.7,
  }))

  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'continut-educational',
      pagination: false,
      depth: 0,
      where: {
        and: [
          { _status: { equals: 'published' } },
          { 'seo.noIndex': { not_equals: true } },
        ],
      },
      select: {
        slug: true,
        updatedAt: true,
      },
    })

    const articles = (result.docs as BlogArticleDoc[]).map((doc) => ({
      url: `${baseUrl}/blog/${doc.slug}`,
      lastModified: doc.updatedAt ? new Date(doc.updatedAt) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.65,
    }))

    return [...staticRoutes, ...articles]
  } catch (error) {
    console.error('Sitemap generation failed:', error)
    return staticRoutes
  }
}
