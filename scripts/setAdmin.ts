/**
 * Set admin custom claims for a Firebase user.
 *
 * Usage:
 *   npx tsx scripts/setAdmin.ts <user-email>
 *
 * Prerequisites:
 *   1. npm install -D firebase-admin tsx
 *   2. Download service account key from Firebase Console:
 *      Project Settings > Service accounts > Generate new private key
 *   3. Set environment variable:
 *      export GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccountKey.json"
 */

import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

const email = process.argv[2]

if (!email) {
  console.error('Usage: npx tsx scripts/setAdmin.ts <user-email>')
  process.exit(1)
}

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Error: GOOGLE_APPLICATION_CREDENTIALS environment variable not set')
  console.error('Download service account key from Firebase Console and set the path')
  process.exit(1)
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS) as ServiceAccount

initializeApp({ credential: cert(serviceAccount) })

async function main() {
  const auth = getAuth()
  try {
    const user = await auth.getUserByEmail(email)
    await auth.setCustomUserClaims(user.uid, { admin: true })
    console.log(`Successfully set admin claims for ${email} (uid: ${user.uid})`)
    console.log('The user must sign out and sign back in for the change to take effect.')
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

main()
