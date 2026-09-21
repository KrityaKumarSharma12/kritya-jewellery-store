import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, Eye, EyeOff, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const { confirmPassword, ...registerData } = formData;
      await register(registerData);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#FBF7F0]">

      {/* ─── Full-viewport background image ───────────────────────── */}
      <img
        src="/kritya-hero-1.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />

      {/* Mobile-only warm overlay for text contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#FBF7F0]/60 via-[#FBF7F0]/30 to-[#FBF7F0]/70 lg:hidden" />

      {/* ─── Content layer ───────────────────────────────────────── */}
      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">

        {/* ─── LEFT: Brand + editorial text ────────────────────── */}
        <div className="lg:w-[52%] flex flex-col justify-between px-8 py-10 sm:px-12 sm:py-12 lg:p-14 xl:p-20">

          {/* Brand — top-left, natural edge */}
          <img
            src="/kritya-logo-2.png"
            alt="Kritya's"
            className="h-12 sm:h-14 lg:h-16 w-auto self-start"
          />

          {/* Editorial text — mid-left, in the calm zone */}
          <div className="relative mt-14 sm:mt-16 lg:mt-0">

            {/* Soft cream backdrop — subtle, no hard edges */}
            <div
              className="absolute -inset-x-6 -inset-y-4 -z-10 pointer-events-none rounded-[40px]"
              style={{
                background:
                  'radial-gradient(ellipse at 30% 50%, rgba(251, 247, 240, 0.55) 0%, rgba(251, 247, 240, 0.35) 45%, rgba(251, 247, 240, 0) 80%)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                maskImage:
                  'radial-gradient(ellipse at 30% 50%, black 0%, black 40%, transparent 80%)',
                WebkitMaskImage:
                  'radial-gradient(ellipse at 30% 50%, black 0%, black 40%, transparent 80%)',
              }}
            />

            <div className="max-w-[420px]">
              <div className="h-px w-12 bg-[#B8862F]/70 mb-5 sm:mb-6" />
              <p className="text-[10px] tracking-[0.35em] uppercase text-[#4A3D2E] mb-4 font-semibold">
                Join the Family
              </p>
              <h2 className="font-playfair text-[30px] sm:text-[36px] lg:text-[40px] xl:text-[46px] leading-[1.08] text-[#1A130A]">
                Begin your
                <br />
                <span className="italic text-[#B8862F]">collection</span>.
              </h2>
              <p className="mt-4 sm:mt-5 text-[13px] sm:text-[14px] leading-[1.65] text-[#2C2416] max-w-[340px]">
                Create an account to save your favourite pieces, track orders, and enjoy a personalised experience.
              </p>
            </div>
          </div>

          {/* Spacer to balance flex */}
          <div className="hidden lg:block h-1" />
        </div>

        {/* ─── RIGHT: Register card ────────────────────────────── */}
        <div className="lg:w-[48%] flex items-center justify-center px-6 pb-12 sm:px-10 lg:pb-0 lg:pr-14 xl:pr-24">
          <div className="w-full max-w-[420px]">

            <div className="bg-white rounded-2xl border border-[#F2EADB] shadow-[0_24px_70px_-24px_rgba(184,134,47,0.22)] px-7 sm:px-9 py-8 sm:py-9">

              {/* Header */}
              <div className="mb-6 sm:mb-7">
                <p className="text-[10px] tracking-[0.32em] uppercase text-[#B8862F] font-semibold mb-3">
                  Create Account
                </p>
                <h2 className="font-playfair text-[26px] sm:text-[30px] leading-tight text-[#1F1A12] font-bold">
                  Welcome to Kritya's
                </h2>
                <p className="mt-2 text-[13px] text-[#6E6355]">
                  Sign up to start your jewellery journey.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">

                {/* Full Name */}
                <div>
                  <label
                    htmlFor="name"
                    className="block text-[10px] font-semibold tracking-[0.22em] uppercase text-[#8F8371] mb-1.5"
                  >
                    Full Name <span className="text-[#B8862F]">*</span>
                  </label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#B8A88F] group-focus-within:text-[#B8862F] transition-colors pointer-events-none" />
                    <input
                      id="name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      autoComplete="name"
                      className="w-full pl-11 pr-4 py-2.5 bg-[#FAF5EC] border border-[#EDE3D2] rounded-[10px] text-[14px] text-[#1F1A12] placeholder-[#B8A88F] focus:outline-none focus:border-[#C9A253] focus:bg-white focus:ring-2 focus:ring-[#C9A253]/15 transition-all"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-[10px] font-semibold tracking-[0.22em] uppercase text-[#8F8371] mb-1.5"
                  >
                    Email Address <span className="text-[#B8862F]">*</span>
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#B8A88F] group-focus-within:text-[#B8862F] transition-colors pointer-events-none" />
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      autoComplete="email"
                      className="w-full pl-11 pr-4 py-2.5 bg-[#FAF5EC] border border-[#EDE3D2] rounded-[10px] text-[14px] text-[#1F1A12] placeholder-[#B8A88F] focus:outline-none focus:border-[#C9A253] focus:bg-white focus:ring-2 focus:ring-[#C9A253]/15 transition-all"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label
                    htmlFor="phone-input"
                    className="block text-[10px] font-semibold tracking-[0.22em] uppercase text-[#8F8371] mb-1.5 cursor-pointer"
                  >
                    Phone Number
                  </label>
                  <div className="relative group">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#B8A88F] group-focus-within:text-[#B8862F] transition-colors pointer-events-none" />
                    <input
                      id="phone-input"
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      onFocus={(e) =>
                        e.target.scrollIntoView({ block: 'center', behavior: 'instant' })
                      }
                      autoComplete="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={15}
                      className="w-full pl-11 pr-4 py-2.5 bg-[#FAF5EC] border border-[#EDE3D2] rounded-[10px] text-[14px] text-[#1F1A12] placeholder-[#B8A88F] focus:outline-none focus:border-[#C9A253] focus:bg-white focus:ring-2 focus:ring-[#C9A253]/15 transition-all"
                      placeholder="9876543210"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-[10px] font-semibold tracking-[0.22em] uppercase text-[#8F8371] mb-1.5"
                  >
                    Password <span className="text-[#B8862F]">*</span>
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#B8A88F] group-focus-within:text-[#B8862F] transition-colors pointer-events-none" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      autoComplete="new-password"
                      className="w-full pl-11 pr-11 py-2.5 bg-[#FAF5EC] border border-[#EDE3D2] rounded-[10px] text-[14px] text-[#1F1A12] placeholder-[#B8A88F] focus:outline-none focus:border-[#C9A253] focus:bg-white focus:ring-2 focus:ring-[#C9A253]/15 transition-all"
                      placeholder="Min 6 characters"
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

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-[10px] font-semibold tracking-[0.22em] uppercase text-[#8F8371] mb-1.5"
                  >
                    Confirm Password <span className="text-[#B8862F]">*</span>
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#B8A88F] group-focus-within:text-[#B8862F] transition-colors pointer-events-none" />
                    <input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      autoComplete="new-password"
                      className="w-full pl-11 pr-4 py-2.5 bg-[#FAF5EC] border border-[#EDE3D2] rounded-[10px] text-[14px] text-[#1F1A12] placeholder-[#B8A88F] focus:outline-none focus:border-[#C9A253] focus:bg-white focus:ring-2 focus:ring-[#C9A253]/15 transition-all"
                      placeholder="Confirm password"
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 rounded-[10px] font-semibold text-[14px] text-white bg-[#B8862F] hover:bg-[#9C6F22] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <span className="flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating account…
                      </>
                    ) : (
                      <>
                        Create Account
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </span>
                </button>
              </form>

              {/* Card footer */}
              <div className="mt-6 pt-4 border-t border-[#F2EADB] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[12px]">
                <span className="text-[#8F8371]">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="text-[#B8862F] hover:text-[#9C6F22] font-semibold transition-colors"
                  >
                    Sign in
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

export default RegisterPage;