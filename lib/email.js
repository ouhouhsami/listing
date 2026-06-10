import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM   = process.env.EMAIL_FROM || 'listing <onboarding@resend.dev>'

// Sans RESEND_API_KEY (dev local), le mail est affiché dans la console.
export async function sendEmail({ to, subject, html }) {
  if (!resend) {
    console.log(`\n── EMAIL (dev) ──\nTo: ${to}\nSubject: ${subject}\n${html}\n─────────────────\n`)
    return
  }
  const { error } = await resend.emails.send({ from: FROM, to, subject, html })
  if (error) throw new Error(error.message)
}
