import type { PayloadRequest } from 'payload'
import type { CustomUser } from '../types/custom'

type CustomReq = PayloadRequest & { user?: CustomUser }

export const isAdmin = (req: CustomReq): boolean =>
  req?.user?.role === 'admin'

export const isOrganizer = (req: CustomReq): boolean =>
  req?.user?.role === 'organizer'

export const isAttendee = (req: CustomReq): boolean =>
  req?.user?.role === 'attendee'
