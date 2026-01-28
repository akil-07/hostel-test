
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
                // Determine if already processed or just missing data
                console.error("No pending order data found");
                setStatus('fail');
                return;
            }

            const pendingData = JSON.parse(pendingOrderStr);
            console.log("Processing order for ID:", orderId);

            // Verify orderId matches (optional but good)
            if (pendingData.orderId !== orderId) {
                console.warn("Order ID mismatch");
                // Continue or fail? Let's proceed assuming user just paid for the latest one.
            }

            try {
                // Save Order to Firestore
                await addDoc(collection(db, "orders"), {
                    userDetails: pendingData.userDetails,
                    items: pendingData.items,
                    itemSnapshot: pendingData.itemSnapshot,
                    totalAmount: pendingData.totalAmount,
                    paymentId: orderId, // The PhonePe Trans ID
                    status: 'pending', // Order status in hostel system
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
                localStorage.removeItem('pending_cart'); // If you saved cart separately

                setStatus('success');
                toast.success("Order placed successfully!");

            } catch (error) {
                console.error("Error saving order:", error);
                setStatus('fail');
                toast.error("Payment successful but failed to save order.");
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
                        <p className="text-muted mb-6">Your order has been placed and sent to the kitchen.</p>
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
                        <p className="text-muted mb-6">Something went wrong while processing your order info. If money was deducted, please contact support.</p>
                        <button onClick={() => navigate('/menu')} className="btn btn-primary">Back to Menu</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentSuccess;
