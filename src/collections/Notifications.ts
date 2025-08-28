import type { CollectionConfig, PayloadRequest } from 'payload'
import { sameTenantWhere, setTenantField } from '../access/tenant'
import type { CustomUser } from '../types/custom'

export const Notifications: CollectionConfig = {
  slug: 'notifications',
  timestamps: true,
  admin: { useAsTitle: 'type' },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'booking',
      type: 'relationship',
      relationTo: 'bookings',
      required: true,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Booking Confirmed', value: 'booking_confirmed' },
        { label: 'Waitlisted', value: 'waitlisted' },
        { label: 'Waitlist Promoted', value: 'waitlist_promoted' },
        { label: 'Booking Canceled', value: 'booking_canceled' },
      ],
    },
    { name: 'title', type: 'text', required: true },
    { name: 'message', type: 'textarea' },
    {
      name: 'read',
      type: 'checkbox',
      defaultValue: false,
    },
    { name: 'event', type: 'relationship', relationTo: 'events' },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
    },
  ],
  access: {
    read: ({ req }) => {
      const user = req?.user as CustomUser | undefined
      if (!user) return false

      const tenantWhere = sameTenantWhere(req as PayloadRequest & { user?: CustomUser }) || {}
      if (user.role === 'attendee') {
        return {
          and: [tenantWhere, { user: { equals: user.id } }],
        }
      }
      return tenantWhere
    },

    create: () => false,

    update: ({ req }) => {
      const user = req?.user as CustomUser | undefined
      if (!user) return false
      if (user.role === 'admin') return sameTenantWhere(req as PayloadRequest & { user?: CustomUser }) || {}
      return {
        and: [sameTenantWhere(req as PayloadRequest & { user?: CustomUser }) || {}, { user: { equals: user.id } }],
      }
    },

    delete: ({ req }) =>
      (req?.user as CustomUser)?.role === 'admin'
        ? sameTenantWhere(req as PayloadRequest & { user?: CustomUser })
        : false,
  },

  hooks: {
    beforeChange: [({ data, req }) => setTenantField(data, req as PayloadRequest & { user?: CustomUser })],
  },
}

export default Notifications
