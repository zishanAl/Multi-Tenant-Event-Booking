# Payload Booking System

A multi-tenant event booking system built with Payload CMS. This system supports event capacity enforcement, waitlisting, automated promotion, in-app notifications, activity logging, and a complete organizer dashboard.


### Setup Instructions

**Prerequisites**

- Node.js (v18 or higher)
- MongoDB (local or cloud)
- Yarn (preferred) or npm


### Step-by-Step Installation

1. Clone the Repository
```bash
git clone https://github.com/zishanAl/Multi-Tenant
cd multi-tenant-event-booking

```

### Install Dependencies
```bash
yarn install
# or
npm install
```

### Configure Environment Variables

- Create a .env file based on .env.example and set the following:
```bash
PAYLOAD_SECRET=your_secret_key
MONGODB_URI=mongodb://localhost:27017/payload-booking
```

### Run the Development Server
```bash
yarn dev
# or
npm run dev
```

### Access Admin Dashboard
Open http://localhost:3000/admin


## Architecture Overview

**Folder Structure**
```bash
src/
│
├── access/              # Multi-tenant logic and roles
├── app/                 # Next.js routing
│
├── collections/         # Payload collections
│   ├── Bookings.ts
│   ├── Events.ts
│   ├── Notifications.ts
│   ├── BookingLogs.ts
|   ├── Tenants.ts
│   └── Users.ts
│
├── endpoints/       # Custom endpoints      
│   ├── bookEvent.ts
│   ├── cancelBooking.ts
│   ├── dashboard.ts
│   ├── markNotificationread.ts
|   ├── myBookings.ts
│   └── myNotifications.ts        
│
└── payload.config.js    # configuration of application

```
### Plugin/Hook Logic

- beforeChange on Bookings handles tenant enforcement and capacity checks.
- afterChange on Bookings triggers side effects like notification creation, waitlist promotion, and activity logging.

### Sample Workflows

**1. Booking with Capacity Enforcement**
- A user books an event.
- If capacity is available → status: confirmed
- If full → status: waiting


**2. Automatic Promotion**
- If a confirmed booking is cancelled, the oldest waitlisted user is promoted to confirmed.

**3. Notifications & Logs**
- Each booking action generates a Notification and a BookingLog entry (e.g., booking_confirmed, waiting, canceled, promote_from_waitlist).

**4. Organizer Dashboard**
- Shows:
- Upcoming events
- Status-wise event summaries
- Booking percentage filled
- Recent activity logs


### Demo Credentials
```bash
Role	Email	Password

Admin	    admin@example.com	    admin123
organiser	organiser@example.com	review123
user        user@example.com        user123
```
> You can update/add users via Payload Admin UI under the Users collection.


### Deployment Guide

Deploying on Vercel
1. Push your code to GitHub.
2. Go to https://vercel.com and import the repository.
3. Set Environment Variables in the Vercel Dashboard:
```bash
PAYLOAD_SECRET=your_secret
MONGODB_URI=your_mongodb_connection_string
```
4. Choose yarn build or npm run build as the build command and .output as the output directory if using a custom Next.js config.

5. Deploy!