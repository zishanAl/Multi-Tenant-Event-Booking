import type { PayloadHandler } from 'payload'
import type { CustomUser } from '../types/custom'

// helper: normalize an ID from mixed values
const idOf = (v: any): string => {
  if (!v) return ''
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return v.length ? idOf(v[0]) : ''
  if (typeof v === 'object') return v.id || v._id || ''
  return String(v)
}

const cancelBooking: PayloadHandler = async (req) => {
  try {
    const { payload } = req
    let user = req.user as CustomUser | null

    // authenticate manually if req.user is not populated
    if (!user) {
      try {
        const auth = await payload.auth({ headers: req.headers })
        user = (auth?.user as CustomUser) || null
      } catch {
        /* ignore */
      }
    }

    if (!user) {
      return Response.json({ error: 'unauthorized' }, { status: 401 })
    }

    const bookingId =
      (req as any)?.params?.id || (req as any)?.routeParams?.id || null
    if (!bookingId) {
      return Response.json({ error: 'bookingId required' }, { status: 400 })
    }

    let booking: any
    try {
      booking = await payload.findByID({
        collection: 'bookings',
        id: bookingId,
        depth: 0,
        req,
      })
    } catch {
      return Response.json({ error: 'booking_not_found' }, { status: 404 })
    }

    const userTenantId = idOf(user.tenant)
    const bookingTenantId = idOf(booking.tenant)
    if (!userTenantId || bookingTenantId !== userTenantId) {
      return Response.json({ error: 'forbidden' }, { status: 403 })
    }

    const userId = idOf(user.id || (user as any)._id)
    const bookingUserId = idOf(booking.user)
    const isOwner = bookingUserId && bookingUserId === userId
    const isAdminOrOrganizer = user.role === 'admin' || user.role === 'organizer'

    if (!isOwner && !isAdminOrOrganizer) {
      return Response.json({ error: 'forbidden' }, { status: 403 })
    }

    if (booking.status === 'canceled') {
      return Response.json({ error: 'already_canceled' }, { status: 400 })
    }

    const updated = await payload.update({
      collection: 'bookings',
      id: bookingId,
      data: { status: 'canceled' } as any, // hooks enforce rest of fields
      req,
    })

    return Response.json({ canceled: updated })
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 })
  }
}

export default cancelBooking
