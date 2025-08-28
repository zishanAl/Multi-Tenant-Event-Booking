// storage-adapter-import-placeholder
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Tenants } from './collections/Tenants'
import { Events } from './collections/Events'
import { Bookings } from './collections/Bookings'
import { Notifications } from './collections/Notifications'
import { BookingLogs } from './collections/BookingLogs'

import bookEvent from './endpoints/bookEvent'
import cancelBooking from './endpoints/cancelBooking'
import myBookings from './endpoints/myBookings'
import myNotifications from './endpoints/myNotifications'
import markNotificationRead from './endpoints/markNotificationRead'
import dashboard from './endpoints/dashboard'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users,Tenants,Events,Bookings,Notifications,BookingLogs],
  endpoints: [
    { path: '/book-event/:id', method: 'post', handler: bookEvent },
    { path: '/cancel-booking/:id', method: 'post', handler: cancelBooking },
    { path: '/my-bookings', method: 'get', handler: myBookings }, 
    { path: '/my-notifications', method: 'get', handler: myNotifications }, 
    { path: '/readNotifications/:id', method: 'post', handler: markNotificationRead },
    { path: '/dashboard', method: 'get', handler: dashboard },
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
  }),
  sharp,
  plugins: [
    payloadCloudPlugin(),
    // storage-adapter-placeholder
  ],
})
