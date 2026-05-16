import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'
import { BlogIndexClient } from '@/components/blog/BlogIndexClient'
import { formatBlogArticleCard, getSiteUrl, type BlogArticleDoc, type BlogCategory } from '@/lib/blog'

export const revalidate = 60

type BlogPageProps = {
  searchParams: Promise<{ categorie?: string }>
}

export const metadata: Metadata = {
  title: 'Blog educațional | Finance Platform',
  description:
    'Articole românești despre credite, investiții, depozite și decizii financiare explicate cu formule transparente.',
  alternates: { canonical: `${getSiteUrl()}/blog` },
  openGraph: {
    title: 'Blog educațional | Finance Platform',
    description:
      'Articole românești despre credite, investiții, depozite și decizii financiare explicate cu formule transparente.',
    url: `${getSiteUrl()}/blog`,
    type: 'website',
  },
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const { categorie } = await searchParams
  const payload = await getPayload({ config })
  let categories: BlogCategory[] = []
  let activeCategory: BlogCategory | undefined
  let articles: BlogArticleDoc[] = []
  let hasNextPage = false
  let nextPage: number | null = null

  try {
    const categoriesResult = await payload.find({
      collection: 'categorii-educationale',
      pagination: false,
      sort: 'name',
      depth: 0,
    })
    categories = categoriesResult.docs as BlogCategory[]
    activeCategory = categories.find((category) => category.slug === categorie)

    const result = await payload.find({
      collection: 'continut-educational',
      sort: '-publishedAt',
      depth: 1,
      limit: 6,
      page: 1,
      where: activeCategory ? { category: { equals: activeCategory.id } } : undefined,
    })
    articles = result.docs as BlogArticleDoc[]
    hasNextPage = Boolean(result.hasNextPage)
    nextPage = result.nextPage ?? null
  } catch (error) {
    console.error('Blog index failed:', error)
  }

  return (
    <main className="flex-1 max-w-6xl mx-auto px-6 py-10 md:py-14 space-y-10">
      <header className="max-w-3xl space-y-4">
        <span className="pill reveal reveal-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
          Educație financiară · RO
        </span>
        <h1 className="font-serif h-hero tracking-tight reveal reveal-2">
          Blog pentru decizii financiare mai clare.
        </h1>
        <p className="text-[var(--muted)] text-lg leading-relaxed reveal reveal-3">
          Ghiduri scurte, exemple numerice și explicații care pot fi transformate imediat
          în simulări concrete pentru credit, economii și investiții.
        </p>
      </header>

      <BlogIndexClient
        initialArticles={articles.map(formatBlogArticleCard)}
        categories={categories}
        activeCategory={activeCategory?.slug}
        hasNextPage={hasNextPage}
        nextPage={nextPage}
      />
    </main>
  )
}
