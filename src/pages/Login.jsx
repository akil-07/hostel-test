import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Zap, Smartphone, Key } from 'lucide-react';
import { auth } from '../lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

const Login = () => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState('phone'); // phone, otp
    const [confirmObj, setConfirmObj] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const setupRecaptcha = () => {
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible'
            });
        }
    };

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Fallback for demo if Firebase keys aren't set
        if (!auth || !auth.app.options.apiKey || auth.app.options.apiKey === "YOUR_API_KEY") {
            setTimeout(() => {
                setConfirmObj({ confirm: async (code) => { if (code === '123456') return true; throw new Error('Invalid code'); } });
                setStep('otp');
                setLoading(false);
                // Alerting only for clarity in demo
                console.log("DEMO MODE: OTP is 123456");
            }, 1000);
            return;
        }

        try {
            setupRecaptcha();

            // Format phone number: Remove spaces and ensure +91
            let formattedPhone = phone.replace(/\s+/g, '');
            if (!formattedPhone.startsWith('+')) {
                formattedPhone = '+91' + formattedPhone;
            }

            const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
            setConfirmObj(confirmationResult);
            setStep('otp');
        } catch (error) {
            console.error(error);
            alert("Error sending OTP: " + (error.message || "Unknown error"));
        }
        setLoading(false);
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // In a real app we would check backend admin claim, but for demo we trust local state or DB
            if (confirmObj) await confirmObj.confirm(otp);

            localStorage.setItem('user', JSON.stringify({ phone, role: isAdmin ? 'admin' : 'user' }));
            navigate(isAdmin ? '/admin' : '/menu');
        } catch (error) {
            console.error(error);
            alert("Invalid OTP or Verification Failed");
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

                {step === 'phone' ? (
                    <form onSubmit={handleSendOtp} className="input-group">
                        <label className="label">Phone Number / Email</label>
                        <div style={{ position: 'relative' }}>
                            <Smartphone size={20} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                className="input"
                                style={{ paddingLeft: '40px' }}
                                placeholder="+91 98765 43210"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                            />
                        </div>
                        <div id="recaptcha-container"></div>
                        <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }} disabled={loading}>
                            {loading ? 'Sending...' : 'Get OTP'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp} className="input-group">
                        <label className="label">Enter OTP</label>
                        <div style={{ position: 'relative' }}>
                            <Key size={20} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                className="input"
                                style={{ paddingLeft: '40px' }}
                                placeholder="123456"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }} disabled={loading}>
                            {loading ? 'Verifying...' : 'Verify & Login'}
                        </button>
                        <button type="button" className="btn btn-outline" style={{ marginTop: '0.5rem', width: '100%' }} onClick={() => setStep('phone')}>
                            Back
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Login;
