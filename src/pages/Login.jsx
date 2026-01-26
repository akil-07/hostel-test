import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Zap, Smartphone, Key } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const Login = () => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            if (user) {
                // Check for admin email (Simple hardcoded check for security)
                if (isAdmin && user.email !== "hosteladmin@example.com") { // Replace with your admin email
                    alert("Access Denied: You are not an admin.");
                    await auth.signOut();
                    setLoading(false);
                    return;
                }

                // Check Firestore for user profile
                if (!isAdmin) {
                    const userDoc = await import('firebase/firestore').then(mod => mod.getDoc(mod.doc(db, "users", user.uid)));

                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        localStorage.setItem('user', JSON.stringify({ ...userData, email: user.email, role: 'user', uid: user.uid, photo: user.photoURL }));
                        navigate('/menu');
                    } else {
                        // Create basic profile
                        localStorage.setItem('user', JSON.stringify({
                            name: user.displayName,
                            email: user.email,
                            role: 'user',
                            uid: user.uid,
                            photo: user.photoURL
                        }));
                        navigate('/menu'); // Or '/create-account' if you want room number first
                    }
                } else {
                    localStorage.setItem('user', JSON.stringify({ email: user.email, role: 'admin', uid: user.uid }));
                    navigate('/admin');
                }
            }
        } catch (error) {
            console.error(error);
            alert("Google Login Failed: " + error.message);
        }
        setLoading(false);
    };

    return (
        <div className="flex-center" style={{ minHeight: '100vh', padding: '1rem' }}>
            <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
                <div className="flex-center flex-col" style={{ marginBottom: '2rem' }}>
                    <Zap size={48} color="var(--primary)" />
                    <h1 className="text-gradient" style={{ fontSize: '2rem', fontWeight: 'bold' }}>Hostel Bites</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Premium Food & Snacks</p>
                </div>

                <div className="flex-center" style={{ marginBottom: '1.5rem', gap: '1rem' }}>
                    <button
                        className={`btn ${!isAdmin ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setIsAdmin(false)}
                    >
                        User Login
                    </button>
                    <button
                        className={`btn ${isAdmin ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setIsAdmin(true)}
                    >
                        <Shield size={16} /> Admin
                    </button>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    className="btn btn-secondary"
                    style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', fontSize: '1rem' }}
                    disabled={loading}
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="24" height="24" alt="Google" />
                    {loading ? 'Signing in...' : 'Sign in with Google'}
                </button>
            </div>
        </div>
    );
};

export default Login;
