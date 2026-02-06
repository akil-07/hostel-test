import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { User, Home, Building, Save } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

const CreateAccount = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        roomNo: '',
        hostelBlock: '',
        phone: ''
    });

    useEffect(() => {
        // Retrieve phone from localStorage if available, or auth
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser && storedUser.phone) {
            setFormData(prev => ({ ...prev, phone: storedUser.phone }));
        } else if (auth.currentUser && auth.currentUser.phoneNumber) {
            setFormData(prev => ({ ...prev, phone: auth.currentUser.phoneNumber }));
        }
    }, []);


    const hostelOptions = [
        "Annex Hostel (1st years)",
        "Noyyal Hostel (SEC, SIMATS)",
        "Pornai Hostel (Girls)",
        "Vaigai Hostel (Boys, SIMATS)",
        "Krishna Hostel (Girls, SIMATS)"
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const user = auth.currentUser;
            if (!user && !formData.phone) { // Fallback if auth is not ready but we have phone in form
                throw new Error("No authenticated user found. Please login again.");
            }

            const uid = user ? user.uid : formData.phone; // Use phone as ID if UID not available (e.g. demo mode)

            // Save to Firestore
            await setDoc(doc(db, "users", uid), {
                ...formData,
                role: 'user', // Default role
                createdAt: new Date().toISOString()
            });

            // Update local storage
            const updatedUserUser = { ...formData, role: 'user', uid };
            localStorage.setItem('user', JSON.stringify(updatedUserUser));

            // Navigate to user menu
            navigate('/menu');
        } catch (error) {
            console.error("Error creating account:", error);
            toast.error("Failed to create account. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-center" style={{ minHeight: '100vh', padding: '1rem', backgroundColor: 'var(--bg-body)' }}>
            <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
                <div className="flex-center flex-col" style={{ marginBottom: '2rem' }}>
                    <h1 className="text-gradient" style={{ fontSize: '2rem', fontWeight: 'bold' }}>Create Account</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Complete your profile to continue</p>
                </div>

                <form onSubmit={handleSubmit} className="input-group">
                    {/* Name Field */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label className="label">Full Name</label>
                        <div style={{ position: 'relative' }}>
                            <User size={20} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                className="input"
                                style={{ paddingLeft: '40px' }}
                                placeholder="John Doe"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    {/* Room No Field */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label className="label">Room No</label>
                        <div style={{ position: 'relative' }}>
                            <Home size={20} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                className="input"
                                style={{ paddingLeft: '40px' }}
                                placeholder="101"
                                value={formData.roomNo}
                                onChange={(e) => setFormData({ ...formData, roomNo: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    {/* Hostel Block Selection */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label className="label">Hostel Block</label>
                        <div style={{ position: 'relative' }}>
                            <Building size={20} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} />
                            <select
                                className="input"
                                style={{ paddingLeft: '40px', appearance: 'none', cursor: 'pointer', background: 'var(--bg-card)' }}
                                value={formData.hostelBlock}
                                onChange={(e) => setFormData({ ...formData, hostelBlock: e.target.value })}
                                required
                            >
                                <option value="" disabled>Select Block</option>
                                {hostelOptions.map((opt, idx) => (
                                    <option key={idx} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Mobile No (Read Only) */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label className="label">Mobile Number</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                className="input"
                                value={formData.phone}
                                readOnly
                                disabled
                                style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Creating Profile...' : (
                            <><Save size={18} style={{ marginRight: '8px' }} /> Save & Continue</>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CreateAccount;
