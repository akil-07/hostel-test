import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Shield, Zap, Smartphone, Key } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore'; // Import needed Firestore functions

const Login = () => {
    const [isSignUp, setIsSignUp] = useState(false); // Toggle between Login and Sign Up
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(false);

    // Sign Up Fields
    const [room, setRoom] = useState('');
    const [phone, setPhone] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        // Auto-redirect if already logged in
        const savedUser = JSON.parse(localStorage.getItem('user'));
        if (savedUser && savedUser.uid) {
            // FIX: Auto-correct role if email matches admin
            if (savedUser.email === "akilsudhagar7@gmail.com" && savedUser.role !== 'admin') {
                const updatedUser = { ...savedUser, role: 'admin' };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                toast.success("Admin privileges restored.");
                navigate('/admin');
                return;
            }

            if (savedUser.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/menu');
            }
        }
    }, [navigate]);

    const handleGoogleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Basic Validation for Sign Up
        if (isSignUp && (!room || !phone)) {
            toast.error("Please fill in Room Number and Phone Number first.");
            setLoading(false);
            return;
        }

        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            if (user) {
                // --- AUTO ADMIN CHECK ---
                // If it's the master admin email, always log in as admin regardless of toggle or mode
                if (user.email === "akilsudhagar7@gmail.com") {
                    localStorage.setItem('user', JSON.stringify({
                        email: user.email,
                        role: 'admin',
                        uid: user.uid,
                        name: user.displayName,
                        photo: user.photoURL
                    }));
                    toast.success("Welcome back, Admin!");
                    navigate('/admin');
                    setLoading(false);
                    return;
                }

                // --- ADMIN TOGGLE FLOW (For other potential admins) ---
                if (!isSignUp && isAdmin) {
                    toast.error("Access Denied: You are not an admin.");
                    await auth.signOut();
                    setLoading(false);
                    return;
                }

                // --- USER FLOW ---
                const userRef = doc(db, "users", user.uid);
                const userDoc = await getDoc(userRef);

                if (isSignUp) {
                    // CREATE ACCOUNT
                    if (userDoc.exists()) {
                        toast.success("Account already exists! Logging you in...");
                    } else {
                        // Create New User Profile in Firestore
                        await setDoc(userRef, {
                            name: user.displayName,
                            email: user.email,
                            photo: user.photoURL,
                            room: room,
                            phone: phone,
                            role: 'user',
                            createdAt: new Date()
                        });
                    }
                    // Save to local for session
                    const userData = { name: user.displayName, email: user.email, photo: user.photoURL, room, phone, role: 'user', uid: user.uid };
                    localStorage.setItem('user', JSON.stringify(userData));
                    navigate('/menu');

                } else {
                    // LOGIN
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        localStorage.setItem('user', JSON.stringify({ ...userData, uid: user.uid }));
                        navigate('/menu');
                    } else {
                        toast.error("Account not found! Please Create an Account first.");
                        setIsSignUp(true); // Switch to Sign Up tab
                    }
                }
            }
        } catch (error) {
            console.error(error);
            toast.error("Authentication Failed: " + error.message);
        }
        setLoading(false);
    };

    return (
        <div className="flex-center" style={{ minHeight: '100vh', padding: '1rem' }}>
            <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
                <div className="flex-center flex-col" style={{ marginBottom: '2rem' }}>
                    <Zap size={48} color="var(--primary)" />
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', fontStyle: 'italic', letterSpacing: '-1px', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Hostel Bites</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Premium Food & Snacks</p>
                </div>

                {/* Login / Sign Up Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                    <button
                        style={{ flex: 1, padding: '1rem', borderBottom: !isSignUp ? '3px solid var(--primary)' : '1px solid var(--border)', fontWeight: !isSignUp ? 'bold' : '500', color: !isSignUp ? 'var(--primary)' : 'var(--text-muted)', background: 'transparent', cursor: 'pointer', transition: 'all 0.2s' }}
                        onClick={() => setIsSignUp(false)}
                    >
                        Login
                    </button>
                    <button
                        style={{ flex: 1, padding: '1rem', borderBottom: isSignUp ? '3px solid var(--primary)' : '1px solid var(--border)', fontWeight: isSignUp ? 'bold' : '500', color: isSignUp ? 'var(--primary)' : 'var(--text-muted)', background: 'transparent', cursor: 'pointer', transition: 'all 0.2s' }}
                        onClick={() => setIsSignUp(true)}
                    >
                        Create Account
                    </button>
                </div>

                {/* Admin Toggle (Only visible in Login Mode) */}
                {!isSignUp && (
                    <div className="flex-center" style={{ marginBottom: '1.5rem', gap: '1rem' }}>
                        <button
                            className={`btn ${!isAdmin ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setIsAdmin(false)}
                            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                        >
                            Student
                        </button>
                        <button
                            className={`btn ${isAdmin ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setIsAdmin(true)}
                            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                        >
                            Admin
                        </button>
                    </div>
                )}

                {/* Sign Up Form Inputs */}
                {isSignUp && (
                    <div className="flex-col animate-fade-in" style={{ gap: '1rem', marginBottom: '1rem' }}>
                        <div className="input-group">
                            <label className="label">Room Number</label>
                            <input
                                className="input"
                                placeholder="e.g. A-101"
                                value={room}
                                onChange={(e) => setRoom(e.target.value)}
                            />
                        </div>
                        <div className="input-group">
                            <label className="label">Phone Number</label>
                            <input
                                className="input"
                                placeholder="e.g. 9876543210"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                <button
                    onClick={handleGoogleAuth}
                    className="btn btn-secondary"
                    style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', fontSize: '1rem' }}
                    disabled={loading}
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="24" height="24" alt="Google" />
                    {loading ? 'Processing...' : (isSignUp ? 'Sign Up with Google' : (isAdmin ? 'Admin Login' : 'Login with Google'))}
                </button>
            </div>
        </div>
    );
};

export default Login;
