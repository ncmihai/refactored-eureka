import type { CollectionConfig } from 'payload'

export const ProduseUL: CollectionConfig = {
  slug: 'produse-ul',
  access: {
    read: ({ req }) => {
      if (req.user) return true
      return {
        activ: { equals: true },
      }
    },
  },
  admin: {
    useAsTitle: 'nume',
    defaultColumns: ['nume', 'provider', 'moneda', 'adminFeeAnnual', 'activ'],
    description: 'Produse Unit-Linked parametrizate pentru simulator și comparator.',
    group: 'Date Piață',
  },
  fields: [
    { name: 'nume', type: 'text', required: true },
    { name: 'provider', type: 'text', required: true },
    {
      name: 'moneda',
      type: 'select',
      required: true,
      defaultValue: 'RON',
      options: [
        { label: 'EUR', value: 'EUR' },
        { label: 'RON', value: 'RON' },
        { label: 'USD', value: 'USD' },
      ],
    },
    { name: 'fixedInsuranceFee', type: 'number', required: true, defaultValue: 13.5 },
    { name: 'allocationFeeLow', type: 'number', required: true, defaultValue: 5 },
    { name: 'allocationFeeHigh', type: 'number', required: true, defaultValue: 2.5 },
    { name: 'allocationThreshold', type: 'number', required: true, defaultValue: 6000 },
    { name: 'initialUnitsMonths', type: 'number', required: true, defaultValue: 24 },
    { name: 'expenseRecoveryAnnual', type: 'number', required: true, defaultValue: 3 },
    { name: 'adminFeeAnnual', type: 'number', required: true, defaultValue: 1.29 },
    {
      name: 'sourceUrl',
      type: 'text',
      admin: { description: 'URL condiții contractuale/factsheet pentru audit.' },
    },
    {
      name: 'note',
      type: 'textarea',
      admin: { description: 'Observații interne, inclusiv limitări de licențiere.' },
    },
    { name: 'activ', type: 'checkbox', defaultValue: true },
    { name: 'effectiveFrom', type: 'date', required: true },
    { name: 'effectiveTo', type: 'date' },
  ],
  versions: { drafts: false, maxPerDoc: 20 },
}
