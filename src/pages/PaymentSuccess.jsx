
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

    useEffect(() => {
        if (!orderId) {
            setStatus('fail');
            return;
        }

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
                const statusRes = await fetch(`http://localhost:5000/api/status/${orderId}`);
                const statusData = await statusRes.json();

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
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="card max-w-md w-full text-center p-8 space-y-6">
                {status === 'processing' && (
                    <div className="animate-pulse">
                        <h2 className="text-2xl font-bold mb-2">Verifying Payment...</h2>
                        <p className="text-muted">Please wait while we confirm your order.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="animate-fade-in">
                        <div className="flex justify-center mb-4">
                            <CheckCircle size={64} className="text-green-500" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
                        <p className="text-muted mb-6">Your order has been placed. Redirecting to your orders...</p>
                        <div className="flex gap-4 justify-center">
                            <button onClick={() => navigate('/menu')} className="btn btn-primary">Order More</button>
                            <button onClick={() => navigate('/orders')} className="btn btn-outline">View Orders</button>
                        </div>
                    </div>
                )}

                {status === 'fail' && (
                    <div className="animate-fade-in">
                        <div className="flex justify-center mb-4">
                            <XCircle size={64} className="text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Order Failed</h2>
                        <p className="text-muted mb-6">Something went wrong while processing your order info.</p>

                        {/* RECOVERY OPTION */}
                        <div className="bg-gray-800 p-4 rounded mb-4 text-left">
                            <p className="text-sm font-bold mb-2 text-warning">Wait! Did you just pay?</p>
                            <p className="text-xs text-muted mb-2">If money was deducted but you see this, we can check the server directly.</p>
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
                                className="btn btn-outline btn-sm w-full"
                            >
                                Verify Status on Server
                            </button>
                        </div>

                        <button onClick={() => navigate('/menu')} className="btn btn-primary">Back to Menu</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentSuccess;
