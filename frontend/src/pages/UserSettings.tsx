import React, { useState } from 'react';
import { User, Lock, Briefcase, Bell, LogOut, Edit, CheckCircle, CloudUpload, FileText, Trash2, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMode } from '../context/ModeContext';

const UserSettings: React.FC = () => {
    const [radius, setRadius] = useState(25);
    const [availability, setAvailability] = useState(true);
    const [notifications, setNotifications] = useState(true);
    const [activeTab, setActiveTab] = useState('profile');
    const { mode } = useMode();

    const isDaily = mode === 'daily';

    const navItems = [
        { id: 'profile', label: 'General Profile', icon: User },
        { id: 'security', label: 'Security & Login', icon: Lock },
        { id: 'preferences', label: 'Job Preferences', icon: Briefcase },
        { id: 'notifications', label: 'Notifications', icon: Bell },
    ];

    return (
        <div className="w-full min-h-screen relative px-4 md:px-8 pt-8 pb-10">
            <div className="mx-auto w-full max-w-6xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
                            Settings
                        </h1>
                        <p className="text-sm text-neutral-500 mt-1 font-medium">Manage your account and preferences</p>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar Navigation */}
                    <motion.aside
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-full lg:w-64 shrink-0"
                    >
                        <div
                            className="rounded-2xl border-2 border-neutral-200 overflow-hidden bg-white shadow-sm"
                        >
                            <nav className="p-3">
                                {navItems.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${activeTab === item.id
                                            ? `${isDaily ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'} font-semibold`
                                            : 'text-neutral-600 hover:bg-neutral-50'
                                            }`}
                                    >
                                        <item.icon size={20} />
                                        <span className="text-sm font-medium">{item.label}</span>
                                    </button>
                                ))}
                            </nav>
                            <div className="border-t-2 border-neutral-100 p-3">
                                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors">
                                    <LogOut size={20} />
                                    <span className="text-sm font-semibold">Sign Out</span>
                                </button>
                            </div>
                        </div>
                    </motion.aside>

                    {/* Main Content Area */}
                    <main className="flex-1">
                        <div className="flex flex-col gap-6">
                            {/* Profile Header Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-2xl border-2 border-neutral-200 p-6 bg-white shadow-sm"
                            >
                                <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                                    <div className="relative group cursor-pointer">
                                        <div
                                            className="rounded-full h-20 w-20 border-4 border-white shadow-lg bg-cover bg-center"
                                            style={{ backgroundImage: 'url("https://i.pravatar.cc/150?img=3")' }}
                                        />
                                        <div className={`absolute bottom-0 right-0 ${isDaily ? 'bg-emerald-500' : 'bg-amber-500'} p-1.5 rounded-full shadow-md border-2 border-white flex items-center justify-center`}>
                                            <Edit size={12} className="text-white" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col flex-1">
                                        <h2 className="text-xl font-bold text-neutral-900">Athish</h2>
                                        <div className="flex flex-wrap gap-2 items-center mt-1">
                                            <span className={`${isDaily ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'} text-xs font-semibold px-2.5 py-1 rounded-full`}>Full Stack Developer</span>
                                            <span className="text-neutral-500 text-sm font-medium">Member since 2024</span>
                                        </div>
                                    </div>
                                    <button className="px-4 py-2.5 rounded-xl border-2 border-neutral-200 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors">
                                        View Public Profile
                                    </button>
                                </div>
                            </motion.div>

                            {/* Personal Information */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="rounded-2xl border-2 border-neutral-200 p-6 bg-white shadow-sm"
                            >
                                <h3 className="text-lg font-bold text-neutral-900 mb-6">Personal Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <label className="flex flex-col gap-2">
                                        <span className="text-neutral-700 text-sm font-semibold">First Name</span>
                                        <input className="w-full rounded-xl border-2 border-neutral-200 bg-neutral-50 text-neutral-900 h-12 px-4 focus:ring-0 focus:border-neutral-900 outline-none transition-all text-sm font-medium" type="text" defaultValue="Athish" />
                                    </label>
                                    <label className="flex flex-col gap-2">
                                        <span className="text-neutral-700 text-sm font-semibold">Last Name</span>
                                        <input className="w-full rounded-xl border-2 border-neutral-200 bg-neutral-50 text-neutral-900 h-12 px-4 focus:ring-0 focus:border-neutral-900 outline-none transition-all text-sm font-medium" type="text" defaultValue="Kumar" />
                                    </label>
                                    <label className="flex flex-col gap-2">
                                        <span className="text-neutral-700 text-sm font-semibold">Email Address</span>
                                        <input className="w-full rounded-xl border-2 border-neutral-200 bg-neutral-50 text-neutral-900 h-12 px-4 focus:ring-0 focus:border-neutral-900 outline-none transition-all text-sm font-medium" type="email" defaultValue="athish@example.com" />
                                    </label>
                                    <label className="flex flex-col gap-2">
                                        <div className="flex justify-between">
                                            <span className="text-neutral-700 text-sm font-semibold">Phone Number</span>
                                            <span className="text-emerald-600 text-xs font-semibold flex items-center gap-1">
                                                <CheckCircle size={12} /> Verified
                                            </span>
                                        </div>
                                        <input className="w-full rounded-xl border-2 border-neutral-200 bg-neutral-50 text-neutral-900 h-12 px-4 focus:ring-0 focus:border-neutral-900 outline-none transition-all text-sm font-medium" type="tel" defaultValue="+91 98765 43210" />
                                    </label>
                                </div>
                            </motion.div>

                            {/* Professional Documents */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="rounded-2xl border-2 border-neutral-200 p-6 bg-white shadow-sm"
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-neutral-900">Professional Documents</h3>
                                    <span className="text-xs font-semibold text-neutral-500 bg-neutral-100 px-3 py-1.5 rounded-lg">PDF only, Max 5MB</span>
                                </div>
                                <div className={`border-2 border-dashed ${isDaily ? 'border-emerald-300 bg-emerald-50/50' : 'border-amber-300 bg-amber-50/50'} rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-opacity-70 transition-colors group`}>
                                    <div className="bg-white p-3 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                        <CloudUpload size={28} className={isDaily ? 'text-emerald-600' : 'text-amber-600'} />
                                    </div>
                                    <p className="text-neutral-900 font-bold mb-1">Upload Updated Resume</p>
                                    <p className="text-neutral-500 text-sm font-medium">Drag and drop or click to browse</p>
                                </div>
                                <div className="mt-4 flex items-center justify-between p-4 bg-neutral-50 rounded-xl border-2 border-neutral-100">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-red-100 text-red-600 p-2.5 rounded-xl">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-neutral-900">Athish_Resume_2024.pdf</p>
                                            <p className="text-xs text-neutral-500 font-medium">Uploaded 2 days ago • 2.4 MB</p>
                                        </div>
                                    </div>
                                    <button className="text-neutral-400 hover:text-red-500 transition-colors p-2">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </motion.div>

                            {/* App Preferences */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="rounded-2xl border-2 border-neutral-200 p-6 bg-white shadow-sm"
                            >
                                <h3 className="text-lg font-bold text-neutral-900 mb-6">App Preferences</h3>
                                <div className="flex flex-col gap-6">
                                    {/* Slider */}
                                    <div className="flex flex-col gap-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-neutral-900 text-sm font-bold flex items-center gap-2">
                                                <MapPin size={16} className={isDaily ? 'text-emerald-600' : 'text-amber-600'} />
                                                Daily Wage Search Radius
                                            </label>
                                            <span className={`${isDaily ? 'text-emerald-600' : 'text-amber-600'} font-bold text-sm`}>{radius} km</span>
                                        </div>
                                        <input
                                            className={`w-full h-2.5 bg-neutral-200 rounded-full appearance-none cursor-pointer ${isDaily ? 'accent-emerald-600' : 'accent-amber-600'}`}
                                            max="100"
                                            min="5"
                                            type="range"
                                            value={radius}
                                            onChange={(e) => setRadius(parseInt(e.target.value))}
                                        />
                                        <div className="flex justify-between text-xs text-neutral-400 font-semibold">
                                            <span>5 km</span>
                                            <span>100 km</span>
                                        </div>
                                    </div>

                                    <hr className="border-neutral-100" />

                                    {/* Toggles */}
                                    <div className="flex flex-col gap-5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-neutral-900 font-semibold">Availability Status</span>
                                                <span className="text-neutral-500 text-xs font-medium">Allow recruiters to contact you for new gigs</span>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={availability}
                                                    onChange={() => setAvailability(!availability)}
                                                />
                                                <div className={`w-12 h-7 bg-neutral-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all after:shadow-sm ${isDaily ? 'peer-checked:bg-emerald-600' : 'peer-checked:bg-amber-600'}`}></div>
                                            </label>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-neutral-900 font-semibold">Daily Wage Notifications</span>
                                                <span className="text-neutral-500 text-xs font-medium">Get alerts for jobs within your radius immediately</span>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={notifications}
                                                    onChange={() => setNotifications(!notifications)}
                                                />
                                                <div className={`w-12 h-7 bg-neutral-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all after:shadow-sm ${isDaily ? 'peer-checked:bg-emerald-600' : 'peer-checked:bg-amber-600'}`}></div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Action Buttons */}
                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                                <button className="px-6 py-3 rounded-xl border-2 border-neutral-200 text-neutral-700 font-semibold text-sm hover:bg-neutral-50 transition-colors">
                                    Cancel
                                </button>
                                <button className="px-8 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-sm transition-all">
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default UserSettings;
