import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    description: 'Fișiere uploaded — logo-uri firme, imagini conținut, etc.',
    group: 'Conținut',
  },
  access: { read: () => true },
  fields: [
    { name: 'alt', type: 'text', admin: { description: 'Text alternativ (accesibilitate + SEO)' } },
  ],
  upload: true,
}
