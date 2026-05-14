const nodemailer = require('nodemailer');

if (!process.env.BREVO_API_KEY) {
  console.error('❌ [SMTP] CRÍTICO: Falta BREVO_API_KEY en las variables de entorno.');
}

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false, 
  auth: {
    user: process.env.EMAIL_USER || 'jesuseduardoh414@gmail.com',
    pass: process.env.BREVO_API_KEY,
  }
});

const sendResetEmail = async (email, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  console.log(`[SMTP]: Enviando correo de restablecimiento a ${email}...`);

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Soporte CRM" <jesuseduardoh414@gmail.com>',
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
        <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('[SMTP] Error en Reset Email:', error.message);
    throw error;
  }
};

const sendVerificationEmail = async (email, token) => {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-account/${token}`;
  console.log(`[SMTP]: Enviando correo de verificación a ${email}...`);

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Bienvenida CRM" <jesuseduardoh414@gmail.com>',
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
        <p>Si no creaste esta cuenta, puedes ignorar este correo.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('[SMTP] Error en Verification Email:', error.message);
    throw error;
  }
};

module.exports = { sendResetEmail, sendVerificationEmail, transporter };
