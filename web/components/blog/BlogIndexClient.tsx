'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { BlogCard } from './BlogCard'
import type { BlogArticleCard, BlogCategory } from '@/lib/blog'

type BlogResponse = {
  docs: BlogArticleCard[]
  hasNextPage: boolean
  nextPage: number | null
}

export function BlogIndexClient({
  initialArticles,
  categories,
  activeCategory,
  hasNextPage,
  nextPage,
}: {
  initialArticles: BlogArticleCard[]
  categories: BlogCategory[]
  activeCategory?: string
  hasNextPage: boolean
  nextPage: number | null
}) {
  const [articles, setArticles] = useState(initialArticles)
  const [page, setPage] = useState(nextPage)
  const [more, setMore] = useState(hasNextPage)
  const [loading, setLoading] = useState(false)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    params.set('limit', '6')
    if (activeCategory) params.set('categorie', activeCategory)
    return params
  }, [activeCategory])

  const loadMore = async () => {
    if (!page || loading || !more) return
    setLoading(true)
    const params = new URLSearchParams(query)
    params.set('page', String(page))
    try {
      const res = await fetch(`/api/blog/articles?${params.toString()}`)
      if (!res.ok) throw new Error('Nu am putut încărca articolele.')
      const data = (await res.json()) as BlogResponse
      setArticles((current) => [...current, ...data.docs])
      setMore(data.hasNextPage)
      setPage(data.nextPage)
    } catch {
      setMore(false)
    } finally {
      setLoading(false)
    }
  }

  const featured = articles.find((article) => article.featured) || articles[0]
  const rest = featured ? articles.filter((article) => article.id !== featured.id) : articles

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        <Link href="/blog" className={`btn-secondary ${!activeCategory ? 'bg-[var(--accent-soft)] border-[var(--accent)]/30' : ''}`}>
          Toate
        </Link>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/blog?categorie=${category.slug}`}
            className={`btn-secondary ${activeCategory === category.slug ? 'bg-[var(--accent-soft)] border-[var(--accent)]/30' : ''}`}
          >
            {category.name}
          </Link>
        ))}
      </div>

      {featured ? <BlogCard article={featured} priority /> : null}

      {rest.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rest.map((article) => (
            <BlogCard key={article.id} article={article} />
          ))}
        </div>
      ) : null}

      {articles.length === 0 ? (
        <div className="card p-8 text-center">
          <h2 className="font-serif text-2xl tracking-tight">Nu există articole publicate încă.</h2>
          <p className="text-sm text-[var(--muted)] mt-2">
            Conținutul educațional va apărea aici după publicarea din CMS.
          </p>
        </div>
      ) : null}

      {more ? (
        <div className="flex justify-center pt-4">
          <button type="button" onClick={loadMore} disabled={loading} className="btn-primary">
            {loading ? 'Se încarcă...' : 'Încarcă mai multe'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
