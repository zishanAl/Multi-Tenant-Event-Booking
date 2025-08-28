import type { CollectionConfig, PayloadRequest } from 'payload'
import { sameTenantWhere, setTenantField } from '../access/tenant'
import type { CustomUser } from '../types/custom'

export const BookingLogs: CollectionConfig = {
  slug: 'booking-logs',
  timestamps: true,
  admin: { useAsTitle: 'action' },
  fields: [
    { name: 'booking', type: 'relationship', relationTo: 'bookings', required: true },
    { name: 'event', type: 'relationship', relationTo: 'events', required: true },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true },
    {
      name: 'action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Request', value: 'create_request' },
        { label: 'Auto Waitlist', value: 'auto_waitlist' },
        { label: 'Auto Confirm', value: 'auto_confirm' },
        { label: 'Promote From Waitlist', value: 'promote_from_waitlist' },
        { label: 'Cancel Confirmed', value: 'cancel_confirmed' },
      ],
    },
    { name: 'note', type: 'text' },
    { name: 'tenant', type: 'relationship', relationTo: 'tenants', required: true },
  ],
  access: {
    read: ({ req }) => {
      const user = req?.user as CustomUser | undefined
      if (!user) return false
      if (user.role === 'attendee') return false
      return sameTenantWhere(req as PayloadRequest & { user?: CustomUser })
    },
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  hooks: {
    beforeChange: [({ data, req }) => setTenantField(data, req as PayloadRequest & { user?: CustomUser })],
  },
}

export default BookingLogs
