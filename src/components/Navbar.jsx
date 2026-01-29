import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, LogOut, Shield, UtensilsCrossed, Menu, X } from 'lucide-react';

import ThemeToggle from './ThemeToggle';

const Navbar = ({ role }) => {
    // ... existing ... 
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = React.useState(false);

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/');
    };

    const toggleMenu = () => setIsOpen(!isOpen);
    const closeMenu = () => setIsOpen(false);

    return (
        <nav className="nav animate-fade-in">
            <div className="container nav-content">
                <Link to={role === 'admin' ? '/admin' : '/menu'} className="nav-logo text-gradient" onClick={closeMenu}>
                    <UtensilsCrossed size={28} style={{ color: 'var(--primary)' }} />
                    <span>Hostel Bites</span>
                    {role === 'admin' && <span className="badge badge-primary">Admin</span>}
                </Link>

                <div className="flex-center" style={{ gap: '1rem', marginLeft: 'auto', marginRight: '1rem' }}>
                    <ThemeToggle />
                </div>

                {/* Mobile Menu Toggle */}
                <button className="mobile-toggle btn-ghost" onClick={toggleMenu} aria-label="Toggle menu">
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>

                {/* Desktop & Mobile Navigation */}
                <div className={`nav-links ${isOpen ? 'active' : ''}`}>
                    {role === 'user' && (
                        <>
                            <Link to="/menu" className="btn btn-secondary" onClick={closeMenu}>Menu</Link>
                            <Link to="/orders" className="btn btn-secondary" onClick={closeMenu}>My Orders</Link>
                        </>
                    )}
                    <button onClick={handleLogout} className="btn btn-outline" title="Logout">
                        <LogOut size={18} />
                        <span className="mobile-only">Logout</span>
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
