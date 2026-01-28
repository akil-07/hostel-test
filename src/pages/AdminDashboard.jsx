import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import { Plus, Trash2, Image as ImageIcon, Package, ShoppingBag, CheckCircle, X, Clock, RefreshCcw, Search, History, BarChart2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, orderBy, query, getDoc, setDoc } from 'firebase/firestore';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('orders'); // 'items' or 'orders'
    const [items, setItems] = useState([]);
    const [orders, setOrders] = useState([]);
    const [newItem, setNewItem] = useState({ name: '', price: '', stock: '' });
    const [imageFile, setImageFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [storeStatus, setStoreStatus] = useState({ status: 'now', message: '' });

    useEffect(() => {
        if (activeTab === 'items') fetchItems();
        else fetchOrders();
        fetchStoreStatus();
    }, [activeTab]);

    const fetchStoreStatus = async () => {
        try {
            const docSnap = await getDoc(doc(db, "settings", "global"));
            if (docSnap.exists()) {
                setStoreStatus(docSnap.data());
            }
        } catch (error) {
            console.log("Status not set yet");
        }
    };

    const updateStoreStatus = async (status) => {
        const message = status === 'later' ? prompt("Enter expected delivery time (e.g., '6:00 PM'):", "6:00 PM") : '';
        if (status === 'later' && !message) return;

        try {
            await setDoc(doc(db, "settings", "global"), {
                status,
                message
            });
            setStoreStatus({ status, message });
            toast.success(`Store status updated to: Deliver ${status === 'now' ? 'Now' : 'Later'}`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update status");
        }
    };

    const fetchItems = async () => {
        setFetchLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, "items"));
            const itemsList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setItems(itemsList);
        } catch (error) {
            console.error("Error fetching items: ", error);
        }
        setFetchLoading(false);
    };

    const fetchOrders = async () => {
        setFetchLoading(true);
        try {
            // Ideally use orderBy('timestamp', 'desc') but requires index
            const querySnapshot = await getDocs(collection(db, "orders"));
            const ordersList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Manual sort
            ordersList.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
            setOrders(ordersList);
        } catch (error) {
            console.error("Error fetching orders: ", error);
        }
        setFetchLoading(false);
    };

    const updateOrderStatus = async (orderId, newStatus) => {
        if (!window.confirm(`Mark order as ${newStatus}?`)) return;
        try {
            await updateDoc(doc(db, "orders", orderId), {
                status: newStatus
            });
            // Optimistic update
            setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    // Helper to compress image
    const compressImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;
                    if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } }
                    else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.onerror = (err) => reject(new Error("Failed to load image."));
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let imageUrl = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=300';
            if (imageFile) {
                try {
                    const compressionPromise = compressImage(imageFile);
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Image timeout")), 5000));
                    imageUrl = await Promise.race([compressionPromise, timeoutPromise]);
                } catch (err) {
                    toast.error("Image Error: " + err.message);
                    setLoading(false); return;
                }
            }
            await addDoc(collection(db, "items"), {
                name: newItem.name, price: Number(newItem.price), stock: Number(newItem.stock), image: imageUrl, createdAt: new Date()
            });
            setNewItem({ name: '', price: '', stock: '' }); setImageFile(null);
            await fetchItems();
            toast.success("Item added successfully!");
        } catch (error) {
            toast.error("Error adding item: " + error.message);
        }
        setLoading(false);
    };

    const handleRestock = async (item) => {
        const addedStock = prompt(`Enter amount to add to ${item.name} stock:`, "10");
        if (addedStock && !isNaN(addedStock) && Number(addedStock) > 0) {
            try {
                const itemRef = doc(db, "items", item.id);
                const newStock = Number(item.stock) + Number(addedStock);
                await updateDoc(itemRef, {
                    stock: newStock
                });
                // Optimistic update
                setItems(items.map(i => i.id === item.id ? { ...i, stock: newStock } : i));
                toast.success(`Stock updated! New stock: ${newStock}`);
            } catch (error) {
                console.error(error);
                toast.error("Failed to update stock");
            }
        }
    };

    const removeItem = async (id) => {
        if (window.confirm("Are you sure you want to remove this item?")) {
            try { await deleteDoc(doc(db, "items", id)); setItems(items.filter(item => item.id !== id)); } catch (error) { console.error(error); }
        }
    };

    return (
        <div className="min-h-screen">
            <Navbar role="admin" />
            <div className="container" style={{ padding: '2rem 0' }}>

                <div className="flex-between" style={{ marginBottom: '2rem' }}>
                    <div>
                        <h2 className="text-gradient" style={{ fontSize: '2rem', fontWeight: 'bold' }}>Dashboard</h2>
                        <p style={{ color: 'var(--text-muted)' }}>Manage inventory & orders</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', background: 'var(--bg-card)', padding: '0.5rem', borderRadius: 'var(--radius)' }}>
                        <button
                            className={`btn ${activeTab === 'orders' ? 'btn-primary' : ''}`}
                            onClick={() => setActiveTab('orders')}
                        >
                            <ShoppingBag size={18} /> Orders
                        </button>
                        <button
                            className={`btn ${activeTab === 'history' ? 'btn-primary' : ''}`}
                            onClick={() => setActiveTab('history')}
                        >
                            <History size={18} /> History
                        </button>
                        <button
                            className={`btn ${activeTab === 'items' ? 'btn-primary' : ''}`}
                            onClick={() => setActiveTab('items')}
                        >
                            <Package size={18} /> Inventory
                        </button>
                        <button
                            className={`btn ${activeTab === 'analytics' ? 'btn-primary' : ''}`}
                            onClick={() => setActiveTab('analytics')}
                        >
                            <BarChart2 size={18} /> Analytics
                        </button>
                    </div>
                </div>

                <div className="card" style={{ marginBottom: '2rem', background: 'var(--glass)' }}>
                    <div className="flex-between">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ fontWeight: 600 }}>Delivery Mode:</span>
                            <span className="badge" style={{
                                background: storeStatus.status === 'now' ? 'var(--success)' : 'var(--accent)',
                                color: 'white'
                            }}>
                                {storeStatus.status === 'now' ? 'DELIVERING NOW' : `LATER (${storeStatus.message})`}
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                className={`btn ${storeStatus.status === 'now' ? 'btn-primary' : 'btn-outline'}`}
                                onClick={() => updateStoreStatus('now')}
                            >
                                <CheckCircle size={16} /> Now
                            </button>
                            <button
                                className={`btn ${storeStatus.status === 'later' ? 'btn-primary' : 'btn-outline'}`}
                                onClick={() => updateStoreStatus('later')}
                            >
                                <Clock size={16} /> Later
                            </button>
                        </div>
                    </div>
                </div>

                {activeTab === 'items' && (
                    <div className="grid-responsive">
                        <div className="card">
                            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Plus size={20} color="var(--accent)" /> Add New Item</h3>
                            <form onSubmit={handleAddItem} className="flex-col" style={{ gap: '1rem' }}>
                                <div>
                                    <label className="label">Item Name</label>
                                    <input className="input" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} required />
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <label className="label">Price (₹)</label>
                                        <input type="number" className="input" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} required />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label className="label">Stock</label>
                                        <input type="number" className="input" value={newItem.stock} onChange={(e) => setNewItem({ ...newItem, stock: e.target.value })} required />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Image</label>
                                    <div style={{ position: 'relative', overflow: 'hidden' }}>
                                        <input type="file" accept=".jpg, .jpeg, .png, .webp" onChange={(e) => setImageFile(e.target.files[0])} style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                                        <div className="input" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', borderStyle: 'dashed' }}>
                                            <ImageIcon size={18} /><span>{imageFile ? imageFile.name : 'Upload Image'}</span>
                                        </div>
                                    </div>
                                </div>
                                <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Processing...' : 'Add Item'}</button>
                            </form>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <div className="card">
                                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Package size={20} color="var(--primary)" /> Current Stock</h3>
                                {fetchLoading ? <p style={{ color: 'var(--text-muted)' }}>Loading...</p> : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {items.map(item => (
                                            <div key={item.id} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-card)' }}>
                                                <img src={item.image} alt={item.name} style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                                                <div style={{ flex: 1 }}><h4 style={{ fontWeight: 600 }}>{item.name}</h4><p style={{ color: 'var(--text-muted)' }}>Stock: {item.stock}</p></div>
                                                <div style={{ fontWeight: 'bold', color: 'var(--accent)' }}>₹{item.price}</div>
                                                <button onClick={() => handleRestock(item)} className="btn btn-secondary" style={{ padding: '0.5rem', marginRight: '0.5rem', color: 'var(--success)' }} title="Restock">
                                                    <RefreshCcw size={16} />
                                                </button>
                                                <button onClick={() => removeItem(item.id)} className="btn btn-danger" style={{ padding: '0.5rem' }}><Trash2 size={16} /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'orders' && (
                    <div className="card">
                        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShoppingBag size={20} color="var(--primary)" /> Incoming Orders</h3>
                            <button className="btn btn-outline" onClick={fetchOrders}>Refresh Lists</button>
                        </div>

                        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                            <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                className="input"
                                placeholder="Search by Name, Room or Phone..."
                                style={{ paddingLeft: '3rem' }}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {fetchLoading ? <p style={{ color: 'var(--text-muted)' }}>Loading orders...</p> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {orders.filter(o => o.status === 'pending').filter(order =>
                                    order.userDetails.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    order.userDetails.room.includes(searchQuery) ||
                                    order.userDetails.phone.includes(searchQuery)
                                ).length === 0 && <p style={{ color: 'var(--text-muted)' }}>No active orders found.</p>}

                                {orders.filter(o => o.status === 'pending').filter(order =>
                                    order.userDetails.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    order.userDetails.room.includes(searchQuery) ||
                                    order.userDetails.phone.includes(searchQuery)
                                ).map(order => (
                                    <div key={order.id} className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--accent)' }}>
                                        <div className="flex-between" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{order.userDetails.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>({order.userDetails.room})</span></div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{order.userDetails.phone}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--primary)' }}>₹{order.totalAmount}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Time: {order.userDetails.time}</div>
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: '1rem' }}>
                                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                                {order.itemSnapshot && order.itemSnapshot.map((item, idx) => (
                                                    <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                                                        <span>{item.count}x {item.name}</span>
                                                        <span style={{ color: 'var(--text-muted)' }}>₹{item.price * item.count}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                            {order.userDetails.notes && (
                                                <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,0,0.1)', borderRadius: '4px', fontSize: '0.9rem' }}>
                                                    <strong>Note:</strong> {order.userDetails.notes}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-between" style={{ gap: '1rem' }}>
                                            <div className="badge" style={{ textTransform: 'uppercase', backgroundColor: 'var(--accent)', color: 'white' }}>
                                                {order.status}
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button className="btn btn-secondary" onClick={() => updateOrderStatus(order.id, 'cancelled')} style={{ color: 'var(--danger)' }}>Cancel</button>
                                                <button className="btn btn-primary" onClick={() => updateOrderStatus(order.id, 'completed')} style={{ background: 'var(--success)' }}>Mark Done</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="card">
                        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><History size={20} color="var(--primary)" /> Order History</h3>
                            <button className="btn btn-outline" onClick={fetchOrders}>Refresh Lists</button>
                        </div>

                        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                            <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                className="input"
                                placeholder="Search History..."
                                style={{ paddingLeft: '3rem' }}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {fetchLoading ? <p style={{ color: 'var(--text-muted)' }}>Loading history...</p> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {orders.filter(o => o.status !== 'pending').filter(order =>
                                    order.userDetails.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    order.userDetails.room.includes(searchQuery) ||
                                    order.userDetails.phone.includes(searchQuery)
                                ).length === 0 && <p style={{ color: 'var(--text-muted)' }}>No past orders found.</p>}

                                {orders.filter(o => o.status !== 'pending').filter(order =>
                                    order.userDetails.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    order.userDetails.room.includes(searchQuery) ||
                                    order.userDetails.phone.includes(searchQuery)
                                ).map(order => (
                                    <div key={order.id} className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border)', opacity: 0.8 }}>
                                        <div className="flex-between" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{order.userDetails.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>({order.userDetails.room})</span></div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{order.userDetails.phone}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--primary)' }}>₹{order.totalAmount}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(order.timestamp.seconds * 1000).toLocaleString()}</div>
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: '1rem' }}>
                                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                                {order.itemSnapshot && order.itemSnapshot.map((item, idx) => (
                                                    <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                                                        <span>{item.count}x {item.name}</span>
                                                        <span style={{ color: 'var(--text-muted)' }}>₹{item.price * item.count}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="flex-between" style={{ gap: '1rem' }}>
                                            <div className="badge" style={{
                                                textTransform: 'uppercase',
                                                backgroundColor: order.status === 'completed' ? 'var(--success)' : 'var(--danger)',
                                                color: 'white'
                                            }}>
                                                {order.status}
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                {order.status === 'completed' && <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={16} /> Completed</span>}
                                                {order.status === 'cancelled' && <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><X size={16} /> Cancelled</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}


                {activeTab === 'analytics' && (
                    <div className="animate-fade-in">
                        {/* Stats Grid */}
                        <div className="grid-responsive" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '2rem' }}>
                            <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                                <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Total Revenue</div>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>
                                    ₹{orders.filter(o => o.status === 'completed').reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0)}
                                </div>
                            </div>
                            <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                                <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Total Orders</div>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{orders.length}</div>
                            </div>
                            <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                                <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Completed</div>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                    {orders.filter(o => o.status === 'completed').length}
                                </div>
                            </div>
                            <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                                <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Cancelled</div>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger)' }}>
                                    {orders.filter(o => o.status === 'cancelled').length}
                                </div>
                            </div>
                        </div>

                        {/* Top Items */}
                        <div className="card">
                            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <BarChart2 size={20} color="var(--accent)" /> Top Selling Items
                            </h3>
                            {orders.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)' }}>No data available yet.</p>
                            ) : (
                                <div className="flex-col" style={{ gap: '1rem' }}>
                                    {(() => {
                                        const itemSales = {};
                                        orders.filter(o => o.status === 'completed').forEach(order => {
                                            if (order.itemSnapshot) {
                                                order.itemSnapshot.forEach(item => {
                                                    itemSales[item.name] = (itemSales[item.name] || 0) + item.count;
                                                });
                                            }
                                        });
                                        const topItems = Object.entries(itemSales).sort(([, a], [, b]) => b - a).slice(0, 5);

                                        if (topItems.length === 0) return <p>No completed sales yet.</p>;

                                        const maxVal = topItems[0][1];

                                        return topItems.map(([name, count], idx) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ width: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '500' }}>{name}</div>
                                                <div style={{ flex: 1, background: 'var(--bg-body)', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                                                    <div style={{
                                                        width: `${(count / maxVal) * 100}%`,
                                                        height: '100%',
                                                        background: 'var(--gradient-primary)',
                                                        borderRadius: '5px'
                                                    }} />
                                                </div>
                                                <div style={{ fontWeight: 'bold', width: '30px', textAlign: 'right' }}>{count}</div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default AdminDashboard;
