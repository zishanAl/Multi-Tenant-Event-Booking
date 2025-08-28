import type { PayloadHandler } from 'payload'
import type { CustomUser } from '../types/custom'

const idOf = (v: unknown): string => {
  if (!v) return ''
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return v.length ? idOf(v[0]) : ''
  if (typeof v === 'object') {
    const obj = v as any
    return obj.id || obj._id || obj.value || ''
  }
  return String(v)
}

const bookEvent: PayloadHandler = async (req) => {
  try {
    const { payload } = req
    let user = req.user as CustomUser | null

    // authenticate manually if req.user not populated
    if (!user) {
      try {
        const auth = await payload.auth({ headers: req.headers })
        user = (auth?.user as CustomUser) || null
      } catch {
        /* ignore auth error */
      }
    }

    if (!user) {
      return Response.json({ error: 'unauthorized' }, { status: 401 })
    }

    const eventId =
      (req as any)?.params?.id || (req as any)?.routeParams?.id || null
    if (!eventId) {
      return Response.json({ error: 'eventId required' }, { status: 400 })
    }

    let event: any
    try {
      event = await payload.findByID({
        collection: 'events',
        id: eventId,
        depth: 0,
        req,
      })
    } catch {
      return Response.json({ error: 'event_not_found' }, { status: 404 })
    }

    const userTenantId = idOf(user.tenant)
    const eventTenantId = idOf(event.tenant)
    if (!userTenantId || userTenantId !== eventTenantId) {
      return Response.json({ error: 'forbidden' }, { status: 403 })
    }

    const userId = idOf(user.id || (user as any)._id)
    const c = await payload.count({
      collection: 'bookings',
      where: {
        and: [
          { tenant: { equals: userTenantId } },
          { user: { equals: userId } },
          { event: { equals: eventId } },
          { status: { not_equals: 'canceled' } },
        ],
      },
      req,
    })

    const already =
      typeof c === 'number' ? c : (c as any).totalDocs ?? (c as any).total ?? 0
    if (already > 0) {
      return Response.json({ error: 'booking_exists' }, { status: 409 })
    }

    const booking = await payload.create({
      collection: 'bookings',
      data: { event: eventId } as any,
      req,
    })

    return new Response(JSON.stringify(booking), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 })
  }
}

export default bookEvent
