import type { CollectionConfig, PayloadRequest } from 'payload'
import type { CustomUser } from '../types/custom'
import { sameTenantWhere } from '../access/tenant'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: { useAsTitle: 'name' },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true, unique: true },
    {
      name: 'role',
      type: 'select',
      options: ['attendee', 'organizer', 'admin'],
      required: true,
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants', // works after augment.d.ts
      required: true,
    },
  ],
  access: {
    read: ({ req }) => {
      const user = req?.user as CustomUser | undefined
      if (!user) return false

      if (user.role === 'attendee') {
        return {
          and: [
            { tenant: { equals: user.tenant } },
            { id: { equals: user.id } },
          ],
        }
      }

      return sameTenantWhere(req as PayloadRequest & { user?: CustomUser })
    },

    create: ({ req }) => {
      const user = req?.user as CustomUser | undefined
      return user?.role === 'admin'
        ? { tenant: { equals: user.tenant } }
        : false
    },

    update: ({ req }) => {
      const user = req?.user as CustomUser | undefined
      if (!user) return false

      if (user.role === 'attendee' || user.role === 'organizer') {
        return {
          and: [
            { tenant: { equals: user.tenant } },
            { id: { equals: user.id } },
          ],
        }
      }

      if (user.role === 'admin') {
        return sameTenantWhere(req as PayloadRequest & { user?: CustomUser })
      }

      return false
    },

    delete: ({ req }) => {
      const user = req?.user as CustomUser | undefined
      return user?.role === 'admin'
        ? sameTenantWhere(req as PayloadRequest & { user?: CustomUser })
        : false
    },
  },
  hooks: {
    beforeChange: [
      ({ data, req }) => {
        const user = req?.user as CustomUser | undefined
        return {
          ...data,
          tenant: user?.tenant || data?.tenant,
        }
      },
    ],
  },
}
