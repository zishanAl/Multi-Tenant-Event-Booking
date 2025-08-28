import type { CollectionConfig, PayloadRequest } from 'payload'
import type { CustomUser } from '../types/custom'

const getTenantId = (req: PayloadRequest & { user?: CustomUser }) => {
  const t = req?.user?.tenant
  if (!t) return undefined
  if (typeof t === 'string') return t
  if (typeof t === 'object') return t.id || t._id || t.value || undefined
  return undefined
}

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  fields: [{ name: 'name', type: 'text', required: true }],
  access: {
    read: ({ req }) => {
        const tenantId = getTenantId(req as PayloadRequest & { user?: CustomUser })
        return tenantId ? { id: { equals: tenantId } } : false
    },


    create: ({ req }) =>
      !req?.user ? true : (req.user as CustomUser).role === 'admin',

    update: ({ req }) => {
      if ((req?.user as CustomUser)?.role !== 'admin') return false
      const tenantId = getTenantId(req as PayloadRequest & { user?: CustomUser })
      return tenantId ? { id: { equals: tenantId } } : false
    },

    delete: ({ req }) => {
      if ((req?.user as CustomUser)?.role !== 'admin') return false
      const tenantId = getTenantId(req as PayloadRequest & { user?: CustomUser })
      return tenantId ? { id: { equals: tenantId } } : false
    },
  },
}

export default Tenants
