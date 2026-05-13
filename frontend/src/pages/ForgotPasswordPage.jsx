import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/api';
import { useToast } from '../context/ToastContext';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const data = await authService.forgotPassword(email);
      showToast(data.mensaje, 'success');
      setEnviado(true);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4 lg:p-8">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        
        {/* Logo / Icon */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20 mb-6 text-2xl">
            🔑
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">¿Olvidaste tu clave?</h1>
          <p className="text-slate-400 font-medium mt-1 text-sm lg:text-base">
            No te preocupes, te enviaremos un enlace para restablecerla.
          </p>
        </div>

        <div className="bg-white p-8 lg:p-10 rounded-[32px] shadow-2xl shadow-slate-200 border border-slate-50">
          {enviado ? (
            <div className="text-center space-y-6">
              <div className="p-6 bg-green-50 border border-green-100 rounded-2xl text-green-600 text-sm font-bold">
                Petición procesada. Revisa tu bandeja de entrada si el correo está registrado.
              </div>
              <Link to="/login" className="inline-block text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors">
                ← Volver al login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo electrónico</label>
                <input 
                  type="email" 
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                  placeholder="ejemplo@test.com" 
                  required
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                disabled={enviando} 
                className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {enviando ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </button>

              <div className="text-center">
                <Link to="/login" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">
                  Volver al login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
