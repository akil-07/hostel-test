import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';

import ThemeToggle from '../components/ThemeToggle';
import { ShoppingBag, Plus, Minus, Search, Clock, Calendar, MapPin, User, MessageSquare, X, Building, TrendingUp, Filter, Bell, Zap, Home } from 'lucide-react';
import { subscribeToNotifications } from '../lib/notifications';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, addDoc, updateDoc, doc, increment, getDoc, query, where, orderBy, limit, setDoc } from 'firebase/firestore';
import { API_URL } from '../config';

const UserMenu = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [cart, setCart] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [recentItems, setRecentItems] = useState([]);
    const [sortBy, setSortBy] = useState('relevant'); // relevant, sales, priceLow, priceHigh
    const [paymentLoading, setPaymentLoading] = useState(false);

    const [userPhoto, setUserPhoto] = useState(null);

    // Notification State
    const [notiEnabled, setNotiEnabled] = useState(false);

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            navigator.serviceWorker.ready.then(registration => {
                registration.pushManager.getSubscription().then(sub => {
                    if (sub) setNotiEnabled(true);
                });
            });
        }
    }, []);

    const handleEnableNotifications = async () => {
        try {
            await subscribeToNotifications();
            setNotiEnabled(true);
            toast.success("Notifications Enabled!");

            // Send test notification
            fetch(`${API_URL}/api/send-notification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: "Notifications Active", message: "You will receive updates here!" })
            });

        } catch (error) {
            console.error(error);
            toast.error("Could not enable notifications");
        }
    };

    // Checkout State
    const [showCheckout, setShowCheckout] = useState(false);
    const [showCartPreview, setShowCartPreview] = useState(false);
    const [orderDetails, setOrderDetails] = useState({
        name: '',
        room: '',
        hostelBlock: '',
        phone: '',
        date: new Date().toISOString().split('T')[0],
        time: '',
        notes: ''
    });

    useEffect(() => {
        fetchItems();
        // Load cached user details if available
        const savedUser = JSON.parse(localStorage.getItem('hostel_user_profile') || '{}');
        const authUser = JSON.parse(localStorage.getItem('user') || '{}');

        setOrderDetails(prev => ({
            ...prev,
            name: authUser.name || savedUser.name || '',
            room: authUser.roomNo || savedUser.room || '',
            hostelBlock: 'Saveetha Hostels',
            phone: authUser.phone || savedUser.phone || '',
            time: getCurrentTimePlus(30) // Default 30 mins from now
        }));
        if (authUser.photoURL) setUserPhoto(authUser.photoURL);
        fetchActiveOrder();
    }, []);

    const getCurrentTimePlus = (minutes) => {
        const d = new Date();
        d.setMinutes(d.getMinutes() + minutes);
        return d.toTimeString().slice(0, 5);
    };

    const [storeStatus, setStoreStatus] = useState({ status: 'now', message: '' });

    useEffect(() => {
        if (Object.keys(cart).length === 0 && showCartPreview) {
            setShowCartPreview(false);
        }
    }, [cart, showCartPreview]);

    useEffect(() => {
        // Fetch store status
        const fetchStatus = async () => {
            try {
                const docSnap = await getDoc(doc(db, "settings", "global"));
                if (docSnap.exists()) setStoreStatus(docSnap.data());
            } catch (e) {
                console.log("No store status");
            }
        };
        fetchStatus();
        fetchStatus();
        fetchItems();
        fetchCategories();
        fetchRecommendations();

        // Payment Callback check removed

    }, []);

    const fetchRecommendations = async () => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.phone) return;

        try {
            const q = query(
                collection(db, "orders"),
                where("userDetails.phone", "==", user.phone)
            );
            const snapshot = await getDocs(q);
            const itemMap = new Map();

            // Iterate orders to find unique items (most recent first if sorted, but we just take unique)
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.itemSnapshot) {
                    data.itemSnapshot.forEach(item => {
                        // Use Map to keep unique, overwriting with latest encounter if needed (though details mostly same)
                        if (!itemMap.has(item.id)) {
                            itemMap.set(item.id, item);
                        }
                    });
                }
            });
            setRecentItems(Array.from(itemMap.values()).slice(0, 4)); // Keep top 4 unique items
        } catch (e) {
            console.error("Error fetching recs", e);
        }
    };

    const [activeOrder, setActiveOrder] = useState(null);

    const fetchCategories = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "categories"));
            const catList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setCategories([{ id: 'all', name: 'All' }, ...catList]);
        } catch (error) {
            console.error("Error fetching categories", error);
        }
    };

    const fetchActiveOrder = async () => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.phone) return;

        try {
            const q = query(
                collection(db, "orders"),
                where("userDetails.phone", "==", user.phone),
                where("status", "in", ["pending", "accepted", "preparing", "ready", "dispatched"])
            );
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                // Get the most recent active order
                const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                orders.sort((a, b) => b.timestamp - a.timestamp);
                setActiveOrder(orders[0]);
            } else {
                setActiveOrder(null);
            }
        } catch (e) {
            console.error("Error fetching active order", e);
        }
    };

    const fetchItems = async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, "items"));
            const itemsList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setItems(itemsList);
            // toast.success(`Loaded ${itemsList.length} items`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load items: " + error.message);
        }
        setLoading(false);
    };

    // Top Selling Fetch Removed in favor of Client Side Sort (since we fetch all items anyway) or could sort there.
    // Given the small dataset, client side sort is fine.

    const addToCart = (id) => {
        setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    };

    const removeFromCart = (id) => {
        setCart(prev => {
            const newCount = (prev[id] || 0) - 1;
            if (newCount <= 0) {
                const newCart = { ...prev };
                delete newCart[id];
                return newCart;
            }
            return { ...prev, [id]: newCount };
        });
    };

    const getItemCount = (id) => cart[id] || 0;

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedCategory === 'All' || item.category === selectedCategory)
    ).sort((a, b) => {
        if (sortBy === 'sales') return (b.sales || 0) - (a.sales || 0);
        if (sortBy === 'priceLow') return Number(a.price) - Number(b.price);
        if (sortBy === 'priceHigh') return Number(b.price) - Number(a.price);
        return 0; // 'relevant' - default order
    });

    const calculateTotal = () => {
        return Object.entries(cart).reduce((total, [id, count]) => {
            const item = items.find(i => String(i.id) === String(id));
            if (!item) return total;
            return total + (Number(item.price) * count);
        }, 0);
    };

    const totalAmount = calculateTotal();
    const cartItemCount = Object.keys(cart).length;

    const handleInitialCheckout = () => {
        if (totalAmount === 0) return;
        setShowCheckout(true);
    };

    const [paymentMethod, setPaymentMethod] = useState('cod');

    const handlePayment = async () => {
        if (!orderDetails.name || !orderDetails.room || !orderDetails.hostelBlock || !orderDetails.time) {
            toast.error("Please fill in all required fields (Name, Room, Hostel Block, Delivery Time)");
            return;
        }

        // Show loading immediately for online payments
        if (paymentMethod === 'online') {
            setPaymentLoading(true);
        }

        // Save profile for future
        localStorage.setItem('hostel_user_profile', JSON.stringify({
            name: orderDetails.name,
            room: orderDetails.room,
            phone: orderDetails.phone
        }));

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const userId = user.uid || "user_" + Date.now();
        const orderId = "ORDER_" + Date.now();

        // Prepare Item Snapshot
        const itemSnapshot = Object.entries(cart).map(([id, count]) => {
            const i = items.find(x => String(x.id) === String(id));
            return { id, name: i?.name || 'Unknown Item', price: i?.price || 0, wholesalePrice: i?.wholesalePrice || 0, count };
        });

        // --- CASH ON DELIVERY FLOW ---
        if (paymentMethod === 'cod') {
            try {
                // Generate a random 4-digit OTP for delivery verification
                const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

                // CREATE ORDER IN FIRESTORE
                // Note: Ensure setDoc is imported from firebase/firestore
                await setDoc(doc(db, "orders", orderId), {
                    orderId: orderId,
                    userId: userId,
                    userDetails: orderDetails,
                    items: cart,
                    itemSnapshot: itemSnapshot,
                    totalAmount: totalAmount,
                    status: 'pending',
                    paymentMode: 'COD',
                    paymentStatus: 'Pending',
                    deliveryOtp: deliveryOtp,
                    timestamp: new Date(), // Using JS Date for simplicity and to match other parts if serverTimestamp missing
                    createdAt: new Date()
                });

                // Clear Cart
                setCart({});
                setShowCheckout(false);
                toast.success("Order Placed Successfully! Please pay on delivery.");

                // ─── Decrement stock & notify admin if any item runs out ───
                const outOfStockItems = [];

                await Promise.all(
                    itemSnapshot.map(async (orderedItem) => {
                        const itemRef = doc(db, "items", String(orderedItem.id));
                        const itemSnap = await getDoc(itemRef);

                        if (itemSnap.exists()) {
                            const currentStock = Number(itemSnap.data().stock || 0);
                            const newStock = Math.max(0, currentStock - orderedItem.count);

                            await updateDoc(itemRef, { stock: newStock });

                            // Update local items state so UI reflects immediately
                            setItems(prev =>
                                prev.map(i =>
                                    String(i.id) === String(orderedItem.id)
                                        ? { ...i, stock: newStock }
                                        : i
                                )
                            );

                            if (newStock === 0) {
                                outOfStockItems.push(orderedItem.name);
                            }
                        }
                    })
                );

                // Notify admin if any items ran out of stock
                if (outOfStockItems.length > 0) {
                    const alertMsg = `⚠️ Out of Stock: ${outOfStockItems.join(', ')}`;

                    // Write to Firestore notifications collection for admin dashboard
                    await addDoc(collection(db, "notifications"), {
                        type: "out_of_stock",
                        message: alertMsg,
                        items: outOfStockItems,
                        timestamp: new Date(),
                        read: false
                    });

                    // Also send push notification to admin
                    fetch(`${API_URL}/api/send-notification`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            title: "🚨 Stock Alert!",
                            message: alertMsg
                        })
                    }).catch(e => console.log("Stock alert notify fail", e));
                }
                // ────────────────────────────────────────────────────────────

                // Optional: Trigger new order notification
                fetch(`${API_URL}/api/send-notification`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: "New Order (COD)", message: `New COD Order for ₹${totalAmount} from ${orderDetails.name}` })
                }).catch(e => console.log("Notify fail", e));

                // Redirect to Orders page
                window.location.href = '/orders';

            } catch (error) {
                console.error("COD Error", error);
                toast.error("Failed to place order. Try again.");
            }
            return;
        }

        // --- ONLINE PAYMENT FLOW ---
        try {
            // Save Pending Data to LocalStorage (to retrieve after redirect)
            const pendingData = {
                userDetails: orderDetails,
                items: cart, // { id: count }
                itemSnapshot: itemSnapshot,
                totalAmount: totalAmount,
                orderId: orderId
            };
            localStorage.setItem('pending_order_DATA', JSON.stringify(pendingData));

            // UPDATE SUBSCRIPTION WITH PHONE NUMBER
            try {
                if ('serviceWorker' in navigator && 'PushManager' in window) {
                    subscribeToNotifications().catch(e => console.log("Sub update failed", e));
                }
            } catch (e) { console.log("Push check failed", e); }

            // Call Backend to Initiate Payment
            const backendUrl = API_URL;

            const res = await fetch(`${backendUrl}/api/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: totalAmount,
                    userId: userId,
                    orderId: orderId
                })
            });

            const data = await res.json();

            if (data.url) {
                // Redirect user to PhonePe (loading already showing)
                window.location.href = data.url;
            } else {
                console.error("No redirect URL received:", data);
                setPaymentLoading(false);
                toast.error("Payment initiation failed at server.");
            }

        } catch (error) {
            console.error("Payment Error:", error);
            setPaymentLoading(false);
            toast.error("Failed: " + (error.message || "Check console"));
        }
    };

    // --- UI HELPERS ---
    const getCategoryImage = (catName) => {
        const map = {
            'All': 'https://cdn-icons-png.flaticon.com/512/706/706164.png',
            'Snacks': 'https://cdn-icons-png.flaticon.com/512/2515/2515183.png',
            'Drinks': 'https://cdn-icons-png.flaticon.com/512/2405/2405597.png',
            'Meals': 'https://cdn-icons-png.flaticon.com/512/6030/6030105.png',
            'Biryani': 'https://cdn-icons-png.flaticon.com/512/4422/4422233.png',
            'Pizza': 'https://cdn-icons-png.flaticon.com/512/3595/3595455.png',
            'Burger': 'https://cdn-icons-png.flaticon.com/512/1147/1147610.png'
        };
        return map[catName] || 'https://cdn-icons-png.flaticon.com/512/3075/3075977.png';
    };

    return (
        <div style={{ minHeight: '100vh', paddingBottom: '90px' }}>


            {/* Mobile Header */}
            <div className="container" style={{ paddingTop: '1rem', paddingBottom: '0.5rem' }}>
                <div className="flex-between">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MapPin size={24} color="var(--primary)" fill="var(--primary-light)" />
                        <div className="flex-col">
                            <span style={{ fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                SAVEETHA HOSTELS
                            </span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                {orderDetails.hostelBlock || "Select Location"}
                            </span>
                        </div>
                    </div>
                    {/* Right Side: Theme Toggle & Profile */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <ThemeToggle />

                        {/* Profile Icon */}
                        <div
                            style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}
                            onClick={() => navigate('/profile')}
                        >
                            {userPhoto ? (
                                <img src={userPhoto} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <User size={20} color="var(--text-main)" />
                            )}
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div style={{ marginTop: '1rem', position: 'relative' }}>
                    <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
                    <input
                        className="input"
                        placeholder="Search for snacks, drinks, or munchies..."
                        style={{ paddingLeft: '3rem', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', background: 'var(--bg-input)', border: '1px solid var(--border)', fontSize: '0.95rem' }}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Categories - Horizontal Scroll */}
            <div className="container" style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', letterSpacing: '0.5px' }}>Eat what makes you happy</h3>
                </div>
                <div className="hide-scrollbar" style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollBehavior: 'smooth' }}>
                    {categories.map(cat => (
                        <div key={cat.id || cat.name} className="flex-col flex-center" style={{ minWidth: '76px', cursor: 'pointer' }} onClick={() => setSelectedCategory(cat.name)}>
                            <div className="category-avatar flex-center" style={{
                                border: selectedCategory === cat.name ? '3px solid var(--primary-light)' : 'none',
                                background: selectedCategory === cat.name ? 'var(--bg-surface)' : 'var(--bg-subtle)',
                                boxShadow: selectedCategory === cat.name ? 'var(--shadow-md)' : 'none',
                                width: '76px', height: '76px',
                                overflow: 'hidden' // Added overflow to crop custom images nicely
                            }}>
                                <img src={cat.image || getCategoryImage(cat.name)} alt={cat.name} style={{ width: cat.image ? '100%' : '42px', height: cat.image ? '100%' : '42px', objectFit: cat.image ? 'cover' : 'contain' }} />
                            </div>
                            <span style={{
                                fontSize: '0.85rem',
                                marginTop: '0.4rem',
                                fontWeight: selectedCategory === cat.name ? 700 : 500,
                                color: selectedCategory === cat.name ? 'var(--text-main)' : 'var(--text-muted)'
                            }}>{cat.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Store Status Banner */}
            {storeStatus.status !== 'now' && (
                <div className="container" style={{ marginTop: '1rem' }}>
                    <div className="card" style={{ background: '#FFF3CD', borderColor: '#ffeeba', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Clock size={20} color="#856404" />
                        <div>
                            <div style={{ fontWeight: 'bold', color: '#856404' }}>Store is Offline</div>
                            <div style={{ fontSize: '0.8rem', color: '#856404' }}>{storeStatus.message || "We are currently closed."}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Active Order Banner */}
            {activeOrder && (
                <div className="container" style={{ marginTop: '1rem' }}>
                    <div className="card" style={{ padding: '1rem', background: 'var(--primary-light)', border: '1px solid var(--primary)' }}>
                        <div className="flex-between">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Clock size={20} color="var(--primary)" />
                                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>Order in Progress</span>
                            </div>
                            <a href="/orders" className="btn btn-sm btn-primary">Track Order</a>
                        </div>
                    </div>
                </div>
            )}




            {/* Top Selling Section */}


            {/* Recommendations Section */}
            {
                !loading && recentItems.length > 0 && (
                    <>
                        {(() => {
                            // Filter recent items to only show those that are actually in the fetched 'items' list and have stock
                            const validRecs = recentItems.filter(rec => {
                                const liveItem = items.find(i => i.id === rec.id);
                                return liveItem && liveItem.stock > 0;
                            });

                            if (validRecs.length === 0) return null;

                            return (
                                <div className="container animate-fade-in" style={{ marginBottom: '1.5rem', paddingTop: '0.5rem' }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
                                        <span style={{ color: 'var(--primary)' }}>↻</span> Buy Again
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.8rem' }}>
                                        {validRecs.map(rec => {
                                            const liveItem = items.find(i => i.id === rec.id);
                                            return (
                                                <div key={rec.id} style={{
                                                    background: 'var(--bg-card)',
                                                    borderRadius: '12px',
                                                    border: '1px solid var(--border)',
                                                    boxShadow: 'var(--shadow-sm)',
                                                    padding: '0.8rem',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '0.5rem'
                                                }}>
                                                    <div style={{ fontWeight: 700, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)' }}>{liveItem.name}</div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ color: 'var(--text-main)', fontWeight: 800, fontSize: '0.9rem' }}>₹{liveItem.price}</span>
                                                        <button
                                                            style={{
                                                                padding: '4px 12px',
                                                                background: 'var(--primary)',
                                                                color: '#1a1a1a',
                                                                border: 'none',
                                                                borderRadius: '9999px',
                                                                fontWeight: 800,
                                                                fontSize: '0.78rem',
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                addToCart(rec.id);
                                                                toast.success('Added ' + liveItem.name);
                                                            }}
                                                        >
                                                            + Add
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}
                    </>
                )
            }

            {/* Main Items Grid */}
            <div className="container" style={{ marginTop: '2rem', paddingBottom: '12rem' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', letterSpacing: '0.5px' }}>{filteredItems.length} Items Available</h3>

                {loading ? <p>Loading delicious food...</p> : (
                    <div className="grid-responsive" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '1rem' }}>
                        {filteredItems.map(item => (
                            <div key={item.id} style={{
                                background: 'var(--bg-card)',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                boxShadow: 'var(--shadow-sm)',
                                overflow: 'visible',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'box-shadow 0.2s',
                            }}>
                                {/* Image Area */}
                                <div style={{ height: '140px', background: 'var(--bg-subtle)', borderRadius: '12px 12px 0 0', overflow: 'hidden', position: 'relative' }}>
                                    <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    {item.stock <= 0 && (
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--text-muted)', fontSize: '1.1rem', letterSpacing: '1px' }}>
                                            SOLD OUT
                                        </div>
                                    )}
                                </div>

                                {/* Content Area */}
                                <div style={{ padding: '0.7rem 0.8rem 0.5rem' }}>
                                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, lineHeight: 1.3, marginBottom: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)' }}>{item.name}</h4>
                                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.category}</p>

                                    {/* Price + ADD row */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.3rem' }}>
                                        <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>₹{item.price}</span>

                                        {cart[item.id] ? (
                                            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--primary)', borderRadius: '9999px', padding: '3px 8px', gap: '6px' }}>
                                                <button onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }} style={{ background: 'none', border: 'none', color: '#1a1a1a', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}><Minus size={13} strokeWidth={3} /></button>
                                                <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1a1a1a', minWidth: '14px', textAlign: 'center' }}>{cart[item.id]}</span>
                                                <button onClick={(e) => { e.stopPropagation(); addToCart(item.id); }} style={{ background: 'none', border: 'none', color: '#1a1a1a', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}><Plus size={13} strokeWidth={3} /></button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); addToCart(item.id); }}
                                                disabled={item.stock <= 0}
                                                style={{
                                                    padding: '5px 14px',
                                                    background: item.stock <= 0 ? 'var(--bg-subtle)' : 'var(--primary)',
                                                    color: item.stock <= 0 ? 'var(--text-muted)' : '#1a1a1a',
                                                    border: 'none',
                                                    borderRadius: '9999px',
                                                    fontWeight: 800,
                                                    fontSize: '0.82rem',
                                                    cursor: item.stock <= 0 ? 'not-allowed' : 'pointer',
                                                    letterSpacing: '0.5px',
                                                    boxShadow: item.stock <= 0 ? 'none' : '0 2px 6px rgba(132,194,37,0.35)',
                                                    transition: 'all 0.15s'
                                                }}
                                            >
                                                ADD
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            { }
            {/* Bottom Navigation (Fixed) */}
            <BottomNav activeTab="menu" />

            {/* Sticky Cart Footer when items in cart */}
            {/* Floating Round Cart Button (FAB) */}
            {Object.keys(cart).length > 0 && !showCartPreview && !showCheckout && (
                <div style={{
                    position: 'fixed',
                    bottom: '6rem',
                    right: '1.5rem',
                    zIndex: 1000,
                }}>
                    <button
                        onClick={() => setShowCartPreview(true)}
                        className="animate-fade-in"
                        style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: 'var(--primary)',
                            color: '#1a1a1a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 6px 20px rgba(132, 194, 37, 0.5)',
                            border: '3px solid var(--bg-surface)',
                            position: 'relative'
                        }}
                    >
                        <ShoppingBag size={26} strokeWidth={2.5} />
                        <div style={{
                            position: 'absolute',
                            top: '-5px',
                            right: '-5px',
                            background: 'var(--accent)',
                            color: 'white',
                            borderRadius: '50%',
                            width: '22px',
                            height: '22px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            border: '2px solid var(--bg-surface)'
                        }}>
                            {cartItemCount}
                        </div>
                    </button>
                </div>
            )}

            {/* Cart Review Modal (Step 1) */}
            {showCartPreview && (
                <div className="modal-overlay" style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div className="card animate-slide-up" style={{ width: '100%', maxWidth: '600px', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: 0, background: 'var(--bg-card)' }}>
                        <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Items in Cart</h3>
                            <button onClick={() => setShowCartPreview(false)} className="btn btn-ghost" style={{ padding: '0.4rem', borderRadius: '50%', background: 'var(--bg-subtle)' }}><X size={20} /></button>
                        </div>

                        <div style={{ padding: '1.5rem', maxHeight: '50vh', overflowY: 'auto' }}>
                            {Object.entries(cart).map(([itemId, quantity]) => {
                                const item = items.find(i => i.id === itemId);
                                if (!item) return null;
                                return (
                                    <div key={itemId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <img src={item.image} style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} alt="" />
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>{item.name}</div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>₹{item.price}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-subtle)', borderRadius: '8px', padding: '4px' }}>
                                            <button onClick={() => removeFromCart(itemId)} style={{ padding: '4px', color: 'var(--primary)' }}><Minus size={16} /></button>
                                            <span style={{ margin: '0 10px', fontWeight: 700, color: 'var(--text-main)' }}>{quantity}</span>
                                            <button onClick={() => addToCart(itemId)} style={{ padding: '4px', color: 'var(--primary)' }}><Plus size={16} /></button>
                                        </div>
                                    </div>
                                );
                            })}

                            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '2px dashed var(--border)' }}>
                                <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Items Total</span>
                                    <span style={{ fontWeight: 600 }}>₹{totalAmount}</span>
                                </div>
                                <div className="flex-between" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>Grand Total</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>₹{totalAmount}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '1rem 1.5rem 2rem' }}>
                            <button
                                onClick={() => {
                                    setShowCartPreview(false);
                                    handleInitialCheckout();
                                }}
                                className="btn btn-primary"
                                style={{ width: '100%', padding: '1rem', borderRadius: '9999px', fontSize: '1.05rem', fontWeight: 800, letterSpacing: '0.5px', background: 'var(--primary)', color: '#1a1a1a', boxShadow: '0 4px 14px rgba(132,194,37,0.4)' }}
                            >
                                Proceed to Checkout →
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showCheckout && (
                <div className="modal-overlay" style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div className="card animate-slide-up" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: 0, background: 'var(--bg-card)' }}>
                        <div style={{ padding: '1.5rem', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
                            <div className="flex-between">
                                <h3 style={{ fontSize: '1.2rem' }}>Detailed Bill</h3>
                                <button onClick={() => setShowCheckout(false)} className="btn btn-ghost" style={{ padding: '0.4rem', borderRadius: '50%', background: 'var(--bg-card)' }}><X size={20} /></button>
                            </div>
                        </div>

                        <div style={{ padding: '1.5rem' }}>
                            {/* Items List */}
                            {Object.entries(cart).map(([id, count]) => {
                                const i = items.find(x => String(x.id) === String(id));
                                return (
                                    <div key={id} className="flex-between" style={{ marginBottom: '1.2rem' }}>
                                        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
                                            <div style={{ border: '1px solid var(--success)', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '4px', borderRadius: '2px' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></div>
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '1rem' }}>{i?.name}</div>
                                                <div style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>₹{i?.price}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: '8px', background: 'var(--bg-surface)' }}>
                                            <button onClick={() => removeFromCart(id)} style={{ color: 'var(--danger)' }}><Minus size={16} /></button>
                                            <span style={{ fontWeight: 800, color: 'var(--success)' }}>{count}</span>
                                            <button onClick={() => addToCart(id)} style={{ color: 'var(--success)' }}><Plus size={16} /></button>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Bill Details */}
                            <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--bg-subtle)', borderRadius: '12px' }}>
                                <div className="flex-between" style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                    <span>Item Total</span>
                                    <span>₹{totalAmount}</span>
                                </div>
                                <div className="flex-between" style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                    <span>Delivery Fee</span>
                                    <span style={{ color: 'var(--success)' }}>FREE</span>
                                </div>
                                <div className="flex-between" style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border)', fontWeight: 700, fontSize: '1.1rem' }}>
                                    <span>To Pay</span>
                                    <span>₹{totalAmount}</span>
                                </div>
                            </div>

                            {/* Address & Details Inputs */}
                            <div style={{ marginTop: '2rem' }}>
                                <h4 style={{ fontSize: '1rem', marginBottom: '1rem', fontWeight: 800 }}>Delivery details</h4>
                                <div className="flex-col" style={{ gap: '1rem' }}>
                                    <div className="input-group">
                                        <input className="input" placeholder="Your Name" value={orderDetails.name} onChange={e => setOrderDetails({ ...orderDetails, name: e.target.value })} />
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <input className="input" placeholder="Room No" value={orderDetails.room} onChange={e => setOrderDetails({ ...orderDetails, room: e.target.value })} style={{ flex: 1 }} />
                                        <input className="input" placeholder="Phone" value={orderDetails.phone} type="tel" onChange={e => setOrderDetails({ ...orderDetails, phone: e.target.value })} style={{ flex: 1 }} />
                                    </div>
                                    <select className="input" value={orderDetails.hostelBlock} onChange={e => setOrderDetails({ ...orderDetails, hostelBlock: e.target.value })}>
                                        <option value="" disabled>Select Hostel Block</option>
                                        <option value="Annex Hostel (1st years)">Annex Hostel (1st years)</option>
                                        <option value="Noyyal Hostel (SEC, SIMATS)">Noyyal Hostel (SEC, SIMATS)</option>
                                        <option value="Pornai Hostel (Girls)">Pornai Hostel (Girls)</option>
                                        <option value="Vaigai Hostel (Boys, SIMATS)">Vaigai Hostel (Boys, SIMATS)</option>
                                        <option value="Krishna Hostel (Girls, SIMATS)">Krishna Hostel (Girls, SIMATS)</option>
                                    </select>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <input type="date" className="input" value={orderDetails.date} onChange={e => setOrderDetails({ ...orderDetails, date: e.target.value })} style={{ flex: 1 }} />
                                        <input type="time" className="input" value={orderDetails.time} onChange={e => setOrderDetails({ ...orderDetails, time: e.target.value })} style={{ flex: 1 }} />
                                    </div>
                                    <textarea className="input" placeholder="Notes (Optional)" value={orderDetails.notes} onChange={e => setOrderDetails({ ...orderDetails, notes: e.target.value })} style={{ minHeight: '60px' }} />
                                </div>
                            </div>

                            {/* Payment Method - COD Only */}
                            <div style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
                                <h4 style={{ fontSize: '1rem', marginBottom: '1rem', fontWeight: 800 }}>Payment Method</h4>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '1rem', border: '1px solid var(--success)', borderRadius: '12px', background: 'rgba(37, 156, 72, 0.05)' }}>
                                    <ShoppingBag size={22} color="var(--success)" />
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--success)' }}>Cash on Delivery</div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Pay when your order arrives</div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handlePayment}
                                className="btn btn-primary"
                                style={{ width: '100%', padding: '1rem', fontSize: '1.05rem', borderRadius: '9999px', background: 'var(--primary)', color: '#1a1a1a', border: 'none', fontWeight: 800, letterSpacing: '0.5px', boxShadow: '0 4px 16px rgba(132,194,37,0.45)' }}
                            >
                                🛍 Place Order — ₹{totalAmount}
                            </button>
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
};

export default UserMenu;
