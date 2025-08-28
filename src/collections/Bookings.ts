import type { CollectionConfig, PayloadRequest } from 'payload'
import { sameTenantWhere, getTenantId } from '../access/tenant'
import type { CustomUser } from '../types/custom'
import type { CollectionBeforeChangeHook, CollectionAfterChangeHook } from 'payload'

// helper
const normalizeId = (val: any): string | undefined => {
  if (!val) return undefined
  if (typeof val === 'string') return val
  if (typeof val === 'object') return val.id || val._id || val.value
  return undefined
}

// notification + log creators
const createNotification = async (
  req: PayloadRequest,
  { user, event, tenant, type, booking, title, message }: Record<string, any>
) => {
  return req.payload.create({
    collection: 'notifications',
    data: { user, event, tenant, type, booking, title, message, read: false },
    overrideAccess: true,
  })
}

const createLog = async (
  req: PayloadRequest,
  { user, event, tenant, action, note, booking }: Record<string, any>
) => {
  return req.payload.create({
    collection: 'booking-logs',
    data: { user, event, tenant, action, note, booking },
    overrideAccess: true,
  })
}

// hooks
const beforeChangeCreateOrUpdate: CollectionBeforeChangeHook =
  async ({ operation, data, req, originalDoc }) => {
    const user = req?.user as CustomUser | undefined

    if (operation === 'create' && !user?.id) {
      throw new Error('Unauthorized: please login before booking')
    }

    const prev = originalDoc || {}

    const bodyTenant = normalizeId(data?.tenant)
    const userTenant = getTenantId(req as PayloadRequest & { user?: CustomUser })
    const prevTenant = normalizeId(prev?.tenant)
    const tenantId = bodyTenant || userTenant || prevTenant
    if (!tenantId) throw new Error('Bad Request: tenant missing')
    data.tenant = tenantId

    const bodyUser = normalizeId(data?.user)
    const reqUser = normalizeId(user?.id)
    const prevUser = normalizeId(prev?.user)
    data.user = bodyUser || reqUser || prevUser

    if (operation === 'create' && user?.role === 'attendee') {
      if (String(user.id) !== String(data.user)) {
        throw new Error('Attendees can only book for themselves')
      }
    }

    const bodyEvent = normalizeId(data?.event)
    const prevEvent = normalizeId(prev?.event)
    const eventId = bodyEvent || prevEvent
    if (!eventId) throw new Error('Bad Request: event is required')

    if (operation === 'create') {
      const ev = await req.payload.findByID({
        collection: 'events',
        id: eventId,
        depth: 0,
      })

      const evTenant = normalizeId(ev?.tenant)
      if (!evTenant || evTenant !== tenantId) {
        throw new Error('Forbidden: event does not belong to your tenant')
      }

      const capacity = Number(ev?.capacity || 0)

      const { totalDocs: confirmedCount } = await req.payload.find({
        collection: 'bookings',
        where: {
          and: [
            { tenant: { equals: tenantId } },
            { event: { equals: eventId } },
            { status: { equals: 'confirmed' } },
          ],
        },
        limit: 0,
        depth: 0,
      })

      data.status = confirmedCount < capacity ? 'confirmed' : 'waitlisted'
      ;(data as any).__initialDecision = data.status
    }
    return data
  }

const afterChangeFlow: CollectionAfterChangeHook =
  async ({ operation, doc, previousDoc, req }) => {
    const tenant = normalizeId(doc?.tenant)
    const event = normalizeId(doc?.event)
    const user = normalizeId(doc?.user)

    const notifyForStatus = async (
      status: string,
      bookingId: string,
      customMsg?: string
    ) => {
      const typeMap: Record<string, string> = {
        confirmed: 'booking_confirmed',
        waitlisted: 'waitlisted',
        canceled: 'booking_canceled',
      }
      const type = typeMap[status]
      if (!type) return

      const titles: Record<string, string> = {
        booking_confirmed: 'Booking confirmed',
        waitlisted: 'Added to waitlist',
        booking_canceled: 'Booking canceled',
      }

      await createNotification(req, {
        user,
        event,
        tenant,
        type,
        booking: bookingId,
        title: titles[type],
        message: customMsg || '',
      })
    }

    if (operation === 'create') {
      if (doc.status === 'confirmed') {
        await notifyForStatus('confirmed', doc.id, 'Your seat is confirmed.')
        await createLog(req, {
          user,
          event,
          tenant,
          action: 'auto_confirm',
          note: 'Auto-confirmed based on capacity',
          booking: doc.id,
        })
      } else if (doc.status === 'waitlisted') {
        await notifyForStatus('waitlisted', doc.id, 'You have been added to the waitlist.')
        await createLog(req, {
          user,
          event,
          tenant,
          action: 'auto_waitlist',
          note: 'Event full, auto-waitlisted',
          booking: doc.id,
        })
      }
      return
    }

    if (operation === 'update' && previousDoc?.status !== doc?.status) {
      await notifyForStatus(doc.status, doc.id)
      if (previousDoc.status === 'confirmed' && doc.status === 'canceled') {
        await createLog(req, {
          user,
          event,
          tenant,
          action: 'cancel_confirmed',
          note: 'Confirmed booking canceled',
          booking: doc.id,
        })

        const waiting = await req.payload.find({
          collection: 'bookings',
          where: {
            and: [
              { tenant: { equals: tenant } },
              { event: { equals: event } },
              { status: { equals: 'waitlisted' } },
            ],
          },
          sort: 'createdAt',
          limit: 1,
          depth: 0,
        })

        const candidate = waiting?.docs?.[0]
        if (candidate) {
          const promoted = await req.payload.update({
            collection: 'bookings',
            id: candidate.id,
            data: { status: 'confirmed' },
            overrideAccess: true,
          })

          const promotedUser = normalizeId(promoted.user)

          await createNotification(req, {
            user: promotedUser,
            event,
            tenant,
            type: 'waitlist_promoted',
            booking: promoted.id,
            title: 'Promoted from waitlist',
            message: 'A seat opened up—your booking is now confirmed.',
          })
          await createLog(req, {
            user: promotedUser,
            event,
            tenant,
            action: 'promote_from_waitlist',
            note: 'Oldest waitlisted booking promoted to confirmed',
            booking: promoted.id,
          })
        }
      }
    }
  }

export const Bookings: CollectionConfig = {
  slug: 'bookings',
  timestamps: true,
  admin: { useAsTitle: 'id' },
  fields: [
    { name: 'tenant', type: 'relationship', relationTo: 'tenants', required: true },
    { name: 'event', type: 'relationship', relationTo: 'events', required: true },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Waitlisted', value: 'waitlisted' },
        { label: 'Canceled', value: 'canceled' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
  access: {
    read: ({ req }) => {
      const user = req?.user as CustomUser | undefined
      if (!user) return false
      const tenantWhere = sameTenantWhere(req as PayloadRequest & { user?: CustomUser }) || {}
      if (user.role === 'attendee') {
        return { and: [tenantWhere, { user: { equals: user.id } }] }
      }
      return tenantWhere
    },
    create: ({ req }) => !!req?.user,
    update: ({ req }) => {
      const user = req?.user as CustomUser | undefined
      if (!user) return false
      const tenantWhere = sameTenantWhere(req as PayloadRequest & { user?: CustomUser }) || {}
      if (user.role === 'attendee') {
        return { and: [tenantWhere, { user: { equals: user.id } }] }
      }
      return tenantWhere
    },
    delete: ({ req }) =>
      (req?.user as CustomUser)?.role === 'admin' ? sameTenantWhere(req as PayloadRequest & { user?: CustomUser }) : false,
  },
  hooks: {
    beforeChange: [beforeChangeCreateOrUpdate],
    afterChange: [afterChangeFlow],
  },
}

export default Bookings
