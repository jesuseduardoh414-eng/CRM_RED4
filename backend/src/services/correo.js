const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // Use SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  },
  // Force IPv4 as Render seems to have issues with IPv6 for Gmail
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000
})

const enviarInvitacion = async ({ nombre, email, token }) => {
  const enlace = `${process.env.FRONTEND_URL}/invitacion/${token}`
  console.log(`[Email Service]: Intentando enviar invitación a ${email}...`);
  
  try {
    const info = await transporter.sendMail({
      from: `"CRM Equipos" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Te han invitado al CRM',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #333;">Hola ${nombre},</h2>
          <p>Has sido invitado a unirte al CRM de tu equipo.</p>
          <p>Este enlace expira en 48 horas.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${enlace}"
               style="background:#2563eb;color:white;padding:14px 28px;
                      border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;">
              Activar mi cuenta
            </a>
          </div>
          <p style="color: #666; font-size: 12px;">Si no esperabas esta invitación, ignora este correo.</p>
        </div>
      `
    })
    console.log('[Email Service]: Correo enviado con éxito:', info.messageId);
    return info;
  } catch (error) {
    console.error('[Email Service Error]:', error);
    throw error;
  }
}

module.exports = { enviarInvitacion }
