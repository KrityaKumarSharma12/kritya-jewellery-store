import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(formData.email, formData.password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#FBF7F0]">

      {/* ─── Full-viewport background image ───────────────────────── */}
      <img
        src="/login-page.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />

      {/* Mobile-only warm overlay for text contrast (desktop uses halo) */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#FBF7F0]/60 via-[#FBF7F0]/30 to-[#FBF7F0]/70 lg:hidden" />

      {/* ─── Content layer ───────────────────────────────────────── */}
      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">

        {/* ─── LEFT: Brand + editorial text ────────────────────── */}
        <div className="lg:w-[55%] flex flex-col px-6 py-8 sm:px-10 sm:py-10 lg:p-12 lg:ml-0 xl:ml-60 xl:p-16">

          {/* Brand — top-left */}
          <img
            src="/kritya-logo-2.png"
            alt="Kritya's"
            className="h-12 sm:h-14 lg:h-16 w-auto self-start relative z-20"
          />

          {/* Editorial text — soft cream backdrop with subtle blur for readability */}
          <div className="relative mt-12 sm:mt-16 lg:mt-24 lg:ml-0 xl:ml-30 xl:mt-28">

            {/* Soft cream backdrop with radial fade — no hard edges, no visible box */}
            <div
              className="absolute -inset-x-8 -inset-y-6 -z-10 pointer-events-none rounded-[48px]"
              style={{
                background:
                  'radial-gradient(ellipse at 30% 50%, rgba(251, 247, 240, 0.75) 0%, rgba(251, 247, 240, 0.55) 40%, rgba(251, 247, 240, 0.20) 70%, rgba(251, 247, 240, 0) 90%)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                maskImage:
                  'radial-gradient(ellipse at 30% 50%, black 0%, black 45%, transparent 85%)',
                WebkitMaskImage:
                  'radial-gradient(ellipse at 30% 50%, black 0%, black 45%, transparent 85%)',
              }}
            />

            <div className="max-w-[400px]">
              <div className="h-px w-12 bg-[#B8862F]/70 mb-5 sm:mb-6" />
              <p className="text-[10px] tracking-[0.35em] uppercase text-[#4A3D2E] mb-4 font-semibold">
                Welcome Back
              </p>
              <h2 className="font-playfair text-[28px] sm:text-[34px] lg:text-[38px] xl:text-[44px] leading-[1.08] text-[#1A130A]">
                Find your next
                <br />
                <span className="italic text-[#B8862F]">heirloom</span>.
              </h2>
              <p className="mt-4 sm:mt-5 text-[13px] sm:text-[14px] leading-[1.65] text-[#2C2416] max-w-[340px]">
                Sign in to view your orders, wishlist, and the pieces you've been dreaming about.
              </p>
            </div>
          </div>

          {/* Spacer for desktop layout */}
          <div className="hidden lg:block flex-1" />
        </div>

        {/* ─── RIGHT: Login card ───────────────────────────────── */}
        <div className="lg:w-[45%] flex items-center justify-center lg:justify-start px-6 pb-12 sm:px-10 lg:pb-0 lg:pr-12 xl:pr-20">
          <div className="w-full max-w-[440px]">

            <div className="bg-white rounded-2xl border border-[#F2EADB] shadow-[0_24px_70px_-24px_rgba(184,134,47,0.20)] px-7 sm:px-10 py-8 sm:py-10">

              {/* Header */}
              <div className="mb-7 sm:mb-8">
                <p className="text-[10px] tracking-[0.32em] uppercase text-[#B8862F] font-semibold mb-3">
                  Sign In
                </p>
                <h2 className="font-playfair text-[28px] sm:text-[32px] lg:text-[34px] leading-tight text-[#1F1A12] font-bold">
                  Welcome Back
                </h2>
                <p className="mt-2.5 text-[13px] sm:text-[14px] text-[#6E6355]">
                  Sign in to continue shopping.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-[10px] font-semibold tracking-[0.22em] uppercase text-[#8F8371] mb-2"
                  >
                    Email Address
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#B8A88F] group-focus-within:text-[#B8862F] transition-colors" />
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      autoComplete="email"
                      className="w-full pl-11 pr-4 py-3 bg-[#FAF5EC] border border-[#EDE3D2] rounded-[10px] text-[15px] text-[#1F1A12] placeholder-[#B8A88F] focus:outline-none focus:border-[#C9A253] focus:bg-white focus:ring-2 focus:ring-[#C9A253]/15 transition-all"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-[10px] font-semibold tracking-[0.22em] uppercase text-[#8F8371] mb-2"
                  >
                    Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#B8A88F] group-focus-within:text-[#B8862F] transition-colors" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      autoComplete="current-password"
                      className="w-full pl-11 pr-11 py-3 bg-[#FAF5EC] border border-[#EDE3D2] rounded-[10px] text-[15px] text-[#1F1A12] placeholder-[#B8A88F] focus:outline-none focus:border-[#C9A253] focus:bg-white focus:ring-2 focus:ring-[#C9A253]/15 transition-all"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#B8A88F] hover:text-[#B8862F] transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                </div>

                {/* Remember + Forgot */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 rounded border-[#D9C9A8] text-[#B8862F] focus:ring-[#C9A253]/30 focus:ring-offset-0 accent-[#B8862F]"
                    />
                    <span className="ml-2 text-[13px] text-[#6E6355]">Remember me</span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-[13px] font-medium text-[#B8862F] hover:text-[#9C6F22] transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-1 py-3.5 rounded-[10px] font-semibold text-[15px] text-white bg-[#B8862F] hover:bg-[#9C6F22] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <span className="flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Signing in…
                      </>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </span>
                </button>
              </form>

              {/* Card footer */}
              <div className="mt-7 pt-5 border-t border-[#F2EADB] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[12px]">
                <span className="text-[#8F8371]">
                  New here?{' '}
                  <Link
                    to="/register"
                    className="text-[#B8862F] hover:text-[#9C6F22] font-semibold transition-colors"
                  >
                    Create an account
                  </Link>
                </span>
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 text-[#B8862F] hover:text-[#9C6F22] font-medium transition-colors self-start sm:self-auto"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to store
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;