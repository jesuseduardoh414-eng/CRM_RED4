const dns = require('dns');

// Forzar IPv4 para mayor compatibilidad
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

/**
 * Envía un correo de invitación usando la API de Brevo para evitar bloqueos de puertos SMTP.
 */
const enviarInvitacion = async ({ nombre, email, token }) => {
  const enlace = `${process.env.FRONTEND_URL}/invitacion/${token}`;
  console.log(`[Brevo-API]: Intentando enviar invitación a ${email}...`);

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: "Centralita Red4Design",
          email: "jesuseduardoh414@gmail.com"
        },
        to: [{ email: email, name: nombre }],
        subject: 'Te han invitado al CRM',
        htmlContent: `
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
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al enviar con Brevo');
    }

    console.log(`[Brevo-API]: Invitación enviada exitosamente. ID: ${data.messageId}`);
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error('[Brevo-API] Error:', error.message);
    throw error;
  }
};

module.exports = { enviarInvitacion };
