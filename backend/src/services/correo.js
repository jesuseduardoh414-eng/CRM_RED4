const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY || 're_LHXu9aNg_EDjXmS5TFjGCbBiFhBJkWdAR');

const enviarInvitacion = async ({ nombre, email, token }) => {
  const enlace = `${process.env.FRONTEND_URL}/invitacion/${token}`;
  console.log(`[Resend Service]: Intentando enviar invitación a ${email}...`);

  try {
    const { data, error } = await resend.emails.send({
      from: 'CRM <onboarding@resend.dev>', // Usar este remitente por defecto de Resend para pruebas
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
    });

    if (error) {
      console.error('[Resend Error]:', error);
      throw error;
    }

    console.log('[Resend Success]: Correo enviado con ID:', data.id);
    return data;
  } catch (error) {
    console.error('[Resend Exception]:', error);
    throw error;
  }
};

module.exports = { enviarInvitacion };
