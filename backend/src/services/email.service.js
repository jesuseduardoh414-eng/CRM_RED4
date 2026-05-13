const nodemailer = require('nodemailer');
const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');

const transporter = nodemailer.createTransport({
  pool: true,
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 20000,
  greetingTimeout: 20000,
});

const sendResetEmail = async (email, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

  return transporter.sendMail({
    from: `"CRM" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Restablecer contraseña - CRM',
    html: `
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
  });
};

const sendVerificationEmail = async (email, token) => {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-account/${token}`;

  return transporter.sendMail({
    from: `"CRM" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verifica tu cuenta - CRM',
    html: `
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
  });
};

module.exports = { sendResetEmail, sendVerificationEmail };
