const API_BASE = window.location.origin + '/api';

class API {
    // Central request handler
    static async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // Keep session cookies
            ...options
        };

        if (options.body) {
            config.body = options.body;
        }

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('API request failed:', error);

            if (window.showMessage) {
                window.showMessage('Network error. Please check if backend server is running.', 'error');
            }

            return {
                success: false,
                message: 'Network error. Please check if backend server is running.'
            };
        }
    }

    // ==========================
    // AUTH ENDPOINTS
    // ==========================
    static async login(email, password) {
        return this.request('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    static async signup(userData) {
        return this.request('/signup', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    static async logout() {
        return this.request('/logout', {
            method: 'POST'
        });
    }

    static async forgotPassword(email) {
        return this.request('/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }

    static async checkAuth() {
        return this.request('/check-auth');
    }

    // ==========================
    // HEALTH CHECK
    // ==========================
    static async healthCheck() {
        return this.request('/health');
    }

    // ==========================
    // USER ENDPOINTS
    // ==========================
    static async getProfile() {
        return this.request('/user/profile');
    }

    static async updateProfile(profileData) {
        return this.request('/user/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }

    // ==========================
    // PACKAGE ENDPOINTS
    // ==========================
    static async purchasePackage(packageType) {
        return this.request('/packages/purchase', {
            method: 'POST',
            body: JSON.stringify({ package: packageType })
        });
    }

    // ==========================
    // PAYMENT ENDPOINTS (UPDATED)
    // ==========================
    static async createCashfreeSession(paymentData) {
        return this.request('/create-cashfree-session', {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });
    }

    static async createRemittancePayment(paymentData) {
        return this.request('/create-remittance-payment', {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });
    }

    static async createRemittanceSession(sessionData) {
        return this.request('/create-remittance-session', {
            method: 'POST',
            body: JSON.stringify(sessionData)
        });
    }

    static async confirmPayment(confirmationData) {
        return this.request('/confirm-payment', {
            method: 'POST',
            body: JSON.stringify(confirmationData)
        });
    }

    // ==========================
    // JOB APPLICATION ENDPOINTS
    // ==========================
    static async getJobApplications() {
        return this.request('/job-applications');
    }

    // ==========================
    // ADMIN ENDPOINTS
    // ==========================
    static async getStudents() {
        return this.request('/admin/students');
    }

    static async getStudentDetails(studentId) {
        return this.request(`/admin/student/${studentId}`);
    }

    static async updateStudentData(studentId, data) {
        return this.request(`/admin/student/${studentId}/update`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static async addJobApplication(studentId, data) {
        return this.request(`/admin/student/${studentId}/job-application`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static async updateJobApplication(studentId, applicationId, data) {
        return this.request(`/admin/student/${studentId}/job-application/${applicationId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    static async deleteCourse(studentId, courseId) {
        return this.request(`/admin/student/${studentId}/course/${courseId}`, {
            method: 'DELETE'
        });
    }

    // ==========================
    // REMITLY PAYMENT ENDPOINTS
    // ==========================
    static async getRemitlyPayments() {
        return this.request('/admin/remitly-payments');
    }

    static async verifyRemitlyPayment(paymentId, verificationData) {
        return this.request(`/admin/remitly-payment/${paymentId}/verify`, {
            method: 'POST',
            body: JSON.stringify(verificationData)
        });
    }

    // ==========================
    // CONTACT ENDPOINT
    // ==========================
    static async submitContact(formData) {
        return this.request('/contact', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
    }
}

// Make API globally available
window.API = API;