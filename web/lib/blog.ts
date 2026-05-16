export type BlogCategory = {
  id: string | number
  name: string
  slug: string
  description?: string | null
}

export type BlogUser = {
  id?: string | number
  email?: string | null
  nume?: string | null
}

export type BlogMedia = {
  id?: string | number
  url?: string | null
  alt?: string | null
  sizes?: {
    card?: { url?: string | null } | null
    hero?: { url?: string | null } | null
  } | null
}

export type BlogArticleDoc = {
  id: string | number
  title: string
  slug: string
  excerpt: string
  content?: unknown
  category?: BlogCategory | string | number | null
  heroImage?: BlogMedia | string | number | null
  author?: BlogUser | string | number | null
  publishedAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  featured?: boolean | null
  relatedTool?: RelatedTool | null
  seo?: {
    title?: string | null
    description?: string | null
    canonicalUrl?: string | null
    noIndex?: boolean | null
  } | null
}

export type BlogArticleCard = {
  id: string | number
  title: string
  slug: string
  excerpt: string
  categoryName: string
  categorySlug: string | null
  imageUrl: string | null
  imageAlt: string
  publishedAt: string
  featured: boolean
  relatedTool: RelatedTool
}

export type RelatedTool =
  | 'credit'
  | 'optimizare'
  | 'depozit'
  | 'investitii'
  | 'unit_linked'
  | 'comparator'
  | 'general'

export const relatedToolCtas: Record<RelatedTool, { label: string; href: string; body: string }> = {
  credit: {
    label: 'Deschide Simulator Credit',
    href: '/tools/credit',
    body: 'Transformă conceptele din articol într-un scadențar concret, cu dobândă, comisioane și rambursări.',
  },
  optimizare: {
    label: 'Testează Optimizarea Creditului',
    href: '/tools/optimizare',
    body: 'Compară rambursarea anticipată cu investiția paralelă pe aceleași ipoteze.',
  },
  depozit: {
    label: 'Calculează un depozit',
    href: '/tools/depozit',
    body: 'Vezi dobânda netă, impozitul și efectul capitalizării pe o sumă reală.',
  },
  investitii: {
    label: 'Simulează investiția ETF',
    href: '/tools/investitii',
    body: 'Construiește un scenariu DCA cu taxe, impozit și randamente istorice.',
  },
  unit_linked: {
    label: 'Analizează Unit-Linked',
    href: '/tools/investitii?mode=ul',
    body: 'Vezi explicit taxele de alocare, administrare și costul asigurării.',
  },
  comparator: {
    label: 'Compară opțiunile',
    href: '/tools/comparator',
    body: 'Pune depozitul, ETF-ul și Unit-Linked-ul pe același cash-flow.',
  },
  general: {
    label: 'Vezi uneltele financiare',
    href: '/tools/credit',
    body: 'Aplică ideile din articol într-o simulare numerică transparentă.',
  },
}

export function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.replace(/^/, 'https://') ||
    'https://instrumentar.vercel.app'
  )
}

export function categoryFromDoc(doc: BlogArticleDoc) {
  if (doc.category && typeof doc.category === 'object') {
    return {
      name: doc.category.name || 'Educație financiară',
      slug: doc.category.slug || null,
    }
  }
  return { name: 'Educație financiară', slug: null }
}

export function mediaFromDoc(doc: BlogArticleDoc, size: 'card' | 'hero' = 'card') {
  if (!doc.heroImage || typeof doc.heroImage !== 'object') return null
  return doc.heroImage.sizes?.[size]?.url || doc.heroImage.url || null
}

export function mediaAltFromDoc(doc: BlogArticleDoc) {
  if (!doc.heroImage || typeof doc.heroImage !== 'object') return doc.title
  return doc.heroImage.alt || doc.title
}

export function authorNameFromDoc(doc: BlogArticleDoc) {
  if (doc.author && typeof doc.author === 'object') {
    return doc.author.nume || doc.author.email || 'Finance Platform'
  }
  return 'Finance Platform'
}

export function publishedDateFromDoc(doc: BlogArticleDoc) {
  return doc.publishedAt || doc.createdAt || doc.updatedAt || new Date().toISOString()
}

export function formatBlogArticleCard(doc: BlogArticleDoc): BlogArticleCard {
  const category = categoryFromDoc(doc)
  return {
    id: doc.id,
    title: doc.title,
    slug: doc.slug,
    excerpt: doc.excerpt,
    categoryName: category.name,
    categorySlug: category.slug,
    imageUrl: mediaFromDoc(doc, 'card'),
    imageAlt: mediaAltFromDoc(doc),
    publishedAt: publishedDateFromDoc(doc),
    featured: Boolean(doc.featured),
    relatedTool: doc.relatedTool || 'general',
  }
}

export function articleJsonLd(doc: BlogArticleDoc) {
  const baseUrl = getSiteUrl()
  const imageUrl = mediaFromDoc(doc, 'hero')
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: doc.title,
    description: doc.seo?.description || doc.excerpt,
    image: imageUrl ? [imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`] : [],
    datePublished: publishedDateFromDoc(doc),
    dateModified: doc.updatedAt || publishedDateFromDoc(doc),
    author: [{ '@type': 'Person', name: authorNameFromDoc(doc) }],
    publisher: { '@type': 'Organization', name: 'Finance Platform' },
    mainEntityOfPage: `${baseUrl}/blog/${doc.slug}`,
  }
}

export function softwareApplicationJsonLd() {
  const baseUrl = getSiteUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Finance Platform',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    url: baseUrl,
    inLanguage: 'ro-RO',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
    },
    featureList: [
      'Simulator credit',
      'Optimizare credit',
      'Depozit bancar',
      'Investiții ETF',
      'Unit-Linked',
      'Comparator financiar',
    ],
  }
}
