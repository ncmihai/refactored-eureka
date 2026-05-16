'use client'

import { useState } from 'react'

type FormState = {
  name: string
  email: string
  company: string
  phone: string
  message: string
}

const initialForm: FormState = {
  name: '',
  email: '',
  company: '',
  phone: '',
  message: '',
}

export function DemoRequestForm({ sourcePath = '/demo' }: { sourcePath?: string }) {
  const [form, setForm] = useState<FormState>(initialForm)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const update = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
    setStatus(null)
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch('/api/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, sourcePath }),
      })
      const data = (await res.json()) as { message?: string }
      if (!res.ok) throw new Error(data.message || 'Cererea nu a putut fi trimisă.')
      setForm(initialForm)
      setStatus({
        type: 'success',
        message: 'Cererea a fost trimisă. Te contactăm pentru următorul pas.',
      })
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'A apărut o eroare. Încearcă din nou.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="card p-6 md:p-7 space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Nume</span>
          <input className="input" value={form.name} onChange={(e) => update('name', e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Email</span>
          <input className="input" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Firmă</span>
          <input className="input" value={form.company} onChange={(e) => update('company', e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Telefon</span>
          <input className="input" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Ce vrei să testezi?</span>
        <textarea
          className="input min-h-32"
          value={form.message}
          onChange={(e) => update('message', e.target.value)}
          placeholder="Ex: vreau să testez PDF-uri white-label pentru 3 consultanți."
        />
      </label>
      {status ? (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            status.type === 'success'
              ? 'border-[var(--accent)]/25 bg-[var(--accent-soft)] text-[var(--foreground)]'
              : 'border-[var(--danger)]/25 text-[var(--danger)]'
          }`}
        >
          {status.message}
        </div>
      ) : null}
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? 'Se trimite...' : 'Cere demo'}
      </button>
    </form>
  )
}
