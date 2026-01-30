import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import { ShoppingBag, Plus, Minus, Search, Clock, Calendar, MapPin, User, MessageSquare, X, Building, TrendingUp, Filter } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, addDoc, updateDoc, doc, increment, getDoc, query, where, orderBy, limit } from 'firebase/firestore';

const UserMenu = () => {
    const [items, setItems] = useState([]);
    const [cart, setCart] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [recentItems, setRecentItems] = useState([]);
    const [sortBy, setSortBy] = useState('relevant'); // relevant, sales, priceLow, priceHigh

    // Checkout State
    const [showCheckout, setShowCheckout] = useState(false);
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
        fetchActiveOrder();
    }, []);

    const getCurrentTimePlus = (minutes) => {
        const d = new Date();
        d.setMinutes(d.getMinutes() + minutes);
        return d.toTimeString().slice(0, 5);
    };

    const [storeStatus, setStoreStatus] = useState({ status: 'now', message: '' });

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
        fetchItems();
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

    const fetchActiveOrder = async () => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.phone) return;

        try {
            const q = query(
                collection(db, "orders"),
                where("userDetails.phone", "==", user.phone),
                where("status", "in", ["pending", "accepted", "preparing", "ready"])
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
        } catch (error) {
            console.error(error);
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
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
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

    const handlePayment = async () => {
        if (!orderDetails.name || !orderDetails.room || !orderDetails.hostelBlock || !orderDetails.time) {
            toast.error("Please fill in all required fields (Name, Room, Hostel Block, Delivery Time)");
            return;
        }

        // Save profile for future
        localStorage.setItem('hostel_user_profile', JSON.stringify({
            name: orderDetails.name,
            room: orderDetails.room,
            phone: orderDetails.phone
        }));

        try {
            const orderId = "ORDER_" + Date.now();
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const userId = user.uid || "user_" + Date.now(); // Fallback if no UID

            // Prepare Item Snapshot for consistency
            const itemSnapshot = Object.entries(cart).map(([id, count]) => {
                const i = items.find(x => String(x.id) === String(id));
                return { id, name: i?.name || 'Unknown Item', price: i?.price || 0, count };
            });

            // Save Pending Data to LocalStorage (to retrieve after redirect)
            const pendingData = {
                userDetails: orderDetails,
                items: cart, // { id: count }
                itemSnapshot: itemSnapshot,
                totalAmount: totalAmount,
                orderId: orderId
            };
            localStorage.setItem('pending_order_DATA', JSON.stringify(pendingData));

            // Call Backend to Initiate Payment
            // Dynamic Backend URL based on current hostname
            const protocol = window.location.protocol;
            const hostname = window.location.hostname;
            const port = 5000; // Backend is always on 5000
            const backendUrl = `${protocol}//${hostname}:${port}`;

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
                // Redirect user to PhonePe
                window.location.href = data.url;
            } else {
                console.error("No redirect URL received:", data);
                toast.error("Payment initiation failed at server.");
            }

        } catch (error) {
            console.error("Payment Error:", error);
            toast.error("Failed to initiate payment. Check console.");
        }
    };

    return (
        <div className="min-h-screen" style={{ paddingBottom: '100px' }}>
            <Navbar role="user" />
            <div className="container" style={{ padding: '2rem 0' }}>

                <div className="flex-between" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h2 style={{ fontSize: '2rem', fontWeight: '800', fontStyle: 'italic', letterSpacing: '-1px' }}>Menu</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Order your favorites instantly</p>
                    </div>

                    {/* Store Status Banner */}
                    {storeStatus.status === 'later' && (
                        <div className="animate-fade-in" style={{ width: '100%', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', borderRadius: 'var(--radius)', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <Clock size={24} color="var(--danger)" />
                            <div>
                                <h4 style={{ color: 'var(--danger)', fontWeight: 'bold' }}>Not Delivering Now</h4>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    Next delivery expected at: <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{storeStatus.message}</span>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Active Order Banner */}
                    {activeOrder && (
                        <div className="animate-fade-in" style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--shadow-sm)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ background: 'var(--accent)', padding: '0.5rem', borderRadius: '50%' }}>
                                    <Clock size={20} color="white" />
                                </div>
                                <div>
                                    <h4 style={{ fontWeight: 'bold', fontSize: '1rem' }}>Order in progress</h4>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Status: <span style={{ color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase' }}>{activeOrder.status}</span></p>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 'bold' }}>{activeOrder.paymentId ? activeOrder.paymentId.slice(-4) : ''}</div>
                                <a href="/orders" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'underline' }}>View</a>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%', maxWidth: '400px', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: '150px' }}>
                            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                className="input"
                                style={{ paddingLeft: '40px' }}
                                placeholder="Search snacks..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div style={{ position: 'relative', minWidth: '140px' }}>
                            <Filter size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <select
                                className="input"
                                style={{ paddingLeft: '40px', cursor: 'pointer', appearance: 'none', background: 'var(--bg-card)' }}
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <option value="relevant">Relevant</option>
                                <option value="sales">Top Selling</option>
                                <option value="priceLow">Price: Low to High</option>
                                <option value="priceHigh">Price: High to Low</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>



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
                                <div className="animate-fade-in" style={{ marginBottom: '2rem' }}>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ color: 'var(--primary)' }}>↻</span> Buy Again
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                                        {validRecs.map(rec => {
                                            const liveItem = items.find(i => i.id === rec.id);
                                            return (
                                                <div key={rec.id} className="card" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid var(--border)' }}>
                                                    <div style={{ fontWeight: '600', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{liveItem.name}</div>
                                                    <div className="flex-between">
                                                        <span style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '0.9rem' }}>₹{liveItem.price}</span>
                                                        <button
                                                            className="btn btn-sm btn-outline"
                                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', borderColor: 'var(--border)' }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                addToCart(rec.id);
                                                                toast.success("Added " + liveItem.name);
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

            {
                loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Loading menu...</p>
                ) : (
                    <div className="grid-responsive">
                        {filteredItems.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No items found in stock.</p>}
                        {filteredItems.map(item => (
                            <div key={item.id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', border: 'none', boxShadow: 'var(--shadow-sm)' }}>
                                <div style={{ height: '200px', overflow: 'hidden' }}>
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }}
                                        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                                        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                                    />
                                </div>
                                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                                        <h3 style={{ fontWeight: 600 }}>{item.name}</h3>
                                        {item.category && <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>{item.category}</span>}
                                    </div>
                                    <div className="flex-between" style={{ marginBottom: '1rem', alignItems: 'flex-end' }}>
                                        <p style={{ color: 'var(--text-main)', fontWeight: 'bold', fontSize: '1.1rem' }}>₹{item.price}</p>
                                    </div>

                                    <div style={{ marginTop: 'auto' }}>
                                        {item.stock <= 0 ? (
                                            <button className="btn btn-secondary" style={{ width: '100%', opacity: 0.5, cursor: 'not-allowed' }} disabled>
                                                Out of Stock
                                            </button>
                                        ) : getItemCount(item.id) === 0 ? (
                                            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => addToCart(item.id)}>
                                                Add to Cart
                                            </button>
                                        ) : (
                                            <div className="flex-between" style={{ background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', padding: '0.25rem', border: '1px solid var(--border)' }}>
                                                <button className="btn" onClick={() => removeFromCart(item.id)}><Minus size={16} /></button>
                                                <span style={{ fontWeight: 600 }}>{getItemCount(item.id)}</span>
                                                <button className="btn" onClick={() => addToCart(item.id)} disabled={getItemCount(item.id) >= item.stock}><Plus size={16} /></button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }

            { }
            <div className="floating-cart animate-fade-in">
                {cartItemCount > 0 ? (
                    <button
                        className="btn btn-primary"
                        style={{ padding: '1rem 2rem', borderRadius: '50px', boxShadow: '0 10px 25px -5px rgba(139, 92, 246, 0.6)' }}
                        onClick={handleInitialCheckout}
                    >
                        <ShoppingBag size={20} /> Checkout ₹{totalAmount}
                    </button>
                ) : (
                    <div style={{
                        background: 'var(--bg-card)',
                        padding: '1rem 2rem',
                        borderRadius: '50px',
                        border: '1px solid var(--border)',
                        color: 'var(--text-muted)',
                        boxShadow: 'var(--shadow-lg)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <ShoppingBag size={20} /> Cart Empty
                    </div>
                )}
            </div>

            {/* Checkout Modal */}

            {
                showCheckout && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                        <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '420px', maxHeight: '85vh', overflowY: 'auto', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                            <div className="flex-between" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Delivery Details</h3>
                                <button onClick={() => setShowCheckout(false)} className="btn btn-secondary" style={{ padding: '0.5rem' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-col" style={{ gap: '1rem' }}>
                                <div className="input-group">
                                    <label className="label">Full Name</label>
                                    <div style={{ position: 'relative' }}>
                                        <User size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                        <input
                                            className="input" style={{ paddingLeft: '45px' }}
                                            value={orderDetails.name}
                                            onChange={e => setOrderDetails({ ...orderDetails, name: e.target.value })}
                                            placeholder="Enter your name"
                                        />
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label className="label">Room Number</label>
                                    <div style={{ position: 'relative' }}>
                                        <MapPin size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                        <input
                                            className="input" style={{ paddingLeft: '45px' }}
                                            value={orderDetails.room}
                                            onChange={e => setOrderDetails({ ...orderDetails, room: e.target.value })}
                                            placeholder="e.g. A-302"
                                        />
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label className="label">Phone Number</label>
                                    <div style={{ position: 'relative' }}>
                                        <User size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                        <input
                                            className="input" style={{ paddingLeft: '45px' }}
                                            value={orderDetails.phone}
                                            onChange={e => setOrderDetails({ ...orderDetails, phone: e.target.value })}
                                            placeholder="Enter phone number"
                                            type="tel"
                                        />
                                    </div>
                                </div>


                                {/* Hostel Block - Hidden/Fixed */}
                                <div style={{ display: 'none' }}>
                                    <input value={orderDetails.hostelBlock} readOnly />
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    <div className="input-group" style={{ flex: 1 }}>
                                        <label className="label">Date</label>
                                        <div style={{ position: 'relative' }}>
                                            <Calendar size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                            <input
                                                type="date"
                                                className="input" style={{ paddingLeft: '45px' }}
                                                value={orderDetails.date}
                                                onChange={e => setOrderDetails({ ...orderDetails, date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="input-group" style={{ flex: 1 }}>
                                        <label className="label">Time</label>
                                        <div style={{ position: 'relative' }}>
                                            <Clock size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                            <input
                                                type="time"
                                                className="input" style={{ paddingLeft: '45px' }}
                                                value={orderDetails.time}
                                                onChange={e => setOrderDetails({ ...orderDetails, time: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label className="label">Special Requests (Optional)</label>
                                    <div style={{ position: 'relative' }}>
                                        <MessageSquare size={20} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} />
                                        <textarea
                                            className="input" style={{ paddingLeft: '45px', minHeight: '80px', resize: 'vertical' }}
                                            value={orderDetails.notes}
                                            onChange={e => setOrderDetails({ ...orderDetails, notes: e.target.value })}
                                            placeholder="e.g. Extra spicy, no onions..."
                                        />
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                                    <div className="flex-between" style={{ marginBottom: '1rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Total Amount:</span>
                                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>₹{totalAmount}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <button
                                            onClick={() => setShowCheckout(false)}
                                            className="btn btn-secondary"
                                            style={{ flex: 1, fontSize: '1.1rem', borderColor: 'var(--border)' }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handlePayment}
                                            className="btn btn-primary"
                                            style={{ flex: 2, fontSize: '1.1rem', background: '#5f259f' }}
                                        >
                                            Place Order
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default UserMenu;
