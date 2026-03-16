import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Briefcase, HardHat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const LoginSignup: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({ email: '', password: '', role: 'worker' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login, isAuthenticated } = useAuth();

    // Redirect to home if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/home', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    /**
     * Handle input changes and update form data state
     */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError(''); // Clear error on input change
    };

    /**
     * Handle form submission for both login and signup
     * Sends credentials to backend API and handles authentication
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
            const response = await fetch(`http://localhost:8000${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // Important: Send cookies with request
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Authentication failed');
            }

            // Update auth context with user data
            login({ email: data.user.email, role: data.user.role });

            // Authentication successful - navigate to home
            navigate('/home', { replace: true });
        } catch (err: any) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full flex-row bg-neutral-50">
            {/* Left Panel: Visual Hero (Hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-end p-12 xl:p-24 overflow-hidden">
                {/* Background Image */}
                <div
                    className="absolute inset-0 z-0 h-full w-full bg-cover bg-center"
                    style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=2076")' }}
                />
                {/* Dark Overlay */}
                <div className="absolute inset-0 z-10 bg-neutral-900/80 bg-gradient-to-t from-neutral-900 via-neutral-900/60 to-transparent" />

                {/* Content */}
                <div className="relative z-20 flex flex-col gap-6 max-w-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center">
                            <span className="text-xl font-black text-neutral-900">F</span>
                        </div>
                        <span className="text-xl font-bold text-white tracking-tight">FITE</span>
                    </div>
                    <h1 className="text-white text-4xl font-bold leading-tight tracking-tight">
                        One platform. <br />Every opportunity.
                    </h1>
                    <p className="text-neutral-300 text-lg leading-relaxed max-w-md">
                        From daily gigs to career moves. Access the dual marketplace for daily wages and long-term careers seamlessly.
                    </p>
                    <div className="flex gap-3 mt-4">
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                            <HardHat className="text-emerald-400" size={18} />
                            <span className="text-sm font-semibold text-white">Daily Gigs</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                            <Briefcase className="text-amber-400" size={18} />
                            <span className="text-sm font-semibold text-white">Long-term Jobs</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel: Form Area */}
            <div className="flex flex-1 flex-col justify-center items-center px-6 py-12 sm:px-8 lg:px-20 xl:px-24 bg-white relative overflow-y-auto">
                {/* Mobile Header Logo (Visible only on small screens) */}
                <div className="lg:hidden absolute top-8 left-8 flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center">
                        <span className="text-lg font-black text-white">F</span>
                    </div>
                    <span className="font-bold text-lg text-neutral-900">FITE</span>
                </div>

                <div className="w-full max-w-md space-y-8">
                    {/* Header Text */}
                    <div className="text-left">
                        <h2 className="mt-6 text-3xl font-bold tracking-tight text-neutral-900">
                            {isLogin ? 'Welcome back' : 'Create an account'}
                        </h2>
                        <p className="mt-2 text-sm text-neutral-500 font-medium">
                            {isLogin ? 'Please enter your details to access your account.' : 'Enter your details to get started.'}
                        </p>
                    </div>

                    {/* Tabs: Sign In / Create Account */}
                    <div className="border-b-2 border-neutral-200">
                        <div className="flex gap-8">
                            <button
                                onClick={() => setIsLogin(true)}
                                className={`flex items-center justify-center border-b-2 pb-3 pt-2 px-1 transition-colors -mb-[2px] ${isLogin
                                        ? 'border-b-neutral-900 text-neutral-900'
                                        : 'border-b-transparent hover:border-b-neutral-300 text-neutral-500'
                                    }`}
                            >
                                <span className="text-sm font-bold">Sign In</span>
                            </button>
                            <button
                                onClick={() => setIsLogin(false)}
                                className={`flex items-center justify-center border-b-2 pb-3 pt-2 px-1 transition-colors -mb-[2px] ${!isLogin
                                        ? 'border-b-neutral-900 text-neutral-900'
                                        : 'border-b-transparent hover:border-b-neutral-300 text-neutral-500'
                                    }`}
                            >
                                <span className="text-sm font-bold">Create Account</span>
                            </button>
                        </div>
                    </div>

                    {/* Form */}
                    <form className="flex flex-col gap-5 mt-8" onSubmit={handleSubmit}>
                        {/* Error Message */}
                        {error && (
                            <div className="rounded-xl bg-red-50 border-2 border-red-200 px-4 py-3 text-sm font-medium text-red-700">
                                {error}
                            </div>
                        )}

                        {/* Email Field */}
                        <div className="flex flex-col gap-2">
                            <label className="text-neutral-700 text-sm font-semibold" htmlFor="email">Email Address</label>
                            <input
                                className="w-full rounded-xl text-neutral-900 placeholder:text-neutral-400 bg-neutral-50 border-2 border-neutral-200 focus:outline-none focus:ring-0 focus:border-neutral-900 h-12 px-4 text-sm font-medium transition-all"
                                id="email"
                                name="email"
                                placeholder="name@example.com"
                                required
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>

                        {/* Password Field */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <label className="text-neutral-700 text-sm font-semibold" htmlFor="password">Password</label>
                                {isLogin && <a className="text-sm font-semibold text-neutral-600 hover:text-neutral-900 hover:underline" href="#">Forgot password?</a>}
                            </div>
                            <div className="relative flex w-full items-stretch">
                                <input
                                    className="w-full rounded-xl text-neutral-900 placeholder:text-neutral-400 bg-neutral-50 border-2 border-neutral-200 focus:outline-none focus:ring-0 focus:border-neutral-900 h-12 px-4 pr-12 text-sm font-medium transition-all"
                                    id="password"
                                    name="password"
                                    placeholder="Enter your password"
                                    required
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={handleChange}
                                    minLength={6}
                                />
                                <div
                                    className="absolute right-0 top-0 bottom-0 flex items-center pr-4 text-neutral-400 cursor-pointer hover:text-neutral-600"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </div>
                            </div>
                        </div>

                        {/* Role Selection (Only for Signup) */}
                        {!isLogin && (
                            <div className="flex flex-col gap-2">
                                <label className="text-neutral-700 text-sm font-semibold" htmlFor="role">Account Type</label>
                                <select
                                    className="w-full rounded-xl text-neutral-900 bg-neutral-50 border-2 border-neutral-200 focus:outline-none focus:ring-0 focus:border-neutral-900 h-12 px-4 text-sm font-medium transition-all"
                                    id="role"
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="worker">Worker - Looking for jobs</option>
                                    <option value="provider">Provider - Posting jobs</option>
                                    <option value="hybrid">Hybrid - Both worker and provider</option>
                                </select>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            className="flex w-full cursor-pointer items-center justify-center rounded-xl h-12 px-5 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-400 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors mt-2"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-4">
                        <div aria-hidden="true" className="absolute inset-0 flex items-center">
                            <div className="w-full border-t-2 border-neutral-100" />
                        </div>
                        <div className="relative flex justify-center text-sm font-semibold">
                            <span className="bg-white px-4 text-neutral-500">Or continue with</span>
                        </div>
                    </div>

                    {/* Social Login */}
                    <div className="grid grid-cols-2 gap-4">
                        <button className="flex items-center justify-center gap-3 rounded-xl bg-white border-2 border-neutral-200 px-4 py-3 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors">
                            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                            </svg>
                            <span className="text-sm font-semibold">Google</span>
                        </button>
                        <button className="flex items-center justify-center gap-3 rounded-xl bg-white border-2 border-neutral-200 px-4 py-3 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors">
                            <svg aria-hidden="true" className="h-5 w-5 text-[#0077b5] fill-current" viewBox="0 0 24 24">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"></path>
                            </svg>
                            <span className="text-sm font-semibold">LinkedIn</span>
                        </button>
                    </div>

                    <p className="text-center text-sm text-neutral-500 mt-6">
                        By signing in, you agree to our{' '}
                        <a className="font-semibold text-neutral-700 hover:text-neutral-900 underline underline-offset-4" href="#">Terms of Service</a>{' '}
                        and{' '}
                        <a className="font-semibold text-neutral-700 hover:text-neutral-900 underline underline-offset-4" href="#">Privacy Policy</a>.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginSignup;
