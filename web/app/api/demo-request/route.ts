import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

type DemoRequestBody = {
  name?: string
  email?: string
  company?: string
  phone?: string
  message?: string
  sourcePath?: string
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DemoRequestBody
    const name = body.name?.trim()
    const email = body.email?.trim().toLowerCase()

    if (!name || !email) {
      return NextResponse.json({ message: 'Completează numele și emailul.' }, { status: 400 })
    }

    if (!emailPattern.test(email)) {
      return NextResponse.json({ message: 'Emailul nu pare valid.' }, { status: 400 })
    }

    const payload = await getPayload({ config })
    await payload.create({
      collection: 'demo-requests',
      overrideAccess: true,
      data: {
        name,
        email,
        company: body.company?.trim() || undefined,
        phone: body.phone?.trim() || undefined,
        message: body.message?.trim() || undefined,
        sourcePath: body.sourcePath?.trim() || '/demo',
        status: 'new',
      },
    })

    return NextResponse.json({ ok: true, message: 'Cererea a fost trimisă.' })
  } catch (error) {
    console.error('Demo request failed:', error)
    return NextResponse.json({ message: 'Cererea nu a putut fi trimisă.' }, { status: 500 })
  }
}
