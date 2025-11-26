// Enhanced animation controller
class EnhancedAnimator {
    constructor() {
        this.setupEventListeners();
        this.createParticles();
        this.setupScrollReveal();
        this.setupRippleEffects();
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupEnhancedAnimations();
            this.setupLoadingBar();
        });
    }

    createParticles() {
        // Remove existing particles
        const existingParticles = document.querySelector('.floating-particles');
        if (existingParticles) {
            existingParticles.remove();
        }

        const particlesContainer = document.createElement('div');
        particlesContainer.className = 'floating-particles';
        
        // Create more particles for better effect
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // Random properties
            const size = Math.random() * 6 + 2;
            const left = Math.random() * 100;
            const top = Math.random() * 100;
            const animationDuration = Math.random() * 30 + 20;
            const animationDelay = Math.random() * 20;
            
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${left}%`;
            particle.style.top = `${top}%`;
            particle.style.animationDuration = `${animationDuration}s`;
            particle.style.animationDelay = `${animationDelay}s`;
            
            particlesContainer.appendChild(particle);
        }
        
        document.body.appendChild(particlesContainer);
    }

    setupEnhancedAnimations() {
        // Add hover effects to all interactive elements
        this.setupHoverEffects();
        
        // Setup staggered animations for lists
        this.setupStaggeredAnimations();
    }

    setupHoverEffects() {
        const interactiveElements = document.querySelectorAll('.btn, .card, .nav-link, .dashboard-section, .package-card, .step, .contact-item');
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', this.handleHoverEnter.bind(this));
            el.addEventListener('mouseleave', this.handleHoverLeave.bind(this));
        });
    }

    handleHoverEnter(e) {
        const element = e.target;
        element.style.transition = 'all 0.3s ease';
    }

    handleHoverLeave(e) {
        const element = e.target;
        // Reset transform
        element.style.transform = '';
    }

    setupStaggeredAnimations() {
        const staggerElements = document.querySelectorAll('.dashboard-sections, .steps, .pricing-cards, .footer-content');
        staggerElements.forEach(container => {
            const children = container.children;
            Array.from(children).forEach((child, index) => {
                child.style.animationDelay = `${index * 0.1}s`;
                child.classList.add('animate-fade-in');
            });
        });
    }

    setupScrollReveal() {
        const revealElements = document.querySelectorAll('.reveal');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, { 
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        revealElements.forEach(el => observer.observe(el));
    }

    setupRippleEffects() {
        document.addEventListener('click', function(e) {
            const target = e.target;
            if (target.classList.contains('btn') || target.classList.contains('nav-link')) {
                createRipple(e, target);
            }
        });

        function createRipple(event, element) {
            const circle = document.createElement('span');
            const diameter = Math.max(element.clientWidth, element.clientHeight);
            const radius = diameter / 2;

            circle.style.width = circle.style.height = `${diameter}px`;
            circle.style.left = `${event.clientX - element.getBoundingClientRect().left - radius}px`;
            circle.style.top = `${event.clientY - element.getBoundingClientRect().top - radius}px`;
            circle.classList.add('ripple');

            element.appendChild(circle);

            setTimeout(() => {
                circle.remove();
            }, 600);
        }
    }

    setupLoadingBar() {
        const loadingBar = document.createElement('div');
        loadingBar.className = 'loading-bar';
        document.body.appendChild(loadingBar);

        // Simulate loading
        loadingBar.classList.add('loading');
        
        setTimeout(() => {
            loadingBar.classList.add('complete');
            setTimeout(() => {
                loadingBar.remove();
            }, 1000);
        }, 1000);
    }

    // Enhanced page transitions
    pageTransitionOut(destination, callback) {
        const mainContainer = document.querySelector('.main-container');
        if (mainContainer) {
            mainContainer.style.opacity = '0';
            mainContainer.style.transform = 'translateY(20px)';
            mainContainer.style.transition = 'all 0.5s ease';
        }

        setTimeout(() => {
            if (callback) callback();
            if (destination) window.location.href = destination;
        }, 500);
    }

    // Shake element for errors
    shakeElement(element) {
        element.classList.add('shake');
        setTimeout(() => {
            element.classList.remove('shake');
        }, 500);
    }

    // Animate counter
    animateCounter(element, target, duration = 2000) {
        let start = 0;
        const increment = target / (duration / 16);
        const timer = setInterval(() => {
            start += increment;
            if (start >= target) {
                element.textContent = target;
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(start);
            }
        }, 16);
    }
}

// Initialize enhanced animator
window.enhancedAnimator = new EnhancedAnimator();

// Add enhanced keyframe animations
const enhancedStyle = document.createElement('style');
enhancedStyle.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    @keyframes backgroundShift {
        0%, 100% { transform: scale(1) rotate(0deg); }
        50% { transform: scale(1.05) rotate(1deg); }
    }
    
    @keyframes backgroundPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.8; }
    }
    
    @keyframes float {
        0% { transform: translateY(0) rotate(0deg); }
        100% { transform: translateY(-100vh) rotate(360deg); }
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(enhancedStyle);

