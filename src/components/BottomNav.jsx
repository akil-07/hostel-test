import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Clock, User } from 'lucide-react';

const BottomNav = ({ activeTab }) => {
    const navigate = useNavigate();

    return (
        <div className="bottom-nav">
            <div
                className={`nav-item ${activeTab === 'menu' ? 'active' : ''}`}
                onClick={() => navigate('/menu')}
            >
                <ShoppingBag size={24} />
                <span style={{ fontWeight: 600 }}>Delivery</span>
            </div>
            <div
                className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
                onClick={() => navigate('/orders')}
            >
                <Clock size={24} />
                <span>History</span>
            </div>
            <div
                className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => navigate('/profile')}
            >
                <User size={24} />
                <span>Profile</span>
            </div>
        </div>
    );
};

export default BottomNav;
