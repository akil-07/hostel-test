import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { UtensilsCrossed, ShoppingBag, Leaf } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import ThemeToggle from '../components/ThemeToggle';

const Login = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [room, setRoom] = useState('');
    const [phone, setPhone] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const savedUser = JSON.parse(localStorage.getItem('user'));
        if (savedUser && savedUser.uid) {
            if (savedUser.email === "apavithrakannan@saveetha.ac.in" && savedUser.role !== 'admin') {
                const updatedUser = { ...savedUser, role: 'admin' };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                navigate('/admin');
                return;
            }
            if (savedUser.role === 'admin') navigate('/admin');
            else navigate('/menu');
        }
    }, [navigate]);

    const handleGoogleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);

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
                if (user.email === "apavithrakannan@saveetha.ac.in") {
                    localStorage.setItem('user', JSON.stringify({
                        email: user.email, role: 'admin', uid: user.uid,
                        name: user.displayName, photo: user.photoURL
                    }));
                    toast.success("Welcome back, Admin!");
                    navigate('/admin');
                    setLoading(false);
                    return;
                }

                const userRef = doc(db, "users", user.uid);
                const userDoc = await getDoc(userRef);

                if (isSignUp) {
                    if (userDoc.exists()) {
                        toast.success("Account already exists! Logging you in...");
                        const userData = userDoc.data();
                        localStorage.setItem('user', JSON.stringify({ ...userData, uid: user.uid }));
                        navigate(userData.role === 'admin' ? '/admin' : '/menu');
                    } else {
                        await setDoc(userRef, {
                            name: user.displayName, email: user.email,
                            photo: user.photoURL, room, phone,
                            role: 'user', createdAt: new Date()
                        });
                        const userData = { name: user.displayName, email: user.email, photo: user.photoURL, room, phone, role: 'user', uid: user.uid };
                        localStorage.setItem('user', JSON.stringify(userData));
                        toast.success(`Welcome, ${user.displayName}! 🎉`);
                        navigate('/menu');
                    }
                } else {
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        localStorage.setItem('user', JSON.stringify({ ...userData, uid: user.uid }));
                        toast.success(`Welcome back, ${userData.name || 'User'}!`);
                        navigate(userData.role === 'admin' ? '/admin' : '/menu');
                    } else {
                        toast.error("Account not found! Please create an account first.");
                        setIsSignUp(true);
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
        <div style={{ minHeight: '100vh', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>

            {/* BigBasket-style Top Bar */}
            <div style={{
                background: 'var(--header-bg)',
                padding: '0.9rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <img src="/sec-logo.png" alt="2-Minutes Bites" style={{ height: '40px', width: 'auto', objectFit: 'contain', borderRadius: '8px' }} />
                </div>
                <ThemeToggle />
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
                <div style={{ width: '100%', maxWidth: '420px' }}>

                    {/* Hero Section */}
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <img src="/sec-logo.png" alt="2-Minutes Bites" style={{ height: '72px', width: 'auto', objectFit: 'contain' }} />
                        </div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.4rem', letterSpacing: '-0.5px' }}>
                            {isSignUp ? 'Create your account' : 'Welcome back!'}
                        </h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                            {isSignUp ? 'Join and start ordering from your hostel' : 'Sign in to continue ordering'}
                        </p>
                    </div>

                    {/* Card */}
                    <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>

                        {/* Tab Switcher */}
                        <div style={{ display: 'flex', borderBottom: '2px solid var(--border)' }}>
                            {['Login', 'Create Account'].map((label, i) => {
                                const active = i === 0 ? !isSignUp : isSignUp;
                                return (
                                    <button
                                        key={label}
                                        onClick={() => setIsSignUp(i === 1)}
                                        style={{
                                            flex: 1, padding: '1rem', background: 'transparent', border: 'none', cursor: 'pointer',
                                            fontWeight: active ? 800 : 500, fontSize: '0.95rem',
                                            color: active ? 'var(--primary-dark)' : 'var(--text-muted)',
                                            borderBottom: active ? '3px solid var(--primary)' : '3px solid transparent',
                                            transition: 'all 0.2s', marginBottom: '-2px'
                                        }}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>

                        <div style={{ padding: '1.8rem' }}>
                            {/* Sign Up Extra Fields */}
                            {isSignUp && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }} className="animate-fade-in">
                                    <div>
                                        <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>Room Number</label>
                                        <input
                                            className="input"
                                            placeholder="e.g. A-101"
                                            value={room}
                                            onChange={e => setRoom(e.target.value)}
                                            style={{ borderRadius: '10px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>Phone Number</label>
                                        <input
                                            className="input"
                                            placeholder="e.g. 9876543210"
                                            type="tel"
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                            style={{ borderRadius: '10px' }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Google Auth Button */}
                            <button
                                onClick={handleGoogleAuth}
                                disabled={loading}
                                style={{
                                    width: '100%', padding: '0.9rem 1rem',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem',
                                    background: loading ? 'var(--bg-subtle)' : '#fff',
                                    border: '1.5px solid var(--border)',
                                    borderRadius: '9999px',
                                    fontWeight: 700, fontSize: '0.95rem',
                                    color: 'var(--text-main)',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {loading ? (
                                    <div className="spinner" />
                                ) : (
                                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="22" height="22" alt="Google" />
                                )}
                                {loading ? 'Please wait...' : (isSignUp ? 'Sign Up with Google' : 'Continue with Google')}
                            </button>

                            {/* Divider info */}
                            <div style={{ marginTop: '1.4rem', padding: '0.8rem', background: 'var(--bg-subtle)', borderRadius: '10px', display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                                <Leaf size={16} color="var(--primary-dark)" style={{ marginTop: '2px', flexShrink: 0 }} />
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                    {isSignUp
                                        ? 'We use your Google account to create a secure profile. Your room and phone number help us deliver to the right place.'
                                        : 'Your account must be registered first. If you are new, switch to "Create Account" tab.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer note */}
                    <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        By continuing, you agree to our Terms & Privacy Policy
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
