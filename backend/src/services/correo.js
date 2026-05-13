const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  service: 'gmail',
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
