const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY || 're_LHXu9aNg_EDjXmS5TFjGCbBiFhBJkWdAR');

const sendResetEmail = async (email, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

  try {
    const { data, error } = await resend.emails.send({
      from: 'CRM <onboarding@resend.dev>',
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

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[Resend Reset Password Error]:', error);
    throw error;
  }
};

const sendVerificationEmail = async (email, token) => {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-account/${token}`;

  try {
    const { data, error } = await resend.emails.send({
      from: 'CRM <onboarding@resend.dev>',
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

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[Resend Verification Error]:', error);
    throw error;
  }
};

module.exports = { sendResetEmail, sendVerificationEmail };
