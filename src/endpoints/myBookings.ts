import type { PayloadHandler } from 'payload'
import type { CustomUser } from '../types/custom'

const myBookings: PayloadHandler = async (req) => {
  try {
    const { payload } = req
    const user = req.user as CustomUser | undefined

    if (!user) {
      return Response.json({ error: 'unauthorized' }, { status: 401 })
    }

    const r = await payload.find({
      collection: 'bookings',
      where: {
        and: [
          { user: { equals: user.id } },
          { tenant: { equals: user.tenant } },
        ],
      },
      sort: '-createdAt',
      depth: 0,
      limit: 100,
    })

    return Response.json(r.docs)
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 })
  }
}

export default myBookings
