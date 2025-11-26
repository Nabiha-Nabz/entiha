// Enhanced Reset Password functionality
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Reset password page loaded');
    
    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (!token) {
        showInvalidToken('Invalid reset link. Please request a new password reset.');
        return;
    }
    
    // Show loading state
    showTokenStatus('loading', 'Validating reset link...');
    
    // Validate token
    try {
        const validationResult = await validateResetToken(token);
        
        if (!validationResult.success || !validationResult.valid) {
            showInvalidToken('Invalid or expired reset link. Please request a new password reset.');
            return;
        }
        
        // Token is valid
        showTokenStatus('valid', 'Reset link is valid. You can now set your new password.');
        setupResetForm(token);
        setupPasswordValidation();
        
    } catch (error) {
        console.error('Token validation error:', error);
        showInvalidToken('Error validating reset link. Please try again.');
    }
});

function showTokenStatus(status, message) {
    const tokenStatus = document.getElementById('tokenStatus');
    tokenStatus.style.display = 'block';
    tokenStatus.className = `token-status ${status} animate-token-check`;
    
    const icon = tokenStatus.querySelector('.status-icon');
    icon.className = `status-icon ${status}`;
    
    tokenStatus.querySelector('span:last-child').textContent = message;
}

function showInvalidToken(message) {
    showTokenStatus('invalid', message);
    setTimeout(() => {
        window.location.href = 'forgot-password.html';
    }, 4000);
}

async function validateResetToken(token) {
    try {
        const response = await fetch('http://localhost:5000/api/validate-reset-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: token })
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error validating token:', error);
        return { success: false, valid: false };
    }
}

function setupResetForm(token) {
    const form = document.getElementById('resetPasswordForm');
    const resetBtn = document.getElementById('resetBtn');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Validation
        if (!validatePassword(newPassword)) {
            showMessage('Please meet all password requirements', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showMessage('Passwords do not match!', 'error');
            return;
        }
        
        // Show loading state
        setResetButtonState('loading');
        document.getElementById('resetProgress').style.display = 'block';
        
        try {
            const response = await fetch('http://localhost:5000/api/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token: token,
                    new_password: newPassword
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                showSuccessState();
            } else {
                showMessage(result.message || 'Failed to reset password', 'error');
                setResetButtonState('error');
            }
        } catch (error) {
            console.error('Reset password error:', error);
            showMessage('Network error. Please try again.', 'error');
            setResetButtonState('error');
        }
    });
}

function setResetButtonState(state) {
    const resetBtn = document.getElementById('resetBtn');
    const progress = document.getElementById('resetProgress');
    
    switch(state) {
        case 'loading':
            resetBtn.disabled = true;
            resetBtn.innerHTML = '<span class="loading-dots"><span></span><span></span><span></span></span>';
            resetBtn.classList.add('loading');
            progress.style.display = 'block';
            break;
        case 'error':
            resetBtn.disabled = false;
            resetBtn.innerHTML = '<span>Reset Password</span>';
            resetBtn.classList.remove('loading');
            progress.style.display = 'none';
            break;
        case 'success':
            resetBtn.disabled = true;
            resetBtn.innerHTML = '<span>Password Reset!</span>';
            resetBtn.classList.remove('loading');
            progress.style.display = 'none';
            break;
        default:
            resetBtn.disabled = false;
            resetBtn.innerHTML = '<span>Reset Password</span>';
            resetBtn.classList.remove('loading');
            progress.style.display = 'none';
    }
}

function showSuccessState() {
    const form = document.getElementById('resetPasswordForm');
    const successState = document.getElementById('successState');
    
    form.style.display = 'none';
    successState.style.display = 'block';
    
    // Animate success checkmark
    const checkmark = successState.querySelector('.success-checkmark');
    checkmark.classList.add('animate-success-check');
    
    showMessage('Password reset successfully!', 'success');
}

function setupPasswordValidation() {
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const requirementValidation = document.getElementById('requirementValidation');
    
    // Show requirements when password field is focused
    newPasswordInput.addEventListener('focus', function() {
        requirementValidation.classList.add('show');
    });
    
    // Validate password in real-time
    newPasswordInput.addEventListener('input', function() {
        validatePasswordStrength(this.value);
        checkPasswordMatch();
    });
    
    confirmPasswordInput.addEventListener('input', checkPasswordMatch);
}

function validatePasswordStrength(password) {
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password)
    };
    
    // Update requirement indicators
    updateRequirement('reqLength', requirements.length);
    updateRequirement('reqUppercase', requirements.uppercase);
    updateRequirement('reqLowercase', requirements.lowercase);
    updateRequirement('reqNumber', requirements.number);
    
    // Calculate strength score
    const strengthScore = Object.values(requirements).filter(Boolean).length;
    updateStrengthMeter(strengthScore);
    
    return Object.values(requirements).every(Boolean);
}

function updateRequirement(elementId, isValid) {
    const element = document.getElementById(elementId);
    if (element) {
        element.className = `requirement-item ${isValid ? 'valid' : 'invalid'} animate-requirement-check`;
        const icon = element.querySelector('.requirement-icon');
        icon.textContent = isValid ? '✓' : '⏺';
    }
}

function updateStrengthMeter(score) {
    const segments = [
        document.getElementById('strengthSeg1'),
        document.getElementById('strengthSeg2'),
        document.getElementById('strengthSeg3'),
        document.getElementById('strengthSeg4')
    ];
    
    const strengthText = document.getElementById('strengthText');
    const strengthLabels = ['Very Weak', 'Weak', 'Medium', 'Strong', 'Very Strong'];
    const strengthColors = ['weak', 'weak', 'medium', 'strong', 'strong'];
    
    // Reset all segments
    segments.forEach(segment => {
        segment.className = 'strength-segment';
    });
    
    // Activate segments based on score
    for (let i = 0; i < score; i++) {
        if (segments[i]) {
            segments[i].classList.add('active', strengthColors[score - 1]);
        }
    }
    
    // Update strength text
    strengthText.textContent = strengthLabels[score] || 'Very Weak';
    strengthText.style.color = `var(--accent-${strengthColors[score - 1] || 'red'})`;
}

function checkPasswordMatch() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const matchStatus = document.getElementById('matchStatus');
    
    if (confirmPassword && newPassword !== confirmPassword) {
        matchStatus.style.display = 'block';
        matchStatus.style.color = 'var(--accent-red)';
        matchStatus.innerHTML = '<small>❌ Passwords do not match</small>';
        return false;
    } else if (confirmPassword && newPassword === confirmPassword) {
        matchStatus.style.display = 'block';
        matchStatus.style.color = 'var(--accent-green)';
        matchStatus.innerHTML = '<small>✅ Passwords match</small>';
        return true;
    } else {
        matchStatus.style.display = 'none';
        return false;
    }
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const button = input.parentNode.querySelector('.toggle-password');
    
    if (input.type === 'password') {
        input.type = 'text';
        button.textContent = '🙈';
    } else {
        input.type = 'password';
        button.textContent = '👁️';
    }
}

// Utility function to validate password
function validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers;
}