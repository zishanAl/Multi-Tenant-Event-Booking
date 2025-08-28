import type { User as BaseUser } from '../payload-types'

export interface CustomUser extends BaseUser {
  role?: 'admin' | 'organizer' | 'attendee'
  tenant?: string | { id?: string; _id?: string; value?: string }
}
