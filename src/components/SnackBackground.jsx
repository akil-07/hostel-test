import React, { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

const SnackBackground = () => {
    const canvasRef = useRef(null);
    const { theme } = useTheme();

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let scrollY = window.scrollY;
        let lastScrollY = window.scrollY;

        // Professional food icons (Emojis are high fidelity and standard)
        const snacks = ['🍟', '🥤', '🍕', '🍿', '🍔', '🌭', '🥪', '🍩', '🍪'];
        const items = [];
        const itemCount = 20;

        class FloatingSnack {
            constructor() {
                this.reset(true);
            }

            reset(randomY = false) {
                this.icon = snacks[Math.floor(Math.random() * snacks.length)];
                this.x = Math.random() * canvas.width;
                this.y = randomY ? Math.random() * canvas.height : canvas.height + 50;
                this.size = 30 + Math.random() * 40; // 30px to 70px
                this.speed = 0.5 + Math.random() * 0.5;
                this.angle = Math.random() * 360;
                this.spinSpeed = (Math.random() - 0.5) * 0.02;
                this.opacity = theme === 'dark' ? 0.08 : 0.15; // Lower opacity in dark mode
            }

            update(scrollDelta) {
                this.y -= this.speed;
                this.angle += this.spinSpeed;
                this.y -= scrollDelta * 0.2;
                this.x += Math.sin(this.y * 0.01) * 0.5;

                if (this.y < -100) {
                    this.y = canvas.height + 100;
                    this.x = Math.random() * canvas.width;
                } else if (this.y > canvas.height + 100) {
                    this.y = -100;
                    this.x = Math.random() * canvas.width;
                }
            }

            draw(ctx) {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.angle);
                ctx.globalAlpha = this.opacity;
                ctx.font = `${this.size}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // In dark mode, we might want to apply a filter to make emojis blend better, 
                // but emojis are generally colored. 
                // Lower opacity is sufficient for dark mode.

                ctx.fillText(this.icon, 0, 0);
                ctx.restore();
            }
        }

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const init = () => {
            resize();
            items.length = 0;
            for (let i = 0; i < itemCount; i++) {
                items.push(new FloatingSnack());
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas

            const currentScrollY = window.scrollY;
            const scrollDelta = currentScrollY - lastScrollY;

            items.forEach(item => {
                item.update(scrollDelta);
                item.draw(ctx);
            });

            lastScrollY = currentScrollY;
            animationFrameId = requestAnimationFrame(animate);
        };

        window.addEventListener('resize', resize);
        window.addEventListener('scroll', () => scrollY = window.scrollY);

        init();
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [theme]); // Re-run when theme changes

    // Dynamic gradient based on theme
    const getGradient = () => {
        if (theme === 'dark') {
            return 'linear-gradient(135deg, #121212 0%, #1a1a1a 100%)';
        }
        return 'linear-gradient(135deg, #ffffff 0%, #fcfcfc 100%)';
    };

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: -1,
                pointerEvents: 'none',
                background: getGradient(),
                transition: 'background 0.5s ease'
            }}
        />
    );
};

export default SnackBackground;
