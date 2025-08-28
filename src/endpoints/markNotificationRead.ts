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

const markNotificationRead: PayloadHandler = async (req) => {
  try {
    const { payload } = req
    const user = req.user as CustomUser | undefined

    if (!user) {
      return Response.json({ error: 'unauthorized' }, { status: 401 })
    }

    const id = (req as any)?.params?.id || (req as any)?.routeParams?.id || null
    if (!id) {
      return Response.json({ error: 'id required' }, { status: 400 })
    }

    let notif: any
    try {
      notif = await payload.findByID({
        collection: 'notifications',
        id,
        depth: 0,
      })
    } catch {
      return Response.json(
        { error: 'notification_not_found' },
        { status: 404 }
      )
    }

    const notifTenantId = idOf(notif.tenant)
    const userTenantId = idOf(user.tenant)
    const notifUserId = idOf(notif.user)
    const userId = idOf(user.id || (user as any)._id)

    if (!notifTenantId || !userTenantId || notifTenantId !== userTenantId) {
      return Response.json({ error: 'forbidden' }, { status: 403 })
    }

    const isOwner = notifUserId && notifUserId === userId
    const isAdminOrOrganizer =
      user.role === 'admin' || user.role === 'organizer'

    if (!isOwner && !isAdminOrOrganizer) {
      return Response.json({ error: 'forbidden' }, { status: 403 })
    }

    if (notif.read === true) {
      return Response.json(notif)
    }

    const updated = await payload.update({
      collection: 'notifications',
      id,
      data: { read: true } as any, // cast, hooks may handle tenant
      req,
    })

    return Response.json(updated)
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 })
  }
}

export default markNotificationRead
