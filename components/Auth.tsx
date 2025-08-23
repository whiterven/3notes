import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { LoaderIcon, EyeIcon, EyeOffIcon } from './icons';

export const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      let error;
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        error = signInError;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        error = signUpError;
        if (!error && data.user && data.user.identities && data.user.identities.length === 0) {
          setMessage('User already exists. Please log in.');
        } else if (!error) {
          setMessage('Check your email for the verification link!');
        }
      }
      if (error) throw error;
    } catch (error: any) {
      setMessage(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-amber-50 flex flex-col items-center justify-center p-4 font-handwritten">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-amber-800">Stickon AI</h1>
          <p className="text-xl sm:text-2xl text-amber-600 mt-2">Your 3D AI-powered notes</p>
        </div>
        <div className="bg-white/80 p-6 sm:p-8 rounded-2xl shadow-2xl border border-amber-200 space-y-6">
          <h2 className="text-2xl sm:text-3xl text-amber-800 text-center">{isLogin ? 'Log In' : 'Sign Up'}</h2>
          <form className="space-y-4" onSubmit={handleAuth}>
            <div>
              <input
                className="w-full text-lg sm:text-xl p-2 sm:p-3 bg-amber-50 border-2 border-amber-200 rounded-lg focus:border-amber-400 focus:ring-amber-300 transition text-amber-900"
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="relative">
              <input
                className="w-full text-lg sm:text-xl p-2 sm:p-3 pr-12 bg-amber-50 border-2 border-amber-200 rounded-lg focus:border-amber-400 focus:ring-amber-300 transition text-amber-900"
                type={isPasswordVisible ? 'text' : 'password'}
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-amber-600 hover:text-amber-800"
                aria-label={isPasswordVisible ? "Hide password" : "Show password"}
              >
                {isPasswordVisible ? <EyeOffIcon className="w-6 h-6"/> : <EyeIcon className="w-6 h-6"/>}
              </button>
            </div>
            <div>
              <button
                className="w-full flex items-center justify-center gap-2 bg-amber-700 text-white text-lg sm:text-xl font-bold py-2.5 sm:py-3 px-4 sm:px-5 rounded-full hover:bg-amber-800 transition transform hover:scale-105 shadow-lg disabled:bg-amber-400"
                disabled={loading}
              >
                {loading && <LoaderIcon className="w-6 h-6 animate-spin" />}
                {isLogin ? 'Log In' : 'Sign Up'}
              </button>
            </div>
          </form>
          {message && <p className="text-center text-red-600 text-base sm:text-lg">{message}</p>}
          <div className="text-center">
            <button onClick={() => { setIsLogin(!isLogin); setMessage(''); }} className="text-amber-700 hover:underline text-base sm:text-lg">
              {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Log In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};