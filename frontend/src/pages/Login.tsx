import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { ShieldAlert } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: any, token: string) => void;
}

declare global {
  interface Window {
    google?: any;
  }
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  useEffect(() => {
    if (GOOGLE_CLIENT_ID && window.google) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleLogin,
          auto_select: false
        });

        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          {
            theme: 'filled_blue',
            size: 'large',
            width: 320,
            text: 'continue_with',
            shape: 'pill'
          }
        );
      } catch (err) {
        console.error('Google Sign-In Init Error:', err);
      }
    }
  }, [GOOGLE_CLIENT_ID]);

  const handleGoogleLogin = async (response: any) => {
    setLoading(true);
    setError('');

    try {
      const data = await api.post<{ token: string; user: any }>('/auth/google', {
        idToken: response.credential
      });

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      console.error('Login Callback Error:', err);
      setError(err.message || 'Access denied. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative p-4 transition-all duration-300"
      style={{ backgroundImage: "url('/college_bg.jpg')" }}
    >
      {/* Background Blur Overlay */}
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[3px] transition-all duration-300"></div>

      <div className="w-full max-w-lg relative z-10 animate-fade-in">
        {/* Main Card */}
        <div className="glass-panel rounded-[2rem] p-10 border border-white/20 dark-theme:border-slate-800/30 bg-white/90 dark-theme:bg-slate-950/90 backdrop-blur-xl shadow-2xl text-center">
          
          {/* Institution Header */}
          <div className="mb-8">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-blue-900 dark-theme:text-blue-100 uppercase leading-snug">
              Vignan's Foundation
            </h1>
            <p className="text-xs font-bold text-slate-500 dark-theme:text-slate-400 mt-1.5 uppercase tracking-wide">
              for Science, Technology & Research
            </p>
            <span className="inline-block mt-2 px-3 py-1 rounded-full bg-blue-50 dark-theme:bg-blue-950/40 text-[10px] font-bold text-blue-600 dark-theme:text-blue-400 border border-blue-100 dark-theme:border-blue-900/30">
              (Deemed to be University)
            </span>
          </div>

          <hr className="border-slate-200/60 dark-theme:border-slate-800/40 mb-8" />

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 dark-theme:bg-red-950/30 border border-red-200 dark-theme:border-red-900/50 text-red-600 dark-theme:text-red-400 text-xs font-semibold text-left animate-fade-in">
              {error}
            </div>
          )}

          {!GOOGLE_CLIENT_ID ? (
            <div className="p-4 rounded-2xl bg-amber-50 dark-theme:bg-amber-950/30 border border-amber-200 dark-theme:border-amber-900/50 text-amber-700 dark-theme:text-amber-400 text-xs font-semibold flex items-start space-x-2 leading-relaxed text-left">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <div>
                <span>Google Client ID is missing.</span>
                <p className="font-normal text-[10px] mt-1 text-slate-500 dark-theme:text-slate-400">
                  Please configure `VITE_GOOGLE_CLIENT_ID` in your frontend environment settings.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-4 py-2">
              <span className="text-xs font-bold text-slate-500 dark-theme:text-slate-400">
                Sign In to Portal
              </span>
              
              {/* Google Button Container */}
              <div className="w-full flex justify-center min-h-[46px]">
                {loading ? (
                  <div className="flex items-center justify-center space-x-2.5 py-2 text-xs font-semibold text-slate-500">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Verifying session...</span>
                  </div>
                ) : (
                  <div id="google-signin-button" className="w-full flex justify-center"></div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
