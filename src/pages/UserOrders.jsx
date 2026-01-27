import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { Clock, CheckCircle, Package, Calendar } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

const UserOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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
            // In a real app, complex queries need indexes. 
            // For now, we'll fetch then filter or use basic filtration if index exists
            // Let's try simple client side filtering if dataset is small, or simple where clause
            const q = query(
                collection(db, "orders"),
                where("userDetails.phone", "==", user.phone)
            );

            const querySnapshot = await getDocs(q);
            const ordersList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Sort by date manually since composite index might not be ready
            ordersList.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);

            setOrders(ordersList);
        } catch (error) {
            console.error("Error fetching orders: ", error);
        }
        setLoading(false);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'var(--accent)'; // Blue/Cyan
            case 'completed': return 'var(--success)'; // Green
            case 'cancelled': return 'var(--danger)'; // Red
            default: return 'var(--text-muted)';
        }
    };

    const StatusIcon = ({ status }) => {
        if (status === 'completed') return <CheckCircle size={18} color="var(--success)" />;
        if (status === 'cancelled') return <X size={18} color="var(--danger)" />;
        return <Clock size={18} color="var(--accent)" />;
    };

    return (
        <div className="min-h-screen">
            <Navbar role="user" />
            <div className="container" style={{ padding: '2rem 0' }}>
                <h2 className="text-gradient" style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
                    My Orders
                </h2>

                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Loading orders...</p>
                ) : orders.length === 0 ? (
                    <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                        <Package size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
                        <h3>No orders yet</h3>
                        <p style={{ color: 'var(--text-muted)' }}>Hungry? Go to the menu and grab a bite!</p>
                    </div>
                ) : (
                    <div className="flex-col" style={{ gap: '1.5rem' }}>
                        {orders.map(order => (
                            <div key={order.id} className="card animate-fade-in" style={{ padding: '1.5rem' }}>
                                <div className="flex-between" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                            <Calendar size={14} color="var(--text-muted)" />
                                            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                                {new Date(order.timestamp.seconds * 1000).toLocaleString()}
                                            </span>
                                        </div>
                                        <div style={{ fontWeight: 'bold' }}>Reference: {order.paymentId.slice(-6).toUpperCase()}</div>
                                    </div>
                                    <div className="badge" style={{
                                        backgroundColor: `rgba(var(--bg-card), 0)`,
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
                                        Deliver to: <span style={{ color: 'var(--text-main)' }}>{order.userDetails.room}</span> ({order.userDetails.time})
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
