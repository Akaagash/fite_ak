import React, { useState, useRef } from 'react';
import { User, Lock, Briefcase, Bell, LogOut, Edit, CheckCircle, CloudUpload, FileText, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMode } from '../context/ModeContext';
import { useAuth } from '../context/AuthContext';

const UserSettings: React.FC = () => {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8010';
    const FALLBACK_API_BASE = 'http://localhost:8000';
    const [radius, setRadius] = useState(25);
    const [availability, setAvailability] = useState(true);
    const [notifications, setNotifications] = useState(true);
    const [activeTab, setActiveTab] = useState('profile');
    const { mode } = useMode();
    const { user, checkAuth } = useAuth();
    const [resumeUrl, setResumeUrl] = useState<string | null>(user?.resume_url || null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [profilePhoto, setProfilePhoto] = useState<string | null>(user?.profile_photo || null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [photoError, setPhotoError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
    const [savingProfile, setSavingProfile] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isDaily = mode === 'daily';

    // Update profilePhoto when user data changes
    React.useEffect(() => {
        if (user?.profile_photo) {
            setProfilePhoto(user.profile_photo);
        }
    }, [user?.profile_photo]);

    React.useEffect(() => {
        if (!user) return;
        const parts = (user.full_name || '').trim().split(/\s+/).filter(Boolean);
        setFirstName(parts[0] || '');
        setLastName(parts.slice(1).join(' '));
        setPhone(user.phone || '');
    }, [user]);

    const placeholderAvatar = React.useMemo(() => {
        const seed = (user?.user_id || user?.email || 'default').length % 70;
        return `https://i.pravatar.cc/150?img=${seed || 1}`;
    }, [user?.user_id, user?.email]);

    const uploadTargets = React.useMemo(() => {
        const bases = [API_BASE, FALLBACK_API_BASE].filter(Boolean);
        return Array.from(new Set(bases));
    }, [API_BASE]);

    const navItems = [
        { id: 'profile', label: 'General Profile', icon: User },
        { id: 'security', label: 'Security & Login', icon: Lock },
        { id: 'preferences', label: 'Job Preferences', icon: Briefcase },
        { id: 'notifications', label: 'Notifications', icon: Bell },
    ];

    const handleProfilePhotoClick = () => {
        fileInputRef.current?.click();
    };

    const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setPhotoError('Only JPG, PNG, and WebP images are allowed.');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setPhotoError('Image size must be less than 5MB.');
            return;
        }

        setUploadingPhoto(true);
        setPhotoError(null);
        setSaveSuccess(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            const token = localStorage.getItem('token');

            let lastError = 'Upload failed';
            let uploadedPhotoUrl: string | null = null;

            for (const baseUrl of uploadTargets) {
                const res = await fetch(`${baseUrl}/api/auth/upload-profile-photo`, {
                    method: 'POST',
                    body: formData,
                    credentials: 'include',
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                });

                if (res.ok) {
                    const data = await res.json();
                    uploadedPhotoUrl = data.profile_photo || data.photo_url || null;
                    break;
                }

                try {
                    const data = await res.json();
                    lastError = data.detail || data.message || `Upload failed with status ${res.status}`;
                } catch (_e) {
                    lastError = `Upload failed with status ${res.status}`;
                }
            }

            // Fallback path: if upload endpoint is unavailable, store image data URL via profile update endpoint.
            if (!uploadedPhotoUrl && /404|not found/i.test(lastError)) {
                const dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(String(reader.result || ''));
                    reader.onerror = () => reject(new Error('Failed to read image file'));
                    reader.readAsDataURL(file);
                });

                for (const baseUrl of uploadTargets) {
                    const profileRes = await fetch(`${baseUrl}/api/auth/profile`, {
                        method: 'PUT',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify({ profile_photo: dataUrl }),
                    });

                    if (profileRes.ok) {
                        const payload = await profileRes.json();
                        uploadedPhotoUrl = payload?.user?.profile_photo || dataUrl;
                        break;
                    }
                }
            }

            if (!uploadedPhotoUrl) {
                throw new Error(lastError || 'Profile photo upload failed');
            }

            setProfilePhoto(uploadedPhotoUrl);
            
            // Refresh auth context so other pages see the updated profile photo
            try {
                await checkAuth();
            } catch (_e) {
                // ignore
            }
            setSaveSuccess('Profile photo updated successfully.');
        } catch (err: any) {
            console.error('Profile photo upload error:', err);
            setPhotoError(err.message || 'Upload failed');
        } finally {
            setUploadingPhoto(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleSaveProfile = async () => {
        setSaveError(null);
        setSaveSuccess(null);
        setSavingProfile(true);
        try {
            const token = localStorage.getItem('token');
            const fullName = `${firstName} ${lastName}`.trim();
            let lastError = 'Failed to save profile changes';
            let success = false;

            for (const baseUrl of uploadTargets) {
                const res = await fetch(`${baseUrl}/api/auth/profile`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({
                        full_name: fullName || undefined,
                        phone: phone || undefined,
                    }),
                });

                if (res.ok) {
                    success = true;
                    break;
                }

                try {
                    const data = await res.json();
                    lastError = data.detail || data.message || lastError;
                } catch (_e) {
                    lastError = `Failed to save profile changes (${res.status})`;
                }
            }

            if (!success) {
                throw new Error(lastError);
            }

            await checkAuth();
            setSaveSuccess('Profile changes saved successfully.');
        } catch (err: any) {
            setSaveError(err.message || 'Failed to save profile changes');
        } finally {
            setSavingProfile(false);
        }
    };

    const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.type !== 'application/pdf') {
            setUploadError('Only PDF files are allowed.');
            return;
        }
        setUploading(true);
        setUploadError(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/auth/upload-resume`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Upload failed');
            setResumeUrl(data.resume_url);
            // Refresh auth context so other pages see the updated resume_url
            try {
                await checkAuth();
            } catch (_e) {
                // ignore
            }
        } catch (err: any) {
            setUploadError(err.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="w-full min-h-screen relative z-[200] px-4 md:px-8 pt-8 pb-10">
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
                                    <div className="relative group cursor-pointer" onClick={handleProfilePhotoClick}>
                                        <div
                                            className="rounded-full h-20 w-20 border-4 border-white shadow-lg bg-cover bg-center transition-opacity group-hover:opacity-80"
                                            style={{ 
                                                backgroundImage: profilePhoto 
                                                    ? `url("${profilePhoto}")`
                                                    : `url("${placeholderAvatar}")`
                                            }}
                                        />
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            className="hidden"
                                            onChange={handleProfilePhotoUpload}
                                            disabled={uploadingPhoto}
                                        />
                                        <div className={`absolute bottom-0 right-0 ${isDaily ? 'bg-emerald-500' : 'bg-amber-500'} p-1.5 rounded-full shadow-md border-2 border-white flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                            {uploadingPhoto ? (
                                                <div className="animate-spin">
                                                    <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                                                </div>
                                            ) : (
                                                <Edit size={12} className="text-white" />
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col flex-1">
                                        <h2 className="text-xl font-bold text-neutral-900">{user?.full_name || 'User'}</h2>
                                        <div className="flex flex-wrap gap-2 items-center mt-1">
                                            {user?.experience && (
                                                <span className={`${isDaily ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'} text-xs font-semibold px-2.5 py-1 rounded-full`}>{user.experience}</span>
                                            )}
                                            <span className="text-neutral-500 text-sm font-medium">Member since 2024</span>
                                        </div>
                                    </div>
                                </div>
                                {photoError && (
                                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                                        <p className="text-red-600 text-sm font-medium">{photoError}</p>
                                    </div>
                                )}
                                {saveSuccess && (
                                    <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                                        <p className="text-emerald-700 text-sm font-medium">{saveSuccess}</p>
                                    </div>
                                )}
                                {saveError && (
                                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                                        <p className="text-red-600 text-sm font-medium">{saveError}</p>
                                    </div>
                                )}
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
                                        <input className="w-full rounded-xl border-2 border-neutral-200 bg-neutral-50 text-neutral-900 h-12 px-4 focus:ring-0 focus:border-neutral-900 outline-none transition-all text-sm font-medium" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                                    </label>
                                    <label className="flex flex-col gap-2">
                                        <span className="text-neutral-700 text-sm font-semibold">Last Name</span>
                                        <input className="w-full rounded-xl border-2 border-neutral-200 bg-neutral-50 text-neutral-900 h-12 px-4 focus:ring-0 focus:border-neutral-900 outline-none transition-all text-sm font-medium" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                                    </label>
                                    <label className="flex flex-col gap-2">
                                        <span className="text-neutral-700 text-sm font-semibold">Email Address</span>
                                        <input className="w-full rounded-xl border-2 border-neutral-200 bg-neutral-50 text-neutral-900 h-12 px-4 focus:ring-0 focus:border-neutral-900 outline-none transition-all text-sm font-medium" type="email" value={user?.email || ''} readOnly />
                                    </label>
                                    <label className="flex flex-col gap-2">
                                        <div className="flex justify-between">
                                            <span className="text-neutral-700 text-sm font-semibold">Phone Number</span>
                                            <span className="text-emerald-600 text-xs font-semibold flex items-center gap-1">
                                                <CheckCircle size={12} /> Verified
                                            </span>
                                        </div>
                                        <input className="w-full rounded-xl border-2 border-neutral-200 bg-neutral-50 text-neutral-900 h-12 px-4 focus:ring-0 focus:border-neutral-900 outline-none transition-all text-sm font-medium" type="tel" defaultValue={user?.phone || ''} />
                                        <input className="w-full rounded-xl border-2 border-neutral-200 bg-neutral-50 text-neutral-900 h-12 px-4 focus:ring-0 focus:border-neutral-900 outline-none transition-all text-sm font-medium" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                                    </label>
                                </div>
                            </motion.div>

                            {/* Professional Documents - Only show for non-daily-wage users */}
                            {!isDaily && (
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
                                <label className={`border-2 border-dashed ${isDaily ? 'border-emerald-300 bg-emerald-50/50' : 'border-amber-300 bg-amber-50/50'} rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-opacity-70 transition-colors group`}
                                    style={{ opacity: uploading ? 0.6 : 1 }}>
                                    <input type="file" accept="application/pdf" className="hidden" onChange={handleResumeUpload} disabled={uploading} />
                                    <div className="bg-white p-3 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                        <CloudUpload size={28} className={isDaily ? 'text-emerald-600' : 'text-amber-600'} />
                                    </div>
                                    <p className="text-neutral-900 font-bold mb-1">{uploading ? 'Uploading...' : 'Upload Updated Resume'}</p>
                                    <p className="text-neutral-500 text-sm font-medium">Drag and drop or click to browse</p>
                                    {uploadError && <span className="text-red-600 text-xs mt-2">{uploadError}</span>}
                                </label>
                                {resumeUrl && (
                                    <div className="mt-4 flex items-center justify-between p-4 bg-neutral-50 rounded-xl border-2 border-neutral-100 relative z-50">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-red-100 text-red-600 p-2.5 rounded-xl">
                                                <FileText size={20} />
                                            </div>
                                            <div>
                                                {/* Resolve relative resume urls to backend origin if needed */}
                                                <a href={resumeUrl.startsWith('/') ? `${API_BASE}${resumeUrl}` : resumeUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-neutral-900 underline">View Resume</a>
                                                <p className="text-xs text-neutral-500 font-medium">PDF • Uploaded</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                            )}


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
                                            className="w-full h-3 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-900 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-neutral-900 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md"
                                            style={{
                                                background: `linear-gradient(to right, ${isDaily ? '#10b981' : '#d97706'} 0%, ${isDaily ? '#10b981' : '#d97706'} ${((radius - 5) / 95) * 100}%, #e5e7eb ${((radius - 5) / 95) * 100}%, #e5e7eb 100%)`
                                            }}
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
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={savingProfile}
                                    className="px-8 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 disabled:opacity-60 text-white font-semibold text-sm transition-all"
                                >
                                    {savingProfile ? 'Saving...' : 'Save Changes'}
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
