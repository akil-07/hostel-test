import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Clock, User } from 'lucide-react';

const BottomNav = ({ activeTab }) => {
    const navigate = useNavigate();

    const items = [
        { tab: 'menu', icon: ShoppingBag, label: 'Delivery', path: '/menu' },
        { tab: 'orders', icon: Clock, label: 'History', path: '/orders' },
        { tab: 'profile', icon: User, label: 'Profile', path: '/profile' },
    ];

    return (
        <div className="bottom-nav">
            {items.map(({ tab, icon: Icon, label, path }) => {
                const isActive = activeTab === tab;
                return (
                    <div
                        key={tab}
                        className={`nav-item ${isActive ? 'active' : ''}`}
                        onClick={() => navigate(path)}
                        style={{ color: isActive ? 'var(--primary-dark)' : 'var(--text-muted)' }}
                    >
                        <Icon
                            size={22}
                            strokeWidth={isActive ? 2.5 : 1.8}
                            color={isActive ? 'var(--primary)' : 'var(--text-muted)'}
                        />
                        <span style={{ fontWeight: isActive ? 700 : 500 }}>{label}</span>
                    </div>
                );
            })}
        </div>
    );
};

export default BottomNav;

