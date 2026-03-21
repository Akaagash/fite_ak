import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IndianRupee } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ApplyJob: React.FC = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();
    const [job, setJob] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const [offeredPrice, setOfferedPrice] = useState('');
    const [coverLetter, setCoverLetter] = useState('');
    const { user, checkAuth } = useAuth();
    const [profile, setProfile] = useState<any | null>(null);
    const [applicantName, setApplicantName] = useState('');
    const [applicantContact, setApplicantContact] = useState('');
    const [appliedPosition, setAppliedPosition] = useState('');
    const [earliestStartDate, setEarliestStartDate] = useState('');
    const [preferredInterviewDate, setPreferredInterviewDate] = useState('');
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [resumeUrlState, setResumeUrlState] = useState<string | null>(null);
    // Fetch full user profile (with resume, skills, etc)
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('http://localhost:8000/api/auth/me', { credentials: 'include' });
                if (!res.ok) return;
                const data = await res.json();
                setProfile(data.user);
                setApplicantName(data.user?.full_name || '');
                setApplicantContact(data.user?.email || data.user?.phone || '');
                setResumeUrlState(data.user?.resume_url || null);
            } catch (e) {
                setProfile(null);
            }
        })();
    }, []);

    useEffect(() => {
        if (!jobId) return;
        (async () => {
            try {
                const res = await fetch(`http://localhost:8000/api/jobs/${jobId}` , { credentials: 'include' });
                if (!res.ok) return;
                const data = await res.json();
                setJob(data.job);
            } catch (e) {
                console.error(e);
            }
        })();
    }, [jobId]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!jobId || !job) return;
        setLoading(true);
        try {
            const payload: any = {
                job_id: jobId,
                job_type: job.job_type === 'long_term' ? 'longterm' : 'daily',
                applicant_name: applicantName || undefined,
                applicant_contact: applicantContact || undefined,
                applied_position: appliedPosition || undefined,
                earliest_start_date: earliestStartDate || undefined,
                preferred_interview_date: preferredInterviewDate || undefined,
                resume_url: resumeUrlState || undefined,
            };

            if (payload.job_type === 'daily') payload.offered_price = Number(offeredPrice) || undefined;
            if (payload.job_type === 'longterm') payload.cover_letter = coverLetter || undefined;

            const res = await fetch('http://localhost:8000/api/applications/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Failed to apply');

            // Redirect to applied jobs list
            navigate('/applied-jobs');
        } catch (err: any) {
            alert(err.message || 'Could not apply to this job');
        } finally {
            setLoading(false);
        }
    };

    const handleResumeUpload = async (file: File) => {
        const fd = new FormData();
        fd.append('file', file);
        try {
            const res = await fetch('http://localhost:8000/api/auth/upload-resume', {
                method: 'POST',
                credentials: 'include',
                body: fd,
            });
            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();
            setResumeUrlState(data.resume_url || null);
            // Refresh profile/auth context so UI shows updated resume link
            try {
                await checkAuth();
                // fetch latest profile to update local profile state immediately
                const me = await fetch('http://localhost:8000/api/auth/me', { credentials: 'include' });
                if (me.ok) {
                    const meData = await me.json();
                    setProfile(meData.user);
                }
            } catch (e) {
                // ignore
            }
            alert('Resume uploaded');
        } catch (err: any) {
            alert(err.message || 'Failed to upload resume');
        }
    };

    if (!job) {
        return <div className="p-6">Loading job...</div>;
    }

    const BACKEND_BASE = 'http://localhost:8000';

    const resolveResumeHref = (url: string | undefined | null) => {
        if (!url) return null;
        try {
            // if absolute URL, return as-is
            const u = new URL(url);
            return u.toString();
        } catch (e) {
            // relative path - assume backend static mount
            if (url.startsWith('/')) return `${BACKEND_BASE}${url}`;
            return `${BACKEND_BASE}/${url}`;
        }
    };

    return (
        <div className="p-6 max-w-3xl mx-auto relative z-[200]">
            {/* User Profile Card */}
            {profile && (
                <div className="rounded-2xl bg-white border p-6 shadow-sm mb-6">
                    <h3 className="text-lg font-bold mb-1">Your Profile</h3>
                    <div className="text-sm text-neutral-700 mb-1">{profile.full_name || profile.email}</div>
                    <div className="text-xs text-neutral-500 mb-1">{profile.email}</div>
                    {profile.skills && profile.skills.length > 0 && (
                        <div className="mb-1"><span className="font-semibold">Skills:</span> {profile.skills.join(', ')}</div>
                    )}
                    {profile.experience && (
                        <div className="mb-1"><span className="font-semibold">Experience:</span> {profile.experience}</div>
                    )}
                    {profile.resume_url && (
                        <div className="mb-1"><span className="font-semibold">Resume:</span> <a href={profile.resume_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View Resume</a></div>
                    )}
                </div>
            )}

            {/* Job Card */}
            <div className="rounded-2xl bg-white border p-6 shadow-sm mb-6">
                <h2 className="text-2xl font-bold mb-1">{job.title}</h2>
                <p className="text-sm text-neutral-600 mb-2">{job.employer_name || job.employer} • {job.location?.address || job.location || 'Remote'}</p>
                <div className="flex items-center gap-4 text-sm text-neutral-700">
                    <div className="inline-flex items-center gap-2"><IndianRupee size={16} /> <span className="font-medium">{job.salary?.amount ? `₹${Number(job.salary.amount).toLocaleString('en-IN')} ${job.salary.period === 'yearly' ? 'LPA' : ''}` : (job.pay || '')}</span></div>
                    <div className="inline-flex items-center gap-2">{job.time || ''}</div>
                </div>
            </div>

            <form onSubmit={submit} className="space-y-4 bg-white rounded-2xl p-6 border shadow-sm relative z-[210]" style={{ pointerEvents: 'auto' }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">Full Name</label>
                        <input value={applicantName} onChange={(e) => setApplicantName(e.target.value)} type="text" className="w-full px-3 py-2 border rounded-lg relative z-[210] text-neutral-900 bg-white placeholder:text-neutral-400" placeholder="Your full name" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">Email / Contact</label>
                        <input value={applicantContact} onChange={(e) => setApplicantContact(e.target.value)} type="text" className="w-full px-3 py-2 border rounded-lg relative z-[210] text-neutral-900 bg-white placeholder:text-neutral-400" placeholder="Email or phone" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">Applied Position</label>
                        <input value={appliedPosition} onChange={(e) => setAppliedPosition(e.target.value)} type="text" className="w-full px-3 py-2 border rounded-lg relative z-[210] text-neutral-900 bg-white placeholder:text-neutral-400" placeholder="Position / Title" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">Earliest Start Date</label>
                        <input value={earliestStartDate} onChange={(e) => setEarliestStartDate(e.target.value)} type="date" className="w-full px-3 py-2 border rounded-lg relative z-[210] text-neutral-900 bg-white placeholder:text-neutral-400" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">Preferred Interview Date</label>
                        <input value={preferredInterviewDate} onChange={(e) => setPreferredInterviewDate(e.target.value)} type="date" className="w-full px-3 py-2 border rounded-lg relative z-[210] text-neutral-900 bg-white placeholder:text-neutral-400" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">Resume</label>
                        <div className="flex items-center gap-2">
                            <input type="file" accept="application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setResumeFile(f); handleResumeUpload(f); } }} className="relative z-50 text-sm text-neutral-900" />
                            {resumeUrlState && (
                                <a href={resolveResumeHref(resumeUrlState) || '#'} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">View Resume</a>
                            )}
                        </div>
                    </div>
                </div>

                {job.job_type !== 'long_term' ? (
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">Offered Price (₹)</label>
                        <input value={offeredPrice} onChange={(e) => setOfferedPrice(e.target.value)} type="number" className="w-full px-3 py-2 border rounded-lg text-neutral-900 bg-white placeholder:text-neutral-400" placeholder="Enter your expected price" />
                    </div>
                ) : (
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">Cover Letter</label>
                        <textarea value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} rows={8} className="w-full px-3 py-2 border rounded-lg text-neutral-900 bg-white placeholder:text-neutral-400" placeholder="Write a short cover note" />
                    </div>
                )}

                <div className="flex items-center gap-3 mt-2">
                    <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-neutral-900 text-white">
                        {loading ? 'Applying...' : 'Submit Application'}
                    </button>
                    <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg border">Back</button>
                </div>
            </form>
        </div>
    );
};

export default ApplyJob;
