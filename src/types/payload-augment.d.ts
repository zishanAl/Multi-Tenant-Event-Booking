// src/types/payload-augment.d.ts
import 'payload'

declare module 'payload' {
  export type CollectionSlug = 'users' | 'tenants' | 'events'| 'bookings'| 'notifications'| 'booking-logs'
}
