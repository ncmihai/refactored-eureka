import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { formatBlogArticleCard, type BlogArticleDoc, type BlogCategory } from '@/lib/blog'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number(searchParams.get('page') || 1))
  const limit = Math.min(12, Math.max(1, Number(searchParams.get('limit') || 6)))
  const categorySlug = searchParams.get('categorie')

  try {
    const payload = await getPayload({ config })
    let category: BlogCategory | undefined

    if (categorySlug) {
      const categoryResult = await payload.find({
        collection: 'categorii-educationale',
        where: { slug: { equals: categorySlug } },
        depth: 0,
        limit: 1,
      })
      category = categoryResult.docs[0] as BlogCategory | undefined
    }

    const result = await payload.find({
      collection: 'continut-educational',
      sort: '-publishedAt',
      depth: 1,
      page,
      limit,
      where: categorySlug && category ? { category: { equals: category.id } } : undefined,
    })

    return NextResponse.json({
      docs: (result.docs as BlogArticleDoc[]).map(formatBlogArticleCard),
      hasNextPage: Boolean(result.hasNextPage),
      nextPage: result.nextPage ?? null,
    })
  } catch (error) {
    console.error('Blog pagination failed:', error)
    return NextResponse.json({ message: 'Articolele nu au putut fi încărcate.' }, { status: 500 })
  }
}
