import Link from 'next/link'
import type { BlogArticleCard } from '@/lib/blog'

const dateFormatter = new Intl.DateTimeFormat('ro-RO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

export function BlogCard({ article, priority = false }: { article: BlogArticleCard; priority?: boolean }) {
  return (
    <Link href={`/blog/${article.slug}`} className="card card-hover overflow-hidden group block h-full">
      <div className={`${priority ? 'md:grid md:grid-cols-[1.1fr_1fr]' : ''} h-full`}>
        <div className="aspect-[16/9] bg-[var(--accent-soft)] overflow-hidden">
          {article.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.imageUrl}
              alt={article.imageAlt}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="h-full w-full grid place-items-center px-8 text-center text-sm text-[var(--muted)]">
              Finance Platform
            </div>
          )}
        </div>
        <div className="p-5 md:p-6 flex flex-col">
          <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.13em] text-[var(--muted-2)]">
            <span>{article.categoryName}</span>
            <time dateTime={article.publishedAt}>
              {dateFormatter.format(new Date(article.publishedAt))}
            </time>
          </div>
          <h2 className={`${priority ? 'font-serif text-3xl' : 'font-serif text-2xl'} mt-4 tracking-tight leading-tight`}>
            {article.title}
          </h2>
          <p className="text-sm text-[var(--muted)] mt-3 leading-relaxed line-clamp-3">
            {article.excerpt}
          </p>
          <span className="mt-5 text-sm font-medium text-[var(--accent)]">
            Citește articolul →
          </span>
        </div>
      </div>
    </Link>
  )
}
