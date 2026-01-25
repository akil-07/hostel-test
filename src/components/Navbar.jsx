import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, LogOut, Coffee, Shield } from 'lucide-react';

const Navbar = ({ role }) => {
    const navigate = useNavigate();
    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/');
    };

    return (
        <nav className="nav animate-fade-in">
            <div className="container nav-content">
                <Link to={role === 'admin' ? '/admin' : '/menu'} className="nav-logo text-gradient">
                    <Coffee size={24} />
                    <span>Hostel Bites</span>
                    {role === 'admin' && <span className="badge badge-primary">Admin</span>}
                </Link>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {role === 'user' && (
                        <>
                            <Link to="/menu" className="btn btn-secondary">Menu</Link>
                            <Link to="/orders" className="btn btn-secondary">My Orders</Link>
                        </>
                    )}
                    <button onClick={handleLogout} className="btn btn-outline" title="Logout">
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
