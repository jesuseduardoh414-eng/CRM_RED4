const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
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

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Restablecer contraseña - CRM Interno',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
        <h2 style="color: #6366f1; text-align: center;">CRM Interno</h2>
        <p>Hola,</p>
        <p>Has solicitado restablecer tu contraseña. Haz clic en el botón de abajo para continuar:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Restablecer Contraseña
          </a>
        </div>
        <p>Este enlace expirará en 1 hora.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #888; text-align: center;">CRM Interno</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Email Success] Correo de recuperación enviado a ${email}`);
  } catch (error) {
    console.error('[Email Error Details]:', {
      code: error.code,
      command: error.command,
      response: error.response,
      stack: error.stack
    });
    throw new Error(`Error al enviar el correo: ${error.message}`);
  }
};

const sendVerificationEmail = async (email, token) => {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify/${token}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Verifica tu cuenta - CRM Interno',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
        <h2 style="color: #6366f1; text-align: center;">Bienvenido al CRM Interno</h2>
        <p>Hola,</p>
        <p>Gracias por registrarte. Para activar tu cuenta, por favor haz clic en el botón de abajo:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Verificar Cuenta
          </a>
        </div>
        <p>Si no creaste esta cuenta, puedes ignorar este correo.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #888; text-align: center;">CRM Interno</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Email] Correo de verificación enviado a ${email}`);
  } catch (error) {
    console.error('[Email Error]', error);
    throw new Error('Error al enviar el correo de verificación');
  }
};

module.exports = { sendResetEmail, sendVerificationEmail };
