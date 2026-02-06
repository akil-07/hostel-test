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
        <nav className="nav animate-fade-in" style={{ zIndex: 1000, height: '70px', display: 'flex', alignItems: 'center', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
            <div className="container nav-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', height: '100%' }}>
                <Link to={role === 'admin' ? '/admin' : '/menu'} className="nav-logo text-gradient" onClick={closeMenu} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', minWidth: 'fit-content' }}>
                    <UtensilsCrossed size={28} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>Hostel Bites</span>
                    {role === 'admin' && <span className="badge badge-primary" style={{ marginLeft: '0.5rem' }}>Admin</span>}
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
