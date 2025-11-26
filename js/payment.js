// Enhanced payment functionality with Cashfree and Remitly
let cashfree = null;
let currentPlan = null;
let currentPrice = null;
let orderId = null;
let remitlyProofFile = null;
let isProcessing = false;

document.addEventListener('DOMContentLoaded', async function() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        showMessage('Please login first', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }
    
    // Get plan details from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const plan = urlParams.get('plan');
    const price = urlParams.get('price');
    
    if (!plan || !price) {
        showMessage('Invalid package selection', 'error');
        setTimeout(() => {
            window.location.href = 'packages.html';
        }, 1500);
        return;
    }
    
    // Validate and sanitize price
    currentPrice = parseFloat(price);
    if (isNaN(currentPrice) || currentPrice <= 0) {
        showMessage('Invalid price amount', 'error');
        setTimeout(() => {
            window.location.href = 'packages.html';
        }, 1500);
        return;
    }
    
    currentPlan = plan;
    
    document.getElementById('planName').textContent = `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`;
    document.getElementById('planPrice').textContent = `$${currentPrice}`;
    
    // Initialize Cashfree
    await initializeCashfree();
    
    // Setup payment method selection
    setupPaymentMethodSelection();
    
    // Generate order ID for all payments
    orderId = generateOrderId();
    document.getElementById('remitlyOrderId').textContent = orderId;
    document.getElementById('remitlyOrderId2').textContent = orderId;
    document.getElementById('remitlyAmount').textContent = `$${currentPrice}`;
    document.getElementById('remitlyAmount2').textContent = `$${currentPrice}`;
    
    // Setup payment buttons
    setupPaymentButtons();
    
    // Setup Remitly file upload
    setupRemitlyUpload();
});

async function initializeCashfree() {
    try {
        // Initialize Cashfree with your credentials
        cashfree = await Cashfree({
            mode: "sandbox" // Change to "production" for live environment
        });
        
        console.log('Cashfree initialized successfully');
        
    } catch (error) {
        console.error('Error initializing Cashfree:', error);
        showMessage('Payment system temporarily unavailable', 'error');
    }
}

function setupPaymentMethodSelection() {
    const paymentOptions = document.querySelectorAll('.payment-option');
    const submitBtn = document.getElementById('submitBtn');
    
    paymentOptions.forEach(option => {
        if (option.classList.contains('disabled')) return;
        
        const radio = option.querySelector('input[type="radio"]');
        const header = option.querySelector('.payment-option-header');
        
        header.addEventListener('click', () => {
            // Update active state
            paymentOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            radio.checked = true;
            
            // Update submit button text
            const method = option.dataset.method;
            updateSubmitButtonText(method);
        });
    });
}

function updateSubmitButtonText(method) {
    const submitBtn = document.getElementById('submitBtn');
    switch(method) {
        case 'cashfree':
            submitBtn.textContent = 'Pay Now with Cashfree';
            break;
        case 'remitly':
            submitBtn.textContent = 'Submit Remitly Payment';
            break;
        case 'taptap':
            submitBtn.textContent = 'Continue with TapTap Send';
            break;
    }
}

function setupPaymentButtons() {
    const submitBtn = document.getElementById('submitBtn');
    
    submitBtn.addEventListener('click', handlePayment);
}

function setupRemitlyUpload() {
    const uploadArea = document.getElementById('remitlyUploadArea');
    const fileInput = document.getElementById('remitlyProof');
    
    uploadArea.addEventListener('click', function() {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                showMessage('File size should be less than 5MB', 'error');
                return;
            }
            
            if (!file.type.startsWith('image/')) {
                showMessage('Please upload an image file', 'error');
                return;
            }
            
            remitlyProofFile = file;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('remitlyPreview');
                const previewImg = document.getElementById('remitlyPreviewImg');
                const placeholder = document.querySelector('.upload-placeholder');
                
                previewImg.src = e.target.result;
                preview.style.display = 'block';
                placeholder.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });
}

function removeRemitlyProof() {
    const fileInput = document.getElementById('remitlyProof');
    const preview = document.getElementById('remitlyPreview');
    const placeholder = document.querySelector('.upload-placeholder');
    
    fileInput.value = '';
    remitlyProofFile = null;
    preview.style.display = 'none';
    placeholder.style.display = 'block';
}

async function handlePayment() {
    if (isProcessing) {
        return; // Prevent double-clicks
    }
    
    const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    
    // Disable button and set processing state
    setProcessingState(true);
    
    try {
        switch(selectedMethod) {
            case 'cashfree':
                await handleCashfreePayment();
                break;
            case 'remitly':
                await handleRemitlyPayment();
                break;
            case 'taptap':
                showMessage('TapTap Send is temporarily unavailable. Please use Cashfree or Remitly.', 'error');
                setProcessingState(false);
                break;
        }
    } catch (error) {
        console.error('Payment handling error:', error);
        setProcessingState(false);
        showMessage('Payment processing failed: ' + error.message, 'error');
    }
}

function setProcessingState(processing) {
    isProcessing = processing;
    const submitBtn = document.getElementById('submitBtn');
    
    if (processing) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading-dots">Processing<span>.</span><span>.</span><span>.</span></span>';
        showProcessingModal();
    } else {
        submitBtn.disabled = false;
        const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
        updateSubmitButtonText(selectedMethod);
        hideProcessingModal();
    }
}

async function handleCashfreePayment() {
    if (!cashfree) {
        setProcessingState(false);
        showMessage('Payment system not initialized', 'error');
        return;
    }
    
    try {
        // Create payment session with backend
        const paymentResult = await API.createCashfreeSession({
            amount: currentPrice,
            currency: 'USD',
            plan: currentPlan,
            orderId: orderId
        });
        
        if (!paymentResult.success) {
            throw new Error(paymentResult.message || 'Failed to create payment session');
        }
        
        if (!paymentResult.paymentSessionId) {
            throw new Error('Payment session ID not received from server');
        }
        
        // Checkout options - ensure parameter names match backend expectations
        const checkoutOptions = {
            paymentSessionId: paymentResult.paymentSessionId,
            returnUrl: `${window.location.origin}/payment-success.html?order_id=${orderId}&plan=${currentPlan}`,
            redirectTarget: "_self"
        };
        
        console.log('Redirecting to Cashfree checkout...');
        
        // Redirect to Cashfree checkout using the correct SDK method
        cashfree.checkout(checkoutOptions);
        
    } catch (error) {
        console.error('Cashfree payment error:', error);
        setProcessingState(false);
        showMessage('Payment failed: ' + error.message, 'error');
    }
}

async function handleRemitlyPayment() {
    if (!remitlyProofFile) {
        setProcessingState(false);
        showMessage('Please upload payment proof screenshot', 'error');
        return;
    }
    
    try {
        // Convert file to base64
        const proofBase64 = await fileToBase64(remitlyProofFile);
        
        // Create remittance payment record
        const paymentResult = await API.createRemittancePayment({
            amount: currentPrice,
            currency: 'USD',
            plan: currentPlan,
            orderId: orderId,
            method: 'remitly',
            proof: proofBase64
        });
        
        if (paymentResult.success) {
            showMessage('Remitly payment submitted successfully! We will verify and activate your service within 1-5 minutes.', 'success');
            
            // Update local storage temporarily (will be confirmed by admin)
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            currentUser.package = currentPlan;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 3000);
        } else {
            throw new Error(paymentResult.message || 'Failed to submit payment');
        }
        
    } catch (error) {
        console.error('Remitly payment error:', error);
        setProcessingState(false);
        showMessage('Payment submission failed: ' + error.message, 'error');
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showMessage('Copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showMessage('Failed to copy to clipboard', 'error');
    });
}

function generateOrderId() {
    return 'GCL-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

function showProcessingModal() {
    document.getElementById('paymentProcessingModal').style.display = 'block';
}

function hideProcessingModal() {
    document.getElementById('paymentProcessingModal').style.display = 'none';
}

// Optional: Add payment status checking
async function checkPaymentStatus(orderId) {
    try {
        // This would call a backend endpoint to check payment status
        const response = await fetch(`/api/payment-status?orderId=${orderId}`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const result = await response.json();
            return result;
        }
    } catch (error) {
        console.error('Error checking payment status:', error);
    }
    return null;
}