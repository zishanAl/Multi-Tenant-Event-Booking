import type { PayloadHandler, PayloadRequest } from 'payload'
import { getTenantId } from '../access/tenant'
import type { CustomUser } from '../types/custom'

const dashboard: PayloadHandler = async (req) => {
  try {
    const { payload } = req
    const user = req.user as CustomUser | undefined

    if (!user || user.role !== 'organizer') {
      return Response.json({ error: 'forbidden' }, { status: 403 })
    }

    const tenantId = getTenantId(req as PayloadRequest & { user?: CustomUser })
    if (!tenantId) {
      return Response.json({ error: 'missing tenant' }, { status: 400 })
    }

    const nowISO = new Date().toISOString()

    const events = await payload.find({
      collection: 'events',
      where: {
        and: [
          { tenant: { equals: tenantId } },
          { date: { greater_than: nowISO } },
        ],
      },
      sort: 'date',
      limit: 100,
      depth: 0,
    })

    const countFor = async (eventId: string, status: string) => {
      const r = await payload.count({
        collection: 'bookings',
        where: {
          and: [
            { tenant: { equals: tenantId } },
            { event: { equals: eventId } },
            { status: { equals: status } },
          ],
        },
      })
      return typeof r === 'number' ? r : (r as any).totalDocs ?? (r as any).total ?? 0
    }

    const upcomingEvents: any[] = []
    let totalConfirmed = 0,
      totalWaitlisted = 0,
      totalCanceled = 0

    for (const ev of events.docs as any[]) {
      const [confirmedCount, waitlistedCount, canceledCount] = await Promise.all([
        countFor(ev.id, 'confirmed'),
        countFor(ev.id, 'waitlisted'),
        countFor(ev.id, 'canceled'),
      ])

      totalConfirmed += confirmedCount
      totalWaitlisted += waitlistedCount
      totalCanceled += canceledCount

      const capacity = Number(ev.capacity || 0)
      const percentageFilled =
        capacity > 0
          ? Math.min(100, Math.round((confirmedCount / capacity) * 100))
          : 0

      upcomingEvents.push({
        id: ev.id,
        title: ev.title,
        date: ev.date,
        capacity,
        confirmedCount,
        waitlistedCount,
        canceledCount,
        percentageFilled,
      })
    }

    const te = await payload.count({
      collection: 'events',
      where: { tenant: { equals: tenantId } },
    })
    const totalEvents = typeof te === 'number' ? te : (te as any).totalDocs ?? (te as any).total ?? 0

    const logs = await payload.find({
      collection: 'booking-logs',
      where: { tenant: { equals: tenantId } },
      sort: '-createdAt',
      limit: 5,
      depth: 0,
    })

    return Response.json({
      upcomingEvents,
      summary: { totalEvents, totalConfirmed, totalWaitlisted, totalCanceled },
      recentActivity: (logs.docs as any[]).map((d) => ({
        id: d.id,
        action: d.action,
        note: d.note,
        createdAt: d.createdAt,
      })),
    })
  } catch (err: any) {
    req.payload?.logger?.error?.(err)
    return Response.json(
      { error: 'internal_error', detail: String(err?.message || err) },
      { status: 500 }
    )
  }
}

export default dashboard
