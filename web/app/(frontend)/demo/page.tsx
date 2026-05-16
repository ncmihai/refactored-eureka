import type { Metadata } from 'next'
import { DemoRequestForm } from '@/components/DemoRequestForm'
import { getSiteUrl } from '@/lib/blog'

export const metadata: Metadata = {
  title: 'Cere demo | Finance Platform',
  description:
    'Programează un demo pentru Finance Platform: simulări salvate, share links, PDF white-label și administrare pentru firme.',
  alternates: { canonical: `${getSiteUrl()}/demo` },
}

export default function DemoPage() {
  return (
    <main className="flex-1 max-w-6xl mx-auto px-6 py-10 md:py-16">
      <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-8 lg:gap-12 items-start">
        <section className="space-y-5">
          <span className="pill">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            Commercial beta
          </span>
          <h1 className="font-serif h-hero tracking-tight">
            Vezi platforma în flow real de consultanță.
          </h1>
          <p className="text-lg text-[var(--muted)] leading-relaxed">
            Demo-ul acoperă simulări salvate, pagini publice read-only, PDF-uri pentru Credit și
            Optimizare, plus administrare pentru firmă și consultanți.
          </p>
          <div className="grid sm:grid-cols-3 gap-px bg-[var(--border)] border border-[var(--border)] rounded-lg overflow-hidden">
            {['Simulare', 'Share link', 'PDF white-label'].map((item) => (
              <div key={item} className="bg-[var(--background)] p-4 text-sm font-medium">
                {item}
              </div>
            ))}
          </div>
        </section>
        <DemoRequestForm />
      </div>
    </main>
  )
}
