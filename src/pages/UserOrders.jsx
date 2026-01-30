import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { Clock, CheckCircle, Package, Calendar } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

const UserOrders = () => {
    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hiddenOrders, setHiddenOrders] = useState([]);

    useEffect(() => {
        const storedHidden = JSON.parse(localStorage.getItem('hiddenOrders') || '[]');
        setHiddenOrders(storedHidden);
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        const user = JSON.parse(localStorage.getItem('user'));

        if (!user || !user.phone) {
            setLoading(false);
            return;
        }

        try {
            const q = query(
                collection(db, "orders"),
                where("userDetails.phone", "==", user.phone)
            );

            const querySnapshot = await getDocs(q);
            const ordersList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            ordersList.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
            setOrders(ordersList);
        } catch (error) {
            console.error("Error fetching orders: ", error);
        }
        setLoading(false);
    };

    const handleClearHistory = () => {
        if (!window.confirm("Are you sure you want to clear your order history? This will hide them from your view.")) return;

        const historyIds = historyOrders.map(o => o.id);
        const newHidden = [...hiddenOrders, ...historyIds];
        localStorage.setItem('hiddenOrders', JSON.stringify(newHidden));
        setHiddenOrders(newHidden);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending':
            case 'preparing':
            case 'accepted':
            case 'ready': return 'var(--accent)';
            case 'completed': return 'var(--success)';
            case 'cancelled': return 'var(--danger)';
            default: return 'var(--text-muted)';
        }
    };

    const StatusIcon = ({ status }) => {
        if (status === 'completed') return <CheckCircle size={18} color="var(--success)" />;
        if (status === 'cancelled') return <X size={18} color="var(--danger)" />;
        return <Clock size={18} color="var(--accent)" />;
    };

    // Filter Logic
    const visibleOrders = orders.filter(o => !hiddenOrders.includes(o.id));
    const activeOrders = visibleOrders.filter(o => ['pending', 'preparing', 'accepted', 'ready'].includes(o.status));
    const historyOrders = visibleOrders.filter(o => ['completed', 'cancelled', 'rejected'].includes(o.status));

    const displayedOrders = activeTab === 'active' ? activeOrders : historyOrders;

    return (
        <div className="min-h-screen">
            <Navbar role="user" />
            <div className="container" style={{ padding: '2rem 0' }}>
                <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: '800', letterSpacing: '-0.5px' }}>
                        My Orders
                    </h2>

                    {/* Tabs */}
                    <div style={{ background: 'var(--bg-card)', padding: '0.25rem', borderRadius: '50px', border: '1px solid var(--border)', display: 'flex' }}>
                        <button
                            onClick={() => setActiveTab('active')}
                            style={{
                                padding: '0.5rem 1.5rem',
                                borderRadius: '50px',
                                fontWeight: '600',
                                background: activeTab === 'active' ? 'var(--primary)' : 'transparent',
                                color: activeTab === 'active' ? 'white' : 'var(--text-muted)',
                                transition: 'all 0.3s'
                            }}
                        >
                            Active ({activeOrders.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            style={{
                                padding: '0.5rem 1.5rem',
                                borderRadius: '50px',
                                fontWeight: '600',
                                background: activeTab === 'history' ? 'var(--primary)' : 'transparent',
                                color: activeTab === 'history' ? 'white' : 'var(--text-muted)',
                                transition: 'all 0.3s'
                            }}
                        >
                            History
                        </button>
                    </div>
                </div>

                {activeTab === 'history' && historyOrders.length > 0 && (
                    <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
                        <button onClick={handleClearHistory} className="btn btn-sm btn-outline" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                            Clean History
                        </button>
                    </div>
                )}

                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Loading orders...</p>
                ) : displayedOrders.length === 0 ? (
                    <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                        <Package size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
                        <h3>No {activeTab} orders</h3>
                        <p style={{ color: 'var(--text-muted)' }}>
                            {activeTab === 'active' ? "Order something from the menu!" : "Your order history is clean."}
                        </p>
                    </div>
                ) : (
                    <div className="flex-col" style={{ gap: '1.5rem' }}>
                        {displayedOrders.map(order => (
                            <div key={order.id} className="card animate-fade-in" style={{ padding: '1.5rem', borderLeft: `4px solid ${getStatusColor(order.status)}` }}>
                                <div className="flex-between" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                            <Calendar size={14} color="var(--text-muted)" />
                                            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                                {new Date(order.timestamp.seconds * 1000).toLocaleString()}
                                            </span>
                                        </div>
                                        <div style={{ fontWeight: 'bold' }}>Reference: {order.paymentId ? order.paymentId.slice(-6).toUpperCase() : 'N/A'}</div>
                                    </div>
                                    <div className="badge" style={{
                                        backgroundColor: 'transparent',
                                        border: `1px solid ${getStatusColor(order.status)}`,
                                        color: getStatusColor(order.status),
                                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                                    }}>
                                        <StatusIcon status={order.status} />
                                        {order.status.toUpperCase()}
                                    </div>
                                </div>

                                <div className="flex-col" style={{ gap: '0.5rem', marginBottom: '1rem' }}>
                                    {order.itemSnapshot && order.itemSnapshot.map((item, idx) => (
                                        <div key={idx} className="flex-between">
                                            <span>{item.count}x {item.name}</span>
                                            <span>₹{item.price * item.count}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex-between" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                        Deliver to: <span style={{ color: 'var(--text-main)' }}>{order.userDetails.hostelBlock}, {order.userDetails.room}</span> ({order.userDetails.time})
                                    </div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                        Total: ₹{order.totalAmount}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserOrders;
