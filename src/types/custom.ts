import type { User as BaseUser, Tenant } from '../payload-types'

export interface CustomUser extends BaseUser {
  role: 'admin' | 'organizer' | 'attendee'   
  tenant: string | Tenant                    
}
