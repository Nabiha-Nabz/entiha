// auth.js (updated - await auth check, storage sync, fallback)
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Auth.js loaded successfully');

    // Initialize mobile menu
    initMobileMenu();

    // Wait for auth check to finish before updating navigation
    try {
        const authResult = await checkExistingAuth();
        // If the check failed due to network, we still want to update nav
        // using any existing localStorage user data.
        updateNavigation();
    } catch (err) {
        // Safety: still update nav using localStorage fallback
        console.warn('Auth check error (handled):', err);
        updateNavigation();
    }

    // Setup signup/login/forgot password handlers (if forms exist)
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        console.log('Signup form found');
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Signup form submitted');
            handleSignup();
        });
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        console.log('Login form found');
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Login form submitted');
            handleLogin();
        });
    }

    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
        console.log('Forgot password form found');
        forgotPasswordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Forgot password form submitted');
            handleForgotPassword();
        });
    }

    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            showForgotPassword();
        });
    }

    const closeModal = document.getElementById('closeForgotPassword');
    if (closeModal) {
        closeModal.addEventListener('click', hideForgotPassword);
    }

    const cancelForgotPassword = document.getElementById('cancelForgotPassword');
    if (cancelForgotPassword) {
        cancelForgotPassword.addEventListener('click', hideForgotPassword);
    }

    // Update nav if localStorage changes (login/logout in other tab)
    window.addEventListener('storage', (e) => {
        if (e.key === 'currentUser') {
            updateNavigation();
        }
    });
});

function initMobileMenu() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (toggle && navLinks) {
        toggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            toggle.innerHTML = navLinks.classList.contains('active') ? '✕' : '☰';
        });

        // Close mobile menu when clicking on a link
        navLinks.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') {
                navLinks.classList.remove('active');
                toggle.innerHTML = '☰';
            }
        });
    }
}

async function checkExistingAuth() {
    try {
        const result = await API.checkAuth();
        console.log('Auth check result:', result);

        if (result && result.success) {
            // User is logged in, store user data
            localStorage.setItem('currentUser', JSON.stringify(result.user));

            const currentPage = window.location.pathname;
            const user = result.user;

            // Redirect logic: only redirect from login/signup pages if authenticated
            if (currentPage.includes('login.html') || currentPage.includes('signup.html')) {
                if (user.role === 'admin') {
                    window.location.href = 'admin-dashboard.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            }
        } else {
            // User is not authenticated
            const currentPage = window.location.pathname;

            // Only redirect to login if on protected pages and not authenticated
            if (currentPage.includes('dashboard.html') ||
                currentPage.includes('admin-dashboard.html') ||
                currentPage.includes('profile.html') ||
                currentPage.includes('packages.html')) {
                showMessage('Please login to access this page', 'error');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            }

            // Ensure localStorage doesn't contain stale user
            localStorage.removeItem('currentUser');
        }

        return result;
    } catch (error) {
        console.error('Auth check failed:', error);
        // Don't redirect on network errors, just log the error
        // Return a failure-like object so caller can decide
        return { success: false, error: error.message || String(error) };
    }
}

function updateNavigation() {
    const userRaw = localStorage.getItem('currentUser');
    let user = null;
    try {
        user = userRaw ? JSON.parse(userRaw) : null;
    } catch (e) {
        console.warn('Failed to parse currentUser from localStorage', e);
        user = null;
    }

    const navLinks = document.querySelector('.nav-links');

    if (!navLinks) return;

    if (user) {
        // User is logged in - show dashboard links and logout
        let dashboardHtml = '';

        if (user.role === 'admin') {
            dashboardHtml = `
                <a href="admin-dashboard.html" class="nav-link">Admin Dashboard</a>
                <a href="#" class="nav-link" id="logoutBtn">Logout</a>
            `;
        } else {
            dashboardHtml = `
                <a href="dashboard.html" class="nav-link">Dashboard</a>
                <a href="profile.html" class="nav-link">Profile</a>
                <a href="packages.html" class="nav-link">Packages</a>
                <a href="contact.html" class="nav-link">Contact</a>
                <a href="#" class="nav-link" id="logoutBtn">Logout</a>
            `;
        }

        navLinks.innerHTML = dashboardHtml;

        // Add logout event listener (after HTML injected)
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                logout();
            });
        }

        // Update active link using path filename
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        // Remove active from all links
        navLinks.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        // Find matching link by href (exact match)
        const activeLink = Array.from(navLinks.querySelectorAll('a')).find(a => {
            const href = a.getAttribute('href');
            return href === currentPage || href === `/${currentPage}`;
        });
        if (activeLink) activeLink.classList.add('active');
    } else {
        // User is not logged in - show public links
        navLinks.innerHTML = `
            <a href="index.html" class="nav-link">Home</a>
            <a href="index.html#how-it-works" class="nav-link">How It Works</a>
            <a href="index.html#pricing" class="nav-link">Pricing</a>
            <a href="contact.html" class="nav-link">Contact</a>
            <a href="login.html" class="nav-link btn-outline">Login</a>
            <a href="signup.html" class="nav-link btn-primary">Sign Up</a>
        `;

        // Update active link
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        navLinks.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        const activeLink = Array.from(navLinks.querySelectorAll('a')).find(a => {
            const href = a.getAttribute('href');
            return href === currentPage || href === `/${currentPage}`;
        });
        if (activeLink) activeLink.classList.add('active');
    }
}

async function handleSignup() {
    console.log('Starting signup process...');

    // Collect all selected skills
    const selectedSkills = [];
    const skillCheckboxes = document.querySelectorAll('.skill-checkbox:checked');
    skillCheckboxes.forEach(checkbox => {
        selectedSkills.push(checkbox.value);
    });

    const formData = {
        name: document.getElementById('name')?.value || '',
        email: document.getElementById('email')?.value || '',
        phone: document.getElementById('phone')?.value || '',
        skills: selectedSkills,
        job_preferences: document.getElementById('jobPreferences')?.value || '',
        job_account_email: document.getElementById('jobEmail')?.value || '',
        job_account_password: document.getElementById('jobPassword')?.value || '',
        password: document.getElementById('password')?.value || ''
    };

    console.log('Form data collected');

    // Validation
    const confirmPassword = document.getElementById('confirmPassword')?.value || '';
    if (formData.password !== confirmPassword) {
        showMessage('Passwords do not match!', 'error');
        return;
    }

    if (!validatePassword(formData.password)) {
        showMessage('Password must be at least 8 characters long and contain uppercase, lowercase letters and numbers', 'error');
        return;
    }

    try {
        console.log('Sending signup request...');
        const result = await API.signup(formData);
        console.log('Signup response:', result);

        if (result && result.success) {
            showMessage(result.message || 'Account created successfully!');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } else {
            showMessage(result?.message || 'Signup failed!', 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showMessage('Network error. Please check if backend server is running.', 'error');
    }
}

async function handleLogin() {
    console.log('Starting login process...');

    const email = document.getElementById('email')?.value || '';
    const password = document.getElementById('password')?.value || '';

    console.log('Login attempt for email:', email);

    if (!email || !password) {
        showMessage('Please enter both email and password', 'error');
        return;
    }

    try {
        console.log('Sending login request...');
        const result = await API.login(email, password);
        console.log('Login response:', result);

        if (result && result.success) {
            localStorage.setItem('currentUser', JSON.stringify(result.user));
            showMessage('Login successful!');

            // Update navigation immediately
            updateNavigation();

            // Redirect based on role
            setTimeout(() => {
                if (result.user.role === 'admin') {
                    window.location.href = 'admin-dashboard.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            }, 1000);
        } else {
            showMessage(result?.message || 'Login failed!', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Network error. Please check if backend server is running.', 'error');
    }
}

function showForgotPassword() {
    console.log('Showing forgot password modal');
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) modal.style.display = 'block';
}

function hideForgotPassword() {
    console.log('Hiding forgot password modal');
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) modal.style.display = 'none';
}

async function handleForgotPassword() {
    console.log('Handling forgot password...');

    const email = document.getElementById('resetEmail')?.value || '';

    if (!email) {
        showMessage('Please enter your email address', 'error');
        return;
    }

    try {
        console.log('Sending forgot password request...');
        const result = await API.forgotPassword(email);
        console.log('Forgot password response:', result);

        if (result && result.success) {
            showMessage(result.message || 'Password reset link sent!');
            hideForgotPassword();
        } else {
            showMessage(result?.message || 'Failed to send reset link', 'error');
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        showMessage('Network error. Please check if backend server is running.', 'error');
    }
}

function validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);

    return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers;
}

async function logout() {
    console.log('Logging out...');
    try {
        await API.logout();
    } catch (error) {
        console.error('Logout error:', error);
    }
    localStorage.removeItem('currentUser');

    // Update navigation immediately
    updateNavigation();

    showMessage('Logged out successfully!');

    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

// Enhanced message system (unchanged)
function showMessage(message, type = 'success') {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = message;
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        max-width: 300px;
        animation: slideInRight 0.3s ease;
    `;

    if (type === 'success') {
        messageEl.style.background = 'rgba(34, 197, 94, 0.9)';
        messageEl.style.borderLeft = '4px solid #4ade80';
    } else {
        messageEl.style.background = 'rgba(239, 68, 68, 0.9)';
        messageEl.style.borderLeft = '4px solid #f87171';
    }

    document.body.appendChild(messageEl);

    setTimeout(() => {
        messageEl.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            messageEl.remove();
        }, 300);
    }, 4000);
}

// Expose needed functions globally
window.showForgotPassword = showForgotPassword;
window.hideForgotPassword = hideForgotPassword;
window.logout = logout;
window.showMessage = showMessage;
window.updateNavigation = updateNavigation;
