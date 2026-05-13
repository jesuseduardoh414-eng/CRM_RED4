/**
 * Servicio de envío de correos del sistema (Password Reset, Verificación)
 * Actualizado para usar la API de Brevo y evitar bloqueos de puertos.
 */

const sendResetEmail = async (email, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  console.log(`[Brevo-API]: Enviando correo de restablecimiento a ${email}...`);

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
          name: "Soporte CRM Red4Design",
          email: "jesuseduardoh414@gmail.com"
        },
        to: [{ email: email }],
        subject: 'Restablecer contraseña - CRM',
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
            <h2>Restablecer tu contraseña</h2>
            <p>Has solicitado restablecer tu contraseña. Haz clic en el botón de abajo para continuar:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">
                Restablecer contraseña
              </a>
            </div>
            <p>Este enlace expirará en 1 hora.</p>
            <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
          </div>
        `
      })
    });

    return response.ok;
  } catch (error) {
    console.error('[Brevo-API] Error en Reset Email:', error.message);
    throw error;
  }
};

const sendVerificationEmail = async (email, token) => {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-account/${token}`;
  console.log(`[Brevo-API]: Enviando correo de verificación a ${email}...`);

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
          name: "Bienvenida CRM Red4Design",
          email: "jesuseduardoh414@gmail.com"
        },
        to: [{ email: email }],
        subject: 'Verifica tu cuenta - CRM',
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
            <h2>Bienvenido al CRM</h2>
            <p>Por favor, verifica tu cuenta haciendo clic en el botón de abajo:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" 
                 style="background:#10b981;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">
                Verificar cuenta
              </a>
            </div>
            <p>Si no creaste esta cuenta, puedes ignorar este correo.</p>
          </div>
        `
      })
    });

    return response.ok;
  } catch (error) {
    console.error('[Brevo-API] Error en Verification Email:', error.message);
    throw error;
  }
};

module.exports = { sendResetEmail, sendVerificationEmail };
