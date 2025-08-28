import type { CollectionConfig, PayloadRequest } from 'payload'
import { sameTenantWhere, setTenantField, getTenantId } from '../access/tenant'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import type { CustomUser } from '../types/custom'

export const Events: CollectionConfig = {
  slug: 'events',
  admin: { useAsTitle: 'title' },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'richText', editor: lexicalEditor({}) },
    { name: 'date', type: 'date', required: true },
    { name: 'capacity', type: 'number', required: true, min: 0 },
    {
      name: 'organizer',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
    },
  ],
  access: {
    read: ({ req }) => sameTenantWhere(req as PayloadRequest & { user?: CustomUser }),

    create: ({ req }) => {
      const user = req?.user as CustomUser | undefined
      if (!user || user.role === 'attendee') return false
      const tid = getTenantId(req as PayloadRequest & { user?: CustomUser })
      return tid ? { tenant: { equals: tid } } : false
    },

    update: ({ req }) =>
      (req?.user as CustomUser)?.role !== 'attendee'
        ? sameTenantWhere(req as PayloadRequest & { user?: CustomUser })
        : false,

    delete: ({ req }) =>
      (req?.user as CustomUser)?.role === 'admin'
        ? sameTenantWhere(req as PayloadRequest & { user?: CustomUser })
        : false,
  },

  hooks: {
    beforeChange: [({ data, req }) => setTenantField(data, req as PayloadRequest & { user?: CustomUser })],
  },
}

export default Events
