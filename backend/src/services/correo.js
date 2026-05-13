const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: parseInt(process.env.EMAIL_PORT || '587') === 465,
  auth: {
    user: process.env.CORREO_USUARIO || process.env.EMAIL_USER,
    pass: process.env.CORREO_PASSWORD || process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
})

const enviarInvitacion = async ({ nombre, email, token }) => {
  const enlace = `${process.env.FRONTEND_URL}/invitacion/${token}`
  await transporter.sendMail({
    from: `"CRM Equipos" <${process.env.CORREO_USUARIO}>`,
    to: email,
    subject: 'Te han invitado al CRM',
    html: `
      <h2>Hola ${nombre},</h2>
      <p>Has sido invitado a unirte al CRM de tu equipo.</p>
      <p>Este enlace expira en 48 horas.</p>
      <a href="${enlace}"
         style="background:#4a90d9;color:white;padding:12px 24px;
                border-radius:6px;text-decoration:none;display:inline-block">
        Activar mi cuenta
      </a>
      <p>Si no esperabas esta invitación, ignora este correo.</p>
    `
  })
}

module.exports = { enviarInvitacion }
