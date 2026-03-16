import { Outlet, useLocation, useNavigate } from "react-router-dom";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Home, Briefcase, FileText,
    Menu, X, ChevronRight, Search, LogOut
} from "lucide-react";
import { useMode } from "../context/ModeContext";
import { useAuth } from "../context/AuthContext";
import GlobalToggle from "../components/shared/GlobalToggle";

interface NavItem {
    icon: React.ReactNode;
    label: string;
    href: string;
}

const navItems: NavItem[] = [
    { icon: <Home size={20} />, label: "Home", href: "/" },
    { icon: <Briefcase size={20} />, label: "Posted Jobs", href: "/posted-jobs" },
    { icon: <FileText size={20} />, label: "Applied Jobs", href: "/applied-jobs" },
    { icon: <Search size={20} />, label: "Explore Jobs", href: "/explore-jobs" },
];

const Layout: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { mode } = useMode();
    const { user, logout } = useAuth();

    // Handle logout
    const handleLogout = async () => {
        setIsOpen(false);
        await logout();
        navigate('/login', { replace: true });
    };

    // Don't show mode toggle on job-responses, job-detail, and applicants pages
    const hideToggle = location.pathname.includes("/job-responses") || location.pathname.includes("/job-detail") || location.pathname.includes("/applicants");

    // Full screen pages - no sidebar
    const isFullScreen = location.pathname.includes("/job-responses");
    if (isFullScreen) {
        return <Outlet />;
    }

    const isActive = (href: string) => {
        if (href === "/") return location.pathname === "/" || location.pathname === "/home";
        return location.pathname.startsWith(href);
    };

    return (
        <div className="min-h-screen relative overflow-hidden transition-colors duration-300 bg-neutral-50">
            {/* Subtle gradient orbs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className={`absolute top-[-40%] right-[-20%] w-[60%] h-[60%] rounded-full blur-[150px] ${mode === 'daily' ? 'bg-emerald-500/5' : 'bg-amber-500/5'
                    }`} />
                <div className={`absolute bottom-[-30%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] ${mode === 'daily' ? 'bg-emerald-600/3' : 'bg-amber-600/3'
                    }`} />
            </div>

            {/* Navigation Toggle Button */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed top-6 left-6 z-50 p-2.5 rounded-xl border-2 transition-all duration-200 ${isOpen
                    ? 'bg-neutral-100 border-neutral-300 text-neutral-800'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:text-neutral-800 hover:border-neutral-300 shadow-sm'
                    }`}
                whileTap={{ scale: 0.95 }}
            >
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.div
                            key="close"
                            initial={{ rotate: -90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: 90, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <X size={20} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="menu"
                            initial={{ rotate: 90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: -90, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Menu size={20} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>

            {/* Vertical Nav Panel */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Nav Dropdown */}
                        <motion.nav
                            initial={{ opacity: 0, y: -10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.98 }}
                            transition={{ type: "spring", damping: 25, stiffness: 350 }}
                            className="fixed top-[72px] left-6 z-50 w-72 rounded-2xl border-2 border-neutral-200 bg-white shadow-xl overflow-hidden"
                        >
                            {/* Logo/Brand */}
                            <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black tracking-tight ${mode === 'daily' ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                                    }`}>
                                    F
                                </div>
                                <div>
                                    <div className="font-bold text-base text-neutral-900 tracking-tight">FITE</div>
                                    <div className="text-xs text-neutral-500 font-medium">Find • Work • Grow</div>
                                </div>
                            </div>

                            {/* Nav Items */}
                            <div className="p-3 space-y-1">
                                {navItems.map((item, index) => {
                                    const active = isActive(item.href);
                                    return (
                                        <motion.button
                                            key={item.href}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.04 }}
                                            onClick={() => {
                                                setIsOpen(false);
                                                navigate(item.href);
                                            }}
                                            className={`group w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 relative ${active
                                                ? 'bg-neutral-100 text-neutral-900'
                                                : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800'
                                                }`}
                                        >
                                            {/* Active indicator */}
                                            {active && (
                                                <div className={`absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full ${mode === 'daily' ? 'bg-emerald-500' : 'bg-amber-500'
                                                    }`} />
                                            )}
                                            <span className={active ? 'ml-1' : ''}>{item.icon}</span>
                                            <span className="font-semibold text-sm flex-1 text-left">{item.label}</span>
                                            {active && <ChevronRight size={14} className="text-neutral-400" />}
                                        </motion.button>
                                    );
                                })}
                            </div>

                            <div className="p-3 border-t border-neutral-100 space-y-2">
                                {/* Profile Info */}
                                <div className="flex items-center gap-3 px-4 py-2">
                                    <img
                                        src="https://i.pravatar.cc/150?img=3"
                                        className="h-9 w-9 rounded-full object-cover ring-2 ring-neutral-200"
                                        alt="Avatar"
                                    />
                                    <div className="text-left flex-1">
                                        <div className="font-semibold text-sm text-neutral-800">{user?.email?.split('@')[0] || 'User'}</div>
                                        <div className="text-xs text-neutral-500">{user?.role || 'Member'}</div>
                                    </div>
                                </div>

                                {/* Action Buttons Row */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setIsOpen(false);
                                            navigate('/settings');
                                        }}
                                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                                    >
                                        View Profile
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors bg-red-50 text-red-600 hover:bg-red-100"
                                        title="Logout"
                                    >
                                        <LogOut size={16} />
                                    </button>
                                </div>
                            </div>
                        </motion.nav>
                    </>
                )}
            </AnimatePresence>

            {/* Mode Toggle at Top Center */}
            {!hideToggle && (
                <div className="fixed top-5 left-1/2 -translate-x-1/2 z-30">
                    <GlobalToggle />
                </div>
            )}

            {/* Main Content */}
            <main className="relative min-h-screen pt-24 px-4 md:px-8 pb-8">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
