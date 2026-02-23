import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, LogOut, Shield, UtensilsCrossed, Menu, X } from 'lucide-react';

import ThemeToggle from './ThemeToggle';

const Navbar = ({ role }) => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = React.useState(false);

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/');
    };

    const toggleMenu = () => setIsOpen(!isOpen);
    const closeMenu = () => setIsOpen(false);

    return (
        <nav className="nav animate-fade-in" style={{ zIndex: 1000, height: '64px', display: 'flex', alignItems: 'center', background: 'var(--header-bg)', borderBottom: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}>
            <div className="container nav-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', height: '100%' }}>
                <Link to={role === 'admin' ? '/admin' : '/menu'} className="nav-logo" onClick={closeMenu} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 'fit-content' }}>
                    <img
                        src="/logo.png"
                        alt="Hostel Bites Logo"
                        style={{ height: '42px', width: 'auto', objectFit: 'contain', borderRadius: '8px' }}
                    />
                    {role === 'admin' && <span className="badge" style={{ marginLeft: '0.5rem', background: 'var(--primary)', color: '#1a1a1a', fontSize: '0.7rem' }}>Admin</span>}
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                    <ThemeToggle />

                    {/* Mobile Menu Toggle */}
                    <button className="mobile-toggle btn-ghost" onClick={toggleMenu} aria-label="Toggle menu" style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isOpen ? <X size={24} color="var(--text-main)" /> : <Menu size={24} color="var(--text-main)" />}
                    </button>
                </div>

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
