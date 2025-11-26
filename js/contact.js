// contact.js — fixed (no global updateNavigation override)

function safeGetCurrentUser() {
    try {
        const raw = localStorage.getItem('currentUser');
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (err) {
        console.warn('Malformed currentUser in localStorage — clearing it.', err);
        localStorage.removeItem('currentUser');
        return null;
    }
}

// A local, specifically-named function to update the package link only.
// This avoids clashing with auth.js's updateNavigation function.
function updatePackageLink(user) {
    const packageLink = document.getElementById('packageLink');
    if (!packageLink) return;
    if (user && typeof user.package !== 'undefined') {
        packageLink.textContent = user.package ? 'Package' : 'Buy Packages';
    } else {
        const currentUser = safeGetCurrentUser();
        packageLink.textContent = (currentUser && currentUser.package) ? 'Package' : 'Buy Packages';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Let auth.js's updateNavigation handle the full nav population.
    // But call it defensively if available.
    if (typeof window.updateNavigation === 'function') {
        try {
            window.updateNavigation();
        } catch (e) {
            console.warn('auth.updateNavigation() threw:', e);
        }
    }

    // Safely read current user and pre-fill the form
    const user = safeGetCurrentUser();
    if (user) {
        const nameEl = document.getElementById('contactName');
        const emailEl = document.getElementById('contactEmail');
        if (nameEl) nameEl.value = user.name || '';
        if (emailEl) emailEl.value = user.email || '';

        // Update the package link text safely (without overwriting auth.js)
        updatePackageLink(user);
    } else {
        // still ensure package link text is correct
        updatePackageLink(null);
    }

    // Setup form submission listener defensively
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactForm);
    } else {
        console.warn('contactForm not found in DOM.');
    }
});

async function handleContactForm(e) {
    e.preventDefault();

    // Get fields safely
    const nameEl = document.getElementById('contactName');
    const emailEl = document.getElementById('contactEmail');
    const subjectEl = document.getElementById('contactSubject');
    const messageEl = document.getElementById('contactMessage');

    if (!nameEl || !emailEl || !subjectEl || !messageEl) {
        showMessage('Contact form not fully loaded. Please refresh and try again.', 'error');
        return;
    }

    const formData = {
        name: nameEl.value.trim(),
        email: emailEl.value.trim(),
        subject: subjectEl.value.trim(),
        message: messageEl.value.trim()
    };

    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
        showMessage('Please complete all fields before sending.', 'error');
        return;
    }

    try {
        if (!window.API || typeof API.submitContact !== 'function') {
            throw new Error('API.submitContact is not available. Ensure api.js is loaded before contact.js');
        }

        const result = await API.submitContact(formData);

        if (result && result.success) {
            showMessage('Thank you for your message! We will get back to you within 24 hours.');
            // Reset form but keep name/email if logged in
            contactForm.reset();
            const user = safeGetCurrentUser();
            if (user) {
                if (nameEl) nameEl.value = user.name || '';
                if (emailEl) emailEl.value = user.email || '';
            }
        } else {
            showMessage(result?.message || 'Failed to send message. Please try again.', 'error');
        }
    } catch (err) {
        console.error('Contact submit error:', err);
        showMessage('Network error or server unavailable. Please try later.', 'error');
    }
}
