
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const PaymentSuccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('processing'); // processing, success, fail
    const orderId = searchParams.get('id');
    const processedRef = React.useRef(false); // IDEMPOTENCY LOCK

    useEffect(() => {
        if (!orderId || processedRef.current) { // Check if already processed
            if (!orderId) setStatus('fail');
            return;
        }

        processedRef.current = true; // Lock immediately

        const handleOrderCompletion = async () => {
            const pendingOrderStr = localStorage.getItem('pending_order_DATA');
            if (!pendingOrderStr) {
                console.error("No pending order data found");
                setStatus('fail');
                return;
            }

            const pendingData = JSON.parse(pendingOrderStr);
            console.log("Processing order for ID:", orderId);

            if (pendingData.orderId !== orderId) {
                console.warn("Order ID mismatch");
            }

            try {
                // VERIFY PAYMENT STATUS FIRST
                const res = await fetch(`http://localhost:5000/api/status/${orderId}`);
                const statusData = await res.json();

                if (statusData.code !== 'PAYMENT_SUCCESS') {
                    console.error("Payment not successful:", statusData);
                    setStatus('fail');
                    toast.error(`Payment failed: ${statusData.message || statusData.code}`);
                    return;
                }

                // Save Order to Firestore only if Payment is Success
                await addDoc(collection(db, "orders"), {
                    userDetails: pendingData.userDetails,
                    items: pendingData.items,
                    itemSnapshot: pendingData.itemSnapshot,
                    totalAmount: pendingData.totalAmount,
                    paymentId: orderId,
                    status: 'pending',
                    timestamp: new Date()
                });

                // Update Stock
                await Promise.all(Object.entries(pendingData.items).map(async ([itemId, count]) => {
                    const itemRef = doc(db, "items", itemId);
                    await updateDoc(itemRef, {
                        stock: increment(-count)
                    });
                }));

                // Clear Local Storage
                localStorage.removeItem('pending_order_DATA');
                localStorage.removeItem('pending_cart');

                setStatus('success');
                toast.success("Order placed successfully!");

                // Auto-Redirect to Orders Page
                setTimeout(() => {
                    navigate('/orders');
                }, 2000);

            } catch (error) {
                console.error("Error verifying/saving order:", error);
                setStatus('fail');
                toast.error("An error occurred while processing the order.");
            }
        };

        // Artificial delay or verify call could go here
        handleOrderCompletion();

    }, [orderId]);

    return (
        <div className="flex-center" style={{ minHeight: '100vh', padding: '1rem' }}>
            <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '450px', padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {status === 'processing' && (
                    <div className="animate-fade-in" style={{ opacity: 0.8 }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Verifying Payment...</h2>
                        <p style={{ color: 'var(--text-muted)' }}>Please wait while we confirm your order.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="animate-fade-in">
                        <div className="flex-center" style={{ marginBottom: '1rem' }}>
                            <CheckCircle size={64} style={{ color: 'var(--success)' }} />
                        </div>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Payment Successful!</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Your order has been placed successfully.</p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button onClick={() => navigate('/menu')} className="btn btn-primary">Order More</button>
                            <button onClick={() => navigate('/orders')} className="btn btn-outline">View Orders</button>
                        </div>
                    </div>
                )}

                {status === 'fail' && (
                    <div className="animate-fade-in">
                        <div className="flex-center" style={{ marginBottom: '1rem' }}>
                            <XCircle size={64} style={{ color: 'var(--danger)' }} />
                        </div>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Order Failed</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Something went wrong while processing your order info.</p>

                        {/* RECOVERY OPTION */}
                        <div style={{ background: '#f9f9f9', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '1.5rem', textAlign: 'left', border: '1px solid var(--border)' }}>
                            <p style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--warning)' }}>Wait! Did you just pay?</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>If money was deducted but you see this, we can check the server directly.</p>
                            <button
                                onClick={async () => {
                                    try {
                                        toast.loading("Checking PhonePe Server...");
                                        const res = await fetch(`http://localhost:5000/api/status/${orderId}`);
                                        const data = await res.json();
                                        if (data.code === 'PAYMENT_SUCCESS') {
                                            toast.dismiss();
                                            toast.success("Payment Verified! Contact Admin to add order manually.");
                                            // Ideally we recreate order here if possible, but we lost cart data.
                                        } else {
                                            toast.dismiss();
                                            toast.error("Payment not found or failed: " + data.code);
                                        }
                                    } catch (e) {
                                        toast.dismiss();
                                        toast.error("Could not verify status.");
                                    }
                                }}
                                className="btn btn-outline btn-sm"
                                style={{ width: '100%' }}
                            >
                                Verify Status on Server
                            </button>
                        </div>

                        <button onClick={() => navigate('/menu')} className="btn btn-primary" style={{ width: '100%' }}>Back to Menu</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentSuccess;
