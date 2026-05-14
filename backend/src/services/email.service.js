const nodemailer = require('nodemailer');

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error('❌ [SMTP] CRÍTICO: Faltan EMAIL_USER o EMAIL_PASS en las variables de entorno.');
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false, // true para 465, false para otros
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
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
