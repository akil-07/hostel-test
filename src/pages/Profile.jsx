import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, MapPin, LogOut, Camera, ChevronRight, CreditCard, ShoppingBag, Calendar, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { auth, db, storage } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signOut } from 'firebase/auth';

const Profile = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [userData, setUserData] = useState({
        name: '',
        email: '',
        phone: '',
        roomNo: '',
        hostelBlock: '',
        photoURL: ''
    });

    const [isEditingAddress, setIsEditingAddress] = useState(false);

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        // 1. Try Local Storage first
        const localUser = JSON.parse(localStorage.getItem('user') || '{}');
        setUserData(prev => ({ ...prev, ...localUser }));

        // 2. Fetch latest from Firestore
        if (localUser.uid) {
            try {
                const docRef = doc(db, "users", localUser.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const firestoreData = docSnap.data();
                    setUserData(prev => ({ ...prev, ...firestoreData }));
                    // Update local storage to keep it fresh
                    localStorage.setItem('user', JSON.stringify({ ...localUser, ...firestoreData }));
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        }
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validations
        if (!file.type.startsWith('image/')) {
            toast.error("Please select an image file");
            return;
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast.error("Image size should be less than 5MB");
            return;
        }

        try {
            setUploading(true);
            const user = auth.currentUser;
            const uid = user ? user.uid : userData.uid;

            if (!uid) {
                toast.error("User ID not found");
                return;
            }

            const storageRef = ref(storage, `profile_photos/${uid}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            // Update Firestore
            await updateDoc(doc(db, "users", uid), {
                photoURL: downloadURL
            });

            // Update State & Local Storage
            const updatedUser = { ...userData, photoURL: downloadURL };
            setUserData(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser)); // Fix: use updatedUser here

            toast.success("Profile picture updated!");

        } catch (error) {
            console.error(error);
            toast.error("Failed to upload image");
        } finally {
            setUploading(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            localStorage.removeItem('user');
            navigate('/');
            toast.success("Signed out successfully");
        } catch (error) {
            toast.error("Error signing out");
        }
    };

    const handleSaveAddress = async () => {
        if (!userData.roomNo || !userData.hostelBlock) {
            toast.error("Please fill all address fields");
            return;
        }
        setLoading(true);
        try {
            const uid = auth.currentUser?.uid || userData.uid;
            if (uid) {
                await updateDoc(doc(db, "users", uid), {
                    roomNo: userData.roomNo,
                    hostelBlock: userData.hostelBlock
                });

                // Update Local Storage
                localStorage.setItem('user', JSON.stringify(userData));

                setIsEditingAddress(false);
                toast.success("Address updated successfully");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to update address");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-body)', color: 'var(--text-main)' }}>
            {/* Header */}
            <div className="container" style={{ paddingTop: '1rem', paddingBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{ background: 'var(--bg-subtle)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-main)' }}
                >
                    <ArrowLeft size={20} />
                </button>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Profile Settings</h2>
                <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--danger)', borderRadius: '50%', color: 'white' }}>
                    <AlertCircle size={20} />
                </div>
            </div>

            <div className="container animate-fade-in" style={{ paddingBottom: '2rem' }}>

                {/* Profile Avatar Section */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '2rem 0' }}>
                    <div style={{ position: 'relative' }}>
                        <div style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            border: '4px solid var(--bg-surface)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            background: 'var(--bg-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {userData.photoURL ? (
                                <img src={userData.photoURL} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <User size={50} color="var(--text-muted)" />
                            )}
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            style={{
                                position: 'absolute',
                                bottom: '5px',
                                right: '5px',
                                background: 'var(--bg-surface)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                cursor: 'pointer'
                            }}
                        >
                            {uploading ? (
                                <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid var(--border)', borderTopColor: 'var(--text-main)' }}></div>
                            ) : (
                                <Camera size={18} color="var(--primary)" />
                            )}
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept="image/*"
                            onChange={handleFileSelect}
                        />
                    </div>

                    <h3 style={{ marginTop: '1rem', fontSize: '1.4rem', fontWeight: 800 }}>{userData.name || 'User'}</h3>
                    <button className="btn btn-ghost" style={{ fontSize: '0.9rem', color: 'var(--primary)', padding: '0.2rem 0.5rem' }}>
                        View activity
                    </button>
                </div>

                {/* Menu List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    {/* Payments */}
                    <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '16px', border: 'none', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ background: 'rgba(25, 118, 210, 0.1)', padding: '10px', borderRadius: '50%', color: '#1976d2' }}>
                                <CreditCard size={20} />
                            </div>
                            <span style={{ fontWeight: 600 }}>Payments</span>
                        </div>
                        <ChevronRight size={20} color="var(--text-muted)" />
                    </div>

                    {/* Profile Settings / Address */}
                    <div className="card" style={{ padding: '0', borderRadius: '16px', border: 'none', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                        <div
                            style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                            onClick={() => setIsEditingAddress(!isEditingAddress)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ background: 'rgba(0, 150, 136, 0.1)', padding: '10px', borderRadius: '50%', color: '#009688' }}>
                                    <MapPin size={20} />
                                </div>
                                <div className="flex-col">
                                    <span style={{ fontWeight: 600 }}>Modify Address</span>
                                </div>
                            </div>
                            <ChevronRight size={20} color="var(--text-muted)" style={{ transform: isEditingAddress ? 'rotate(90deg)' : 'rotate(0deg)', transition: '0.3s' }} />
                        </div>

                        {/* Expandable Address Form */}
                        {isEditingAddress && (
                            <div style={{ padding: '0 1rem 1.5rem', background: 'var(--bg-subtle)' }}>
                                <div style={{ marginTop: '1rem' }}>
                                    <label className="label" style={{ fontSize: '0.85rem' }}>Room Number</label>
                                    <input
                                        className="input"
                                        style={{ background: 'var(--bg-input)' }}
                                        value={userData.roomNo}
                                        onChange={(e) => setUserData({ ...userData, roomNo: e.target.value })}
                                        placeholder="Room No"
                                    />
                                </div>
                                <div style={{ marginTop: '1rem' }}>
                                    <label className="label" style={{ fontSize: '0.85rem' }}>Hostel Block</label>
                                    <select
                                        className="input"
                                        style={{ background: 'var(--bg-input)' }}
                                        value={userData.hostelBlock}
                                        onChange={(e) => setUserData({ ...userData, hostelBlock: e.target.value })}
                                    >
                                        <option value="" disabled>Select Block</option>
                                        <option value="Annex Hostel (1st years)">Annex Hostel (1st years)</option>
                                        <option value="Noyyal Hostel (SEC, SIMATS)">Noyyal Hostel (SEC, SIMATS)</option>
                                        <option value="Pornai Hostel (Girls)">Pornai Hostel (Girls)</option>
                                        <option value="Vaigai Hostel (Boys, SIMATS)">Vaigai Hostel (Boys, SIMATS)</option>
                                        <option value="Krishna Hostel (Girls, SIMATS)">Krishna Hostel (Girls, SIMATS)</option>
                                    </select>
                                </div>
                                <button
                                    className="btn btn-primary btn-sm"
                                    style={{ marginTop: '1rem', width: '100%' }}
                                    onClick={handleSaveAddress}
                                    disabled={loading}
                                >
                                    {loading ? 'Saving...' : 'Save Address'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Order History */}
                    <div
                        className="card"
                        style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '16px', border: 'none', boxShadow: 'var(--shadow-sm)', cursor: 'pointer' }}
                        onClick={() => navigate('/orders')}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ background: 'rgba(56, 142, 60, 0.1)', padding: '10px', borderRadius: '50%', color: '#388e3c' }}>
                                <ShoppingBag size={20} />
                            </div>
                            <span style={{ fontWeight: 600 }}>Order History</span>
                        </div>
                        <ChevronRight size={20} color="var(--text-muted)" />
                    </div>


                    {/* Booking (Placeholder) */}
                    <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '16px', border: 'none', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ background: 'rgba(245, 124, 0, 0.1)', padding: '10px', borderRadius: '50%', color: '#f57c00' }}>
                                <Calendar size={20} />
                            </div>
                            <span style={{ fontWeight: 600 }}>Booking</span>
                        </div>
                        <ChevronRight size={20} color="var(--text-muted)" />
                    </div>

                </div>

                {/* Switch Account (Sign Out) Button */}
                <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'center' }}>
                    <button
                        onClick={handleSignOut}
                        className="btn"
                        style={{
                            background: 'var(--bg-surface)',
                            color: 'var(--text-main)',
                            border: '1px solid var(--border)',
                            padding: '0.8rem 2rem',
                            borderRadius: '50px',
                            fontWeight: 600,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                        }}
                    >
                        Sign Out
                    </button>
                    {/* Note: Simply Signing out acts as "Switch Account" since next user can login */}
                </div>

            </div>
        </div>
    );
};

export default Profile;
