import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from 'lexical'
import { getPayload } from 'payload'
import config from '@payload-config'
import { DemoRequestForm } from '@/components/DemoRequestForm'
import {
  articleJsonLd,
  authorNameFromDoc,
  categoryFromDoc,
  getSiteUrl,
  mediaAltFromDoc,
  mediaFromDoc,
  publishedDateFromDoc,
  relatedToolCtas,
  type BlogArticleDoc,
} from '@/lib/blog'

export const revalidate = 60

type ArticlePageProps = {
  params: Promise<{ slug: string }>
}

const dateFormatter = new Intl.DateTimeFormat('ro-RO', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

async function fetchArticle(slug: string) {
  const payload = await getPayload({ config })
  try {
    const result = await payload.find({
      collection: 'continut-educational',
      where: { slug: { equals: slug } },
      depth: 1,
      limit: 1,
    })
    return result.docs[0] as BlogArticleDoc | undefined
  } catch (error) {
    console.error('Blog article failed:', error)
    return undefined
  }
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params
  const article = await fetchArticle(slug)

  if (!article) return { title: 'Articol negăsit | Finance Platform' }

  const baseUrl = getSiteUrl()
  const imageUrl = mediaFromDoc(article, 'hero')
  const absoluteImageUrl = imageUrl?.startsWith('http') ? imageUrl : imageUrl ? `${baseUrl}${imageUrl}` : undefined
  const canonical = article.seo?.canonicalUrl || `${baseUrl}/blog/${article.slug}`
  const title = article.seo?.title || `${article.title} | Finance Platform`
  const description = article.seo?.description || article.excerpt

  return {
    title,
    description,
    alternates: { canonical },
    robots: article.seo?.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'article',
      publishedTime: publishedDateFromDoc(article),
      modifiedTime: article.updatedAt || undefined,
      images: absoluteImageUrl ? [{ url: absoluteImageUrl, alt: mediaAltFromDoc(article) }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: absoluteImageUrl ? [absoluteImageUrl] : [],
    },
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params
  const article = await fetchArticle(slug)
  if (!article) notFound()

  const category = categoryFromDoc(article)
  const imageUrl = mediaFromDoc(article, 'hero')
  const toolCta = relatedToolCtas[article.relatedTool || 'general']
  const jsonLd = articleJsonLd(article)
  const publishedAt = publishedDateFromDoc(article)

  return (
    <main className="flex-1">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="max-w-6xl mx-auto px-6 py-10 md:py-14">
        <header className="grid lg:grid-cols-[0.95fr_1.05fr] gap-8 lg:gap-12 items-end">
          <div className="space-y-5">
            <Link href="/blog" className="pill inline-flex">
              ← Blog
            </Link>
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-2)]">
              {category.name} · {dateFormatter.format(new Date(publishedAt))}
            </div>
            <h1 className="font-serif h-hero tracking-tight">{article.title}</h1>
            <p className="text-lg text-[var(--muted)] leading-relaxed">{article.excerpt}</p>
            <p className="text-sm text-[var(--muted-2)]">Autor: {authorNameFromDoc(article)}</p>
          </div>

          <div className="card overflow-hidden">
            <div className="aspect-[16/10] bg-[var(--accent-soft)]">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={mediaAltFromDoc(article)} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full grid place-items-center text-[var(--muted)]">
                  Finance Platform
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-10 lg:gap-14 mt-12">
          <div className="article-content">
            {article.content ? <RichText data={article.content as SerializedEditorState} /> : null}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 self-start">
            <div className="card p-5">
              <div className="text-xs uppercase tracking-[0.14em] text-[var(--muted-2)]">
                Aplică numeric
              </div>
              <h2 className="font-serif text-2xl tracking-tight mt-2">{toolCta.label}</h2>
              <p className="text-sm text-[var(--muted)] leading-relaxed mt-2">{toolCta.body}</p>
              <Link href={toolCta.href} className="btn-primary inline-flex mt-4">
                Deschide unealta →
              </Link>
            </div>
            <div className="card p-5">
              <div className="text-xs uppercase tracking-[0.14em] text-[var(--muted-2)]">
                Demo B2B
              </div>
              <p className="text-sm text-[var(--muted)] leading-relaxed mt-2">
                Vrei să vezi flow-ul complet cu simulări salvate, share link și PDF white-label?
              </p>
              <Link href="/demo" className="btn-secondary inline-flex mt-4">
                Cere demo
              </Link>
            </div>
          </aside>
        </div>
      </article>

      <section className="max-w-6xl mx-auto px-6 pb-16 md:pb-24">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-6 items-start">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-2)]">
              Discuție pentru firmă
            </div>
            <h2 className="font-serif h-section mt-2 tracking-tight">
              Transformă articolul într-un demo pentru echipa ta.
            </h2>
            <p className="text-sm text-[var(--muted)] mt-3 leading-relaxed">
              Cererea intră în admin și poate fi urmărită ca lead B2B. Nu trimitem email automat în v1.
            </p>
          </div>
          <DemoRequestForm sourcePath={`/blog/${article.slug}`} />
        </div>
      </section>
    </main>
  )
}
