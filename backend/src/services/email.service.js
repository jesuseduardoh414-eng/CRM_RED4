const https = require('https');

/**
 * Servicio de envío de correos vía API de Brevo (HTTP)
 * Este método es inmune a los bloqueos de puertos SMTP de Railway.
 */
const sendEmailViaAPI = (options) => {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      return reject(new Error('Falta BREVO_API_KEY en las variables de entorno.'));
    }

    const data = JSON.stringify({
      sender: { 
        name: "Centralita CRM", 
        email: process.env.EMAIL_USER || "jesuseduardoh414@gmail.com" 
      },
      to: [{ email: options.to }],
      subject: options.subject,
      htmlContent: options.html
    });

    const apiOptions = {
      hostname: 'api.brevo.com',
      port: 443,
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(apiOptions, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(responseData));
        } else {
          reject(new Error(`Brevo API Error (${res.statusCode}): ${responseData}`));
        }
      });
    });

    req.on('error', (error) => { reject(error); });
    req.write(data);
    req.end();
  });
};

const sendResetEmail = async (email, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  console.log(`[API]: Enviando correo de restablecimiento a ${email}...`);
  
  try {
    await sendEmailViaAPI({
      to: email,
      subject: 'Restablecer contraseña - CRM',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
          <h2>Restablecer tu contraseña</h2>
          <p>Has solicitado restablecer tu contraseña. Haz clic en el botón de abajo para continuar:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
              Restablecer contraseña
            </a>
          </div>
          <p>Este enlace expirará en 1 hora.</p>
        </div>
      `
    });
    return true;
  } catch (error) {
    console.error('[API] Error en Reset Email:', error.message);
    throw error;
  }
};

const sendVerificationEmail = async (email, token) => {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-account/${token}`;
  console.log(`[API]: Enviando correo de verificación a ${email}...`);

  try {
    await sendEmailViaAPI({
      to: email,
      subject: 'Verifica tu cuenta - CRM',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
          <h2>Bienvenido al CRM</h2>
          <p>Por favor, verifica tu cuenta haciendo clic en el botón de abajo:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" 
               style="background:#10b981;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
              Verificar cuenta
            </a>
          </div>
        </div>
      `
    });
    return true;
  } catch (error) {
    console.error('[API] Error en Verification Email:', error.message);
    throw error;
  }
};

// Objeto falso para mantener compatibilidad con el resto del código que usa 'transporter.sendMail'
const transporter = {
  sendMail: (options) => sendEmailViaAPI(options)
};

module.exports = { sendResetEmail, sendVerificationEmail, transporter };
