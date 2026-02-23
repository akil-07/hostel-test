import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import { Plus, Trash2, Image as ImageIcon, Package, ShoppingBag, CheckCircle, X, Clock, RefreshCcw, Search, History, BarChart2, AlertTriangle } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, orderBy, query, getDoc, setDoc, where, writeBatch } from 'firebase/firestore';
import { API_URL } from '../config';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('orders'); // 'items' or 'orders'
    const [items, setItems] = useState([]);
    const [orders, setOrders] = useState([]);
    const [newItem, setNewItem] = useState({ name: '', price: '', wholesalePrice: '', stock: '', category: '' });
    const [categories, setCategories] = useState([]);
    const [newCategory, setNewCategory] = useState('');
    const [categoryImageFile, setCategoryImageFile] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [otpModal, setOtpModal] = useState({ isOpen: false, orderId: null });
    const [otpInput, setOtpInput] = useState('');

    const [selectedOrders, setSelectedOrders] = useState([]);

    const [storeStatus, setStoreStatus] = useState({ status: 'now', message: '' });
    const [stockAlerts, setStockAlerts] = useState([]); // unread out-of-stock notifications

    // ... useEffects ...

    // ... existing functions ...

    // Helper to toggle selection
    const toggleSelectOrder = (id) => {
        setSelectedOrders(prev =>
            prev.includes(id) ? prev.filter(oid => oid !== id) : [...prev, id]
        );
    };

    const deleteSelected = async () => {
        if (selectedOrders.length === 0) return;
        if (!window.confirm(`Permanently delete ${selectedOrders.length} orders?`)) return;

        setLoading(true);
        try {
            await Promise.all(selectedOrders.map(id => deleteDoc(doc(db, "orders", id))));
            setOrders(orders.filter(o => !selectedOrders.includes(o.id)));
            setSelectedOrders([]);
            toast.success("Selected orders deleted forever");
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete selected orders");
        }
        setLoading(false);
    };

    const deleteAllPermanent = async () => {
        const archivedOrders = orders.filter(o => o.archived);
        if (archivedOrders.length === 0) return;
        if (!window.confirm(`WARNING: This will PERMANENTLY DELETE ALL ${archivedOrders.length} archived orders. They cannot be recovered. Continue?`)) return;

        setLoading(true);
        try {
            await Promise.all(archivedOrders.map(o => deleteDoc(doc(db, "orders", o.id))));
            setOrders(orders.filter(o => !o.archived));
            setSelectedOrders([]);
            toast.success("All archived orders deleted forever");
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete all archived orders");
        }
        setLoading(false);
    };

    useEffect(() => {
        if (activeTab === 'items' || activeTab === 'analytics') {
            fetchItems();
            if (activeTab === 'items') fetchCategories();
        }
        if (activeTab !== 'items') fetchOrders();
        fetchStoreStatus();
        fetchStockAlerts();
    }, [activeTab]);

    const fetchStockAlerts = async () => {
        try {
            const q = query(
                collection(db, "notifications"),
                where("type", "==", "out_of_stock"),
                where("read", "==", false)
            );
            const snap = await getDocs(q);
            const alerts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setStockAlerts(alerts);
        } catch (e) {
            console.log("No stock alerts", e);
        }
    };

    const dismissStockAlerts = async () => {
        try {
            const batch = writeBatch(db);
            stockAlerts.forEach(alert => {
                batch.update(doc(db, "notifications", alert.id), { read: true });
            });
            await batch.commit();
            setStockAlerts([]);
        } catch (e) {
            console.log("Dismiss error", e);
        }
    };

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

    const fetchCategories = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "categories"));
            const catList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setCategories(catList);
        } catch (error) {
            console.error("Error fetching categories: ", error);
        }
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!newCategory.trim()) return;
        setLoading(true);
        try {
            let imageUrl = '';
            if (categoryImageFile) {
                try {
                    const compressionPromise = compressImage(categoryImageFile);
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Image timeout")), 5000));
                    imageUrl = await Promise.race([compressionPromise, timeoutPromise]);
                } catch (err) {
                    toast.error("Image Error: " + err.message);
                    setLoading(false); return;
                }
            }

            await addDoc(collection(db, "categories"), {
                name: newCategory.trim(),
                image: imageUrl
            });
            setNewCategory('');
            setCategoryImageFile(null);
            fetchCategories();
            toast.success("Category added");
        } catch (error) {
            console.error(error);
            toast.error("Failed to add category");
        }
        setLoading(false);
    };

    const handleDeleteCategory = async (id) => {
        if (!window.confirm("Delete this category?")) return;
        try {
            await deleteDoc(doc(db, "categories", id));
            setCategories(categories.filter(c => c.id !== id));
            toast.success("Category deleted");
        } catch (error) {
            toast.error("Failed to delete category");
        }
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

    const updateOrderStatus = async (orderId, newStatus, isVerified = false) => {
        // Find existing order
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        // OTP Verification forCompletion
        if (newStatus === 'completed') {
            if (order.deliveryOtp && !isVerified) {
                // Trigger UI Modal instead of prompt
                setOtpModal({ isOpen: true, orderId: orderId });
                setOtpInput('');
                return;
            }
            // If no OTP, confirm normal completion
            if (!order.deliveryOtp && !isVerified) {
                if (!window.confirm("This order has no OTP. Mark as completed anyway?")) return;
            }
        } else {
            // For other status changes (cancelled, etc)
            if (!window.confirm(`Mark order as ${newStatus}?`)) return;
        }

        try {
            await updateDoc(doc(db, "orders", orderId), {
                status: newStatus
            });
            // Optimistic update
            setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
            toast.success(`Order marked as ${newStatus}`);

            // Send Notification
            if (['dispatched', 'completed'].includes(newStatus)) {
                let title = "Order Update";
                let message = `Your order is now ${newStatus}!`;

                if (newStatus === 'dispatched') {
                    title = "Order Dispatched 🚚";
                    message = "Your order is on its way!";
                } else if (newStatus === 'completed') {
                    title = "Order Delivered ✅";
                    message = "Your order has been delivered. Enjoy!";
                }

                // Call Backend to Notify User
                const userPhone = order.userDetails?.phone;
                if (userPhone) {
                    fetch(`${API_URL}/api/send-user-notification`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: userPhone,
                            title: title,
                            message: message
                        })
                    }).catch(e => console.error("Notify Error", e));
                }
            }

        } catch (error) {
            console.error(error);
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
                name: newItem.name,
                price: Number(newItem.price),
                wholesalePrice: Number(newItem.wholesalePrice),
                stock: Number(newItem.stock),
                category: newItem.category || 'General',
                image: imageUrl,
                createdAt: new Date()
            });
            setNewItem({ name: '', price: '', wholesalePrice: '', stock: '', category: '' }); setImageFile(null);
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

    const archiveOrder = async (orderId) => {
        if (!window.confirm("Remove from history view? (Revenue stats will remain)")) return;
        try {
            await updateDoc(doc(db, "orders", orderId), {
                archived: true
            });
            // Update local state to reflect archived status
            setOrders(orders.map(o => o.id === orderId ? { ...o, archived: true } : o));
            toast.success("Order removed from history");
        } catch (error) {
            console.error(error);
            toast.error("Failed to archive order");
        }
    };

    const archiveAllHistory = async () => {
        // Filter orders that are completed/cancelled AND NOT ALREADY archived
        const historyOrders = orders.filter(o => o.status !== 'pending' && !o.archived);

        if (historyOrders.length === 0) {
            toast.error("No history to clear");
            return;
        }

        if (!window.confirm(`Hide ALL ${historyOrders.length} past orders from this view? (Revenue stats will remain)`)) return;

        setLoading(true);
        try {
            // Use Promise.all to update all docs in parallel
            await Promise.all(historyOrders.map(o => updateDoc(doc(db, "orders", o.id), { archived: true })));

            // Update local state
            setOrders(orders.map(o =>
                (o.status !== 'pending' && !o.archived) ? { ...o, archived: true } : o
            ));

            toast.success("All history cleared from view!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to archive history");
        }
        setLoading(false);
    };

    const restoreOrder = async (orderId) => {
        try {
            await updateDoc(doc(db, "orders", orderId), {
                archived: false
            });
            setOrders(orders.map(o => o.id === orderId ? { ...o, archived: false } : o));
            toast.success("Order restored to history");
        } catch (error) {
            console.error(error);
            toast.error("Failed to restore order");
        }
    };

    const deletePermanent = async (orderId) => {
        if (!window.confirm("PERMANENTLY DELETE this order? This will reduce revenue.")) return;
        try {
            await deleteDoc(doc(db, "orders", orderId));
            setOrders(orders.filter(o => o.id !== orderId));
            toast.success("Order deleted forever");
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete order");
        }
    };

    const handleVerifyOtp = (e) => {
        e.preventDefault();
        const order = orders.find(o => o.id === otpModal.orderId);
        if (!order) return;

        if (otpInput !== order.deliveryOtp) {
            toast.error("Incorrect OTP! Please check with the student.");
            return;
        }

        toast.success("OTP Verified Successfully!");
        setOtpModal({ isOpen: false, orderId: null });
        updateOrderStatus(order.id, 'completed', true);
    };



    return (
        <div className="min-h-screen">
            <Navbar role="admin" />
            <div className="container" style={{ padding: '2rem 0' }}>
                {/* ... existing header ... */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h2 style={{ fontSize: '2rem', fontWeight: '800', fontStyle: 'italic', letterSpacing: '-1px' }}>Dashboard</h2>
                            <p style={{ color: 'var(--text-muted)' }}>Manage inventory & orders</p>
                        </div>
                        <div className="hide-scrollbar" style={{
                            display: 'flex',
                            gap: '0.5rem',
                            background: 'var(--bg-surface)',
                            padding: '0.4rem',
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            overflowX: 'auto',
                            maxWidth: '100%',
                            whiteSpace: 'nowrap'
                        }}>
                            <button
                                className={`btn btn-sm ${activeTab === 'orders' ? 'btn-primary' : ''}`}
                                onClick={() => setActiveTab('orders')}
                                style={{
                                    padding: '0.5rem 1rem',
                                    color: activeTab === 'orders' ? 'white' : 'var(--text-muted)',
                                    background: activeTab === 'orders' ? 'var(--primary)' : 'transparent'
                                }}
                            >
                                Orders
                            </button>
                            <button
                                className={`btn btn-sm ${activeTab === 'history' ? 'btn-primary' : ''}`}
                                onClick={() => setActiveTab('history')}
                                style={{
                                    padding: '0.5rem 1rem',
                                    color: activeTab === 'history' ? 'white' : 'var(--text-muted)',
                                    background: activeTab === 'history' ? 'var(--primary)' : 'transparent'
                                }}
                            >
                                <History size={16} /> History
                            </button>
                            <button
                                className={`btn btn-sm ${activeTab === 'items' ? 'btn-primary' : ''}`}
                                onClick={() => setActiveTab('items')}
                                style={{
                                    padding: '0.5rem 1rem',
                                    color: activeTab === 'items' ? 'white' : 'var(--text-muted)',
                                    background: activeTab === 'items' ? 'var(--primary)' : 'transparent'
                                }}
                            >
                                <Package size={16} /> Inventory
                            </button>
                            <button
                                className={`btn btn-sm ${activeTab === 'analytics' ? 'btn-primary' : ''}`}
                                onClick={() => setActiveTab('analytics')}
                                style={{
                                    padding: '0.5rem 1rem',
                                    color: activeTab === 'analytics' ? 'white' : 'var(--text-muted)',
                                    background: activeTab === 'analytics' ? 'var(--primary)' : 'transparent'
                                }}
                            >
                                <BarChart2 size={16} /> Analytics
                            </button>
                        </div>
                    </div>
                </div>

                {/* ... existing store status card ... */}
                {/* Delivery Mode Card */}
                <div className="card" style={{ marginBottom: '1rem', background: 'var(--bg-surface)', padding: '1.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: '150px' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Delivery Mode:</span>
                            <div className="badge" style={{
                                background: storeStatus.status === 'now' ? 'var(--success)' : 'var(--accent)',
                                color: 'white',
                                alignSelf: 'flex-start',
                                padding: '0.5rem 1rem',
                                fontSize: '0.8rem',
                                fontWeight: 800
                            }}>
                                {storeStatus.status === 'now' ? 'DELIVERING NOW' : `LATER (${storeStatus.message})`}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flex: '1 1 auto', justifyContent: 'flex-end' }}>
                            <button
                                className={`btn ${storeStatus.status === 'now' ? 'btn-primary' : 'btn-outline'}`}
                                onClick={() => updateStoreStatus('now')}
                                style={{ flex: 1, maxWidth: '120px' }}
                            >
                                <CheckCircle size={16} /> Now
                            </button>
                            <button
                                className={`btn ${storeStatus.status === 'later' ? 'btn-primary' : 'btn-outline'}`}
                                onClick={() => updateStoreStatus('later')}
                                style={{ flex: 1, maxWidth: '120px' }}
                            >
                                <Clock size={16} /> Later
                            </button>
                        </div>
                    </div>
                </div>

                {/* COD Status Card */}
                <div className="card" style={{ marginBottom: '2rem', background: 'var(--bg-surface)', padding: '1.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: '150px' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Cash on Delivery:</span>
                            <div className="badge" style={{
                                background: storeStatus.codEnabled ? 'var(--success)' : 'var(--text-muted)',
                                color: 'white',
                                alignSelf: 'flex-start',
                                padding: '0.5rem 1rem',
                                fontSize: '0.8rem',
                                fontWeight: 800
                            }}>
                                {storeStatus.codEnabled ? 'ENABLED' : 'DISABLED'}
                            </div>
                        </div>
                        <button
                            className={`btn ${storeStatus.codEnabled ? 'btn-primary' : 'btn-outline'}`}
                            onClick={async () => {
                                try {
                                    const newStatus = !storeStatus.codEnabled;
                                    await setDoc(doc(db, "settings", "global"), {
                                        ...storeStatus,
                                        codEnabled: newStatus
                                    });
                                    setStoreStatus({ ...storeStatus, codEnabled: newStatus });
                                    toast.success(`COD ${newStatus ? 'Enabled' : 'Disabled'}`);
                                } catch (e) {
                                    toast.error("Failed to update COD settings");
                                }
                            }}
                            style={{ flex: '1 1 auto', maxWidth: '250px' }}
                        >
                            {storeStatus.codEnabled ? 'Disable COD' : 'Enable COD'}
                        </button>
                    </div>
                </div>

                {/* 🚨 Out-of-Stock Alert Banner */}
                {stockAlerts.length > 0 && (
                    <div style={{
                        background: '#fff3cd',
                        border: '1.5px solid #f59e0b',
                        borderRadius: '12px',
                        padding: '1rem 1.2rem',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.8rem'
                    }}>
                        <AlertTriangle size={22} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#92400e', marginBottom: '0.3rem' }}>
                                🚨 Stock Alert — {stockAlerts.length} item{stockAlerts.length > 1 ? 's' : ''} ran out!
                            </div>
                            {stockAlerts.map(alert => (
                                <div key={alert.id} style={{ fontSize: '0.85rem', color: '#78350f', marginBottom: '0.2rem' }}>
                                    • {alert.items?.join(', ')}
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={dismissStockAlerts}
                            style={{ background: '#f59e0b', border: 'none', borderRadius: '9999px', padding: '0.3rem 0.9rem', fontWeight: 700, fontSize: '0.8rem', color: '#fff', cursor: 'pointer', flexShrink: 0 }}
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {activeTab === 'items' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div>
                            {/* Categories Manager */}
                            <div className="card">
                                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Manage Categories</h3>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                    <input
                                        className="input"
                                        placeholder="New Category..."
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                        style={{ padding: '0.6rem 0.8rem', fontSize: '0.9rem', flex: 1, minWidth: '150px' }}
                                    />
                                    <div style={{ position: 'relative', overflow: 'hidden', width: '40px', height: '40px', background: 'var(--bg-input)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border)' }} title="Add Category Image">
                                        <input type="file" accept="image/*" onChange={(e) => setCategoryImageFile(e.target.files[0])} style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                                        {categoryImageFile ? <img src={URL.createObjectURL(categoryImageFile)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Preview" /> : <ImageIcon size={18} color="var(--text-muted)" />}
                                    </div>
                                    <button onClick={handleAddCategory} disabled={loading} className="btn btn-secondary" style={{ padding: '0.6rem 1rem' }}>
                                        {loading ? '...' : <Plus size={18} />}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {categories.map(cat => (
                                        <div key={cat.id} className="badge" style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: '50px' }}>
                                            {cat.image && <img src={cat.image} alt="" style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} />}
                                            {cat.name}
                                            <button onClick={() => handleDeleteCategory(cat.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Add Item Form */}
                            <div className="card">
                                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Plus size={20} color="var(--accent)" /> Add New Item</h3>
                                <form onSubmit={handleAddItem} className="flex-col" style={{ gap: '1rem' }}>
                                    <div>
                                        <label className="label" style={{ fontSize: '0.85rem' }}>Item Name</label>
                                        <input className="input" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} required style={{ padding: '0.6rem 0.8rem', fontSize: '0.9rem' }} />
                                    </div>
                                    <div>
                                        <label className="label" style={{ fontSize: '0.85rem' }}>Category</label>
                                        <select
                                            className="input"
                                            value={newItem.category}
                                            onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                                            style={{ background: 'var(--bg-input)', padding: '0.6rem 0.8rem', fontSize: '0.9rem' }}
                                        >
                                            <option value="">Select Category</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                                            ))}
                                            <option value="General">General</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem' }}>
                                        <div>
                                            <label className="label" style={{ fontSize: '0.75rem', marginBottom: '0.3rem' }}>Wholesale (₹)</label>
                                            <input type="number" className="input" value={newItem.wholesalePrice} onChange={(e) => setNewItem({ ...newItem, wholesalePrice: e.target.value })} placeholder="Cost" style={{ padding: '0.6rem' }} />
                                        </div>
                                        <div>
                                            <label className="label" style={{ fontSize: '0.75rem', marginBottom: '0.3rem' }}>Selling (₹)</label>
                                            <input type="number" className="input" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} required placeholder="Price" style={{ padding: '0.6rem' }} />
                                        </div>
                                        <div>
                                            <label className="label" style={{ fontSize: '0.75rem', marginBottom: '0.3rem' }}>Stock</label>
                                            <input type="number" className="input" value={newItem.stock} onChange={(e) => setNewItem({ ...newItem, stock: e.target.value })} required placeholder="Stock" style={{ padding: '0.6rem' }} />
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
                                    <button className="btn btn-primary" type="submit" disabled={loading} style={{ padding: '0.8rem', fontSize: '1rem' }}>{loading ? 'Processing...' : 'Add Item'}</button>
                                </form>
                            </div>
                        </div>
                        <div>
                            <div className="card">
                                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Package size={20} color="var(--primary)" /> Current Stock</h3>
                                {fetchLoading ? <p style={{ color: 'var(--text-muted)' }}>Loading...</p> : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {items.map(item => (
                                            <div key={item.id} className="card" style={{ padding: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                                                <img src={item.image} alt={item.name} style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <h4 style={{ fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</h4>
                                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Stock: <span style={{ fontWeight: 700, color: item.stock < 10 ? 'var(--danger)' : 'var(--text-main)' }}>{item.stock}</span></p>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                                    <div style={{ textAlign: 'right', minWidth: '50px' }}>
                                                        <div style={{ fontWeight: 'bold', color: 'var(--accent)', fontSize: '1rem' }}>₹{item.price}</div>
                                                        {item.wholesalePrice && (
                                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>C: ₹{item.wholesalePrice}</div>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                                                        <button onClick={() => handleRestock(item)} className="btn btn-ghost" style={{ padding: '0.4rem', color: 'var(--success)', background: 'rgba(36, 150, 63, 0.1)' }} title="Restock">
                                                            <RefreshCcw size={16} />
                                                        </button>
                                                        <button onClick={() => removeItem(item.id)} className="btn btn-ghost" style={{ padding: '0.4rem', color: 'var(--danger)', background: 'rgba(226, 55, 68, 0.1)' }} title="Delete">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>Incoming Orders</h3>
                            <button className="btn btn-sm btn-outline" onClick={fetchOrders} style={{ padding: '0.5rem 1rem' }}>Refresh Lists</button>
                        </div>
                        {/* ... search ... */}
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

                                {orders.filter(o => ['pending', 'preparing', 'accepted', 'ready', 'dispatched'].includes(o.status)).filter(order =>
                                    order.userDetails.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    order.userDetails.room.includes(searchQuery) ||
                                    order.userDetails.phone.includes(searchQuery)
                                ).map(order => (
                                    <div key={order.id} className="card" style={{ padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                                        {/* Header: Name & Amount */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem', paddingBottom: '0.8rem', borderBottom: '1px solid var(--border)' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.3rem' }}>
                                                    {order.userDetails.name}
                                                </div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                    {order.userDetails.hostelBlock} {order.userDetails.hostelBlock && '•'} {order.userDetails.room}
                                                </div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{order.userDetails.phone}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '1.3rem', color: 'var(--primary)' }}>₹{order.totalAmount}</div>
                                                <div style={{
                                                    fontSize: '0.7rem',
                                                    fontWeight: 'bold',
                                                    color: order.paymentMode === 'COD' ? 'var(--warning)' : 'var(--success)',
                                                    marginTop: '0.2rem'
                                                }}>
                                                    {order.paymentMode === 'COD' ? '💵 CASH ON DELIVERY' : '💳 PAID ONLINE'}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Time: {order.userDetails.time}</div>
                                            </div>
                                        </div>

                                        {/* Items List */}
                                        <div style={{ marginBottom: '1rem' }}>
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                {order.itemSnapshot && order.itemSnapshot.map((item, idx) => (
                                                    <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', fontSize: '0.9rem' }}>
                                                        <span style={{ fontWeight: 500 }}>{item.count}x {item.name}</span>
                                                        <span style={{ color: 'var(--text-muted)' }}>₹{item.price * item.count}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                            {order.userDetails.notes && (
                                                <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'var(--bg-subtle)', borderRadius: '6px', fontSize: '0.85rem', border: '1px dashed var(--warning)' }}>
                                                    <strong style={{ color: 'var(--warning-dark)' }}>Note:</strong> {order.userDetails.notes}
                                                </div>
                                            )}
                                        </div>

                                        {/* Status Badge & Action Buttons */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                            {/* Status Badge */}
                                            <div className="badge" style={{
                                                textTransform: 'uppercase',
                                                backgroundColor: 'var(--accent)',
                                                color: 'white',
                                                alignSelf: 'flex-start',
                                                padding: '0.4rem 0.8rem',
                                                fontSize: '0.75rem',
                                                fontWeight: 700
                                            }}>
                                                {order.status}
                                            </div>

                                            {/* Action Buttons */}
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <button
                                                    className="btn btn-secondary"
                                                    onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                                    style={{
                                                        color: 'var(--danger)',
                                                        padding: '0.5rem 1rem',
                                                        fontSize: '0.85rem',
                                                        flex: '1 1 auto',
                                                        minWidth: '80px'
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                                {order.status !== 'dispatched' && (
                                                    <button
                                                        className="btn btn-secondary"
                                                        onClick={() => updateOrderStatus(order.id, 'dispatched')}
                                                        style={{
                                                            color: 'var(--accent)',
                                                            borderColor: 'var(--accent)',
                                                            padding: '0.5rem 1rem',
                                                            fontSize: '0.85rem',
                                                            flex: '1 1 auto',
                                                            minWidth: '100px'
                                                        }}
                                                    >
                                                        Dispatched 🏍️
                                                    </button>
                                                )}
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={() => updateOrderStatus(order.id, 'completed')}
                                                    style={{
                                                        background: 'var(--success)',
                                                        padding: '0.5rem 1rem',
                                                        fontSize: '0.85rem',
                                                        flex: '1 1 auto',
                                                        minWidth: '100px'
                                                    }}
                                                >
                                                    Mark Done
                                                </button>
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
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button className="btn btn-outline" onClick={fetchOrders}>Refresh</button>
                                <button className="btn btn-danger" onClick={archiveAllHistory}>Clear All</button>
                            </div>
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
                                {orders.filter(o => o.status !== 'pending' && !o.archived).filter(order =>
                                    order.userDetails.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    order.userDetails.room.includes(searchQuery) ||
                                    order.userDetails.phone.includes(searchQuery)
                                ).length === 0 && <p style={{ color: 'var(--text-muted)' }}>No past orders found.</p>}

                                {orders.filter(o => o.status !== 'pending' && !o.archived).filter(order =>
                                    order.userDetails.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    order.userDetails.room.includes(searchQuery) ||
                                    order.userDetails.phone.includes(searchQuery)
                                ).map(order => (
                                    <div key={order.id} className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border)', opacity: 0.8 }}>
                                        <div className="flex-between" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{order.userDetails.name}</div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                    {order.userDetails.hostelBlock} {order.userDetails.hostelBlock && '•'} {order.userDetails.room}
                                                </div>
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
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                {order.status === 'completed' && <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={16} /> Completed</span>}
                                                {order.status === 'cancelled' && <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><X size={16} /> Cancelled</span>}
                                                <button onClick={() => archiveOrder(order.id)} className="btn btn-outline" style={{ border: 'none', color: 'var(--text-muted)' }} title="Remove from View">
                                                    <Trash2 size={16} />
                                                </button>
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
                                <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Est. Net Profit</div>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>
                                    {(() => {
                                        const totalProfit = orders.filter(o => o.status === 'completed').reduce((acc, order) => {
                                            const orderProfit = (order.itemSnapshot || []).reduce((itemAcc, item) => {
                                                const sellingPrice = Number(item.price) || 0;
                                                // 1. Try snapshot, 2. Try current item list, 3. Fallback to 0 (Revenue=Profit if cost unknown)
                                                // Ideally if cost unknown, we might not want to count it, but for now let's assume 0 cost if missing to avoid negative assumptions?
                                                // Actually, if we don't know the cost, treating SellingPrice as Profit is WRONG but better than 0.
                                                // Let's try to look up current item cost.
                                                let wholesalePrice = item.wholesalePrice !== undefined ? Number(item.wholesalePrice) : undefined;

                                                if (wholesalePrice === undefined || isNaN(wholesalePrice)) {
                                                    const currentItem = items.find(i => i.id === item.id);
                                                    wholesalePrice = currentItem ? Number(currentItem.wholesalePrice || 0) : 0;
                                                }

                                                const profitPerItem = sellingPrice - wholesalePrice;
                                                return itemAcc + (profitPerItem * (item.count || 1));
                                            }, 0);
                                            return acc + orderProfit;
                                        }, 0);
                                        return `₹${totalProfit.toLocaleString()}`;
                                    })()}
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


                        {/* Data Management */}
                        <div className="card" style={{ marginTop: '2rem', border: '1px solid var(--danger)' }}>
                            <h3 style={{ marginBottom: '1rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Trash2 size={20} /> Archived Orders (Data Management)
                            </h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                These orders are hidden from the main History tab but still count towards your Total Revenue.
                                <br />You can <strong>Restore</strong> them to history or <strong>Permanently Delete</strong> them (which removes revenue).
                            </p>

                            {orders.filter(o => o.archived).length === 0 ? (
                                <p style={{ fontStyle: 'italic', opacity: 0.7 }}>No archived orders found.</p>
                            ) : (
                                <div className="flex-col" style={{ gap: '0.5rem' }}>
                                    {/* Bulk Actions */}
                                    <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <input
                                                type="checkbox"
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedOrders(orders.filter(o => o.archived).map(o => o.id));
                                                    } else {
                                                        setSelectedOrders([]);
                                                    }
                                                }}
                                                checked={orders.filter(o => o.archived).length > 0 && selectedOrders.length === orders.filter(o => o.archived).length}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Select All</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {selectedOrders.length > 0 && (
                                                <button onClick={deleteSelected} className="btn btn-danger btn-sm" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    <Trash2 size={16} /> Delete Selected ({selectedOrders.length})
                                                </button>
                                            )}
                                            <button onClick={deleteAllPermanent} className="btn btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                                                Clear All Archived
                                            </button>
                                        </div>
                                    </div>

                                    {/* Table Header */}
                                    <div className="flex-between" style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                        <div style={{ width: '40px' }}></div>
                                        <div style={{ flex: 1 }}>Date</div>
                                        <div style={{ flex: 1 }}>User</div>
                                        <div style={{ flex: 1, textAlign: 'right' }}>Amount</div>
                                        <div style={{ width: '150px', textAlign: 'right' }}>Actions</div>
                                    </div>

                                    {/* Rows */}
                                    {orders.filter(o => o.archived).sort((a, b) => b.timestamp.seconds - a.timestamp.seconds).map(order => (
                                        <div key={order.id} className="flex-between" style={{ padding: '0.75rem', background: selectedOrders.includes(order.id) ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-body)', borderRadius: '4px', border: selectedOrders.includes(order.id) ? '1px solid var(--danger)' : 'none' }}>
                                            <div style={{ width: '40px', display: 'flex', alignItems: 'center' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedOrders.includes(order.id)}
                                                    onChange={() => toggleSelectOrder(order.id)}
                                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                />
                                            </div>
                                            <div style={{ flex: 1, fontSize: '0.9rem' }}>
                                                {new Date(order.timestamp.seconds * 1000).toLocaleDateString()}
                                            </div>
                                            <div style={{ flex: 1, fontWeight: '500' }}>
                                                {order.userDetails.name}
                                            </div>
                                            <div style={{ flex: 1, textAlign: 'right', fontWeight: 'bold' }}>
                                                ₹{order.totalAmount}
                                            </div>
                                            <div style={{ width: '150px', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => restoreOrder(order.id)}
                                                    className="btn btn-outline btn-sm"
                                                    title="Restore to History"
                                                >
                                                    <History size={14} />
                                                </button>
                                                <button
                                                    onClick={() => deletePermanent(order.id)}
                                                    className="btn btn-danger btn-sm"
                                                    title="Delete Forever"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>

            {/* OTP Verification Modal */}
            {otpModal.isOpen && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
                    zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }}>
                    <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2rem', border: '1px solid var(--accent)' }}>
                        <div className="flex-between" style={{ marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CheckCircle color="var(--accent)" /> Verify Delivery
                            </h3>
                            <button onClick={() => setOtpModal({ isOpen: false, orderId: null })} className="btn btn-ghost" style={{ padding: '0.25rem' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', textAlign: 'center' }}>
                            Ask the student for the <strong>4-digit PIN</strong> to complete this order.
                        </p>

                        <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <input
                                    autoFocus
                                    className="input"
                                    type="text"
                                    placeholder="Enter PIN"
                                    value={otpInput}
                                    onChange={(e) => setOtpInput(e.target.value)}
                                    maxLength={4}
                                    style={{
                                        fontSize: '2rem',
                                        textAlign: 'center',
                                        letterSpacing: '0.5rem',
                                        padding: '1rem',
                                        width: '200px',
                                        fontWeight: 'bold'
                                    }}
                                />
                            </div>

                            <button type="submit" className="btn btn-primary" style={{ padding: '1rem', fontSize: '1.1rem' }}>
                                Verify & Complete
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div >
    );
};

export default AdminDashboard;
