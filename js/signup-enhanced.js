// Enhanced signup functionality
document.addEventListener('DOMContentLoaded', function () {
    console.log('Signup enhanced loaded');
    
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const submitBtn = document.getElementById('submitBtn');
    const formSections = document.querySelectorAll('.form-section');
    let currentStep = 0;

    // Show the first step on load
    showStep(currentStep);
    
    // Go to the next step
    if (nextBtn) {
        nextBtn.addEventListener('click', function () {
            console.log('Next button clicked, current step:', currentStep);
            if (validateStep(currentStep)) {
                if (currentStep < formSections.length - 1) {
                    currentStep++;
                    showStep(currentStep);
                }
            }
        });
    }

    // Go back to the previous step
    if (prevBtn) {
        prevBtn.addEventListener('click', function () {
            console.log('Previous button clicked, current step:', currentStep);
            if (currentStep > 0) {
                currentStep--;
                showStep(currentStep);
            }
        });
    }

    // Handle form submission
    if (submitBtn) {
        submitBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Submit button clicked');
            
            // Validate the final step
            if (validateStep(currentStep)) {
                // Trigger the form submission
                handleSignup();
            }
        });
    }

    function showStep(step) {
        console.log('Showing step:', step);
        
        // Hide all steps
        formSections.forEach(section => {
            section.style.display = 'none';
        });

        // Show current step
        if (formSections[step]) {
            formSections[step].style.display = 'block';
        }

        // Update progress steps
        updateProgressSteps(step);

        // Update button visibility
        if (prevBtn) {
            prevBtn.style.display = step === 0 ? 'none' : 'inline-block';
        }
        
        if (nextBtn) {
            nextBtn.style.display = step === formSections.length - 1 ? 'none' : 'inline-block';
        }
        
        if (submitBtn) {
            submitBtn.style.display = step === formSections.length - 1 ? 'inline-block' : 'none';
        }
    }

    function updateProgressSteps(currentStep) {
        const progressSteps = document.querySelectorAll('.progress-step');
        progressSteps.forEach((step, index) => {
            if (index < currentStep) {
                step.classList.add('completed');
                step.classList.remove('active');
            } else if (index === currentStep) {
                step.classList.add('active');
                step.classList.remove('completed');
            } else {
                step.classList.remove('active', 'completed');
            }
        });
    }

    function validateStep(step) {
        const currentSection = formSections[step];
        if (!currentSection) return true;
        const inputs = currentSection.querySelectorAll('input[required], textarea[required]');
        let isValid = true;

        inputs.forEach(input => {
            // Remove existing error messages
            const existingError = input.parentNode.querySelector('.error-message');
            if (existingError) {
                existingError.remove();
            }

            if (!input.value.trim()) {
                input.classList.add('error');
                isValid = false;
                
                // Show error message
                const errorMsg = document.createElement('div');
                errorMsg.className = 'error-message';
                errorMsg.textContent = 'This field is required';
                errorMsg.style.color = '#ef4444';
                errorMsg.style.fontSize = '0.85rem';
                errorMsg.style.marginTop = '0.5rem';
                input.parentNode.appendChild(errorMsg);
            } else {
                input.classList.remove('error');
            }

            // Special validation for email
            if (input.type === 'email' && input.value.trim()) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(input.value)) {
                    input.classList.add('error');
                    isValid = false;
                    
                    const errorMsg = document.createElement('div');
                    errorMsg.className = 'error-message';
                    errorMsg.textContent = 'Please enter a valid email address';
                    errorMsg.style.color = '#ef4444';
                    errorMsg.style.fontSize = '0.85rem';
                    errorMsg.style.marginTop = '0.5rem';
                    input.parentNode.appendChild(errorMsg);
                }
            }

            // Special validation for password on step 3
            if (input.id === 'password' && input.value.trim()) {
                if (!validatePassword(input.value)) {
                    input.classList.add('error');
                    isValid = false;
                    
                    const errorMsg = document.createElement('div');
                    errorMsg.className = 'error-message';
                    errorMsg.textContent = 'Password must be at least 8 characters with uppercase, lowercase, and numbers';
                    errorMsg.style.color = '#ef4444';
                    errorMsg.style.fontSize = '0.85rem';
                    errorMsg.style.marginTop = '0.5rem';
                    input.parentNode.appendChild(errorMsg);
                }
            }

            // Validate password confirmation
            if (input.id === 'confirmPassword' && input.value.trim()) {
                const password = document.getElementById('password')?.value || '';
                if (input.value !== password) {
                    input.classList.add('error');
                    isValid = false;
                    
                    const errorMsg = document.createElement('div');
                    errorMsg.className = 'error-message';
                    errorMsg.textContent = 'Passwords do not match';
                    errorMsg.style.color = '#ef4444';
                    errorMsg.style.fontSize = '0.85rem';
                    errorMsg.style.marginTop = '0.5rem';
                    input.parentNode.appendChild(errorMsg);
                }
            }
        });

        // Validate terms agreement on step 3
        if (step === 2) {
            const termsCheckbox = document.getElementById('terms');
            if (termsCheckbox && !termsCheckbox.checked) {
                isValid = false;
                
                const termsError = document.createElement('div');
                termsError.className = 'error-message';
                termsError.textContent = 'You must agree to the Terms of Service and Privacy Policy';
                termsError.style.color = '#ef4444';
                termsError.style.fontSize = '0.85rem';
                termsError.style.marginTop = '0.5rem';
                
                const termsContainer = termsCheckbox.closest('.checkbox-container') || termsCheckbox.parentNode;
                if (termsContainer && !termsContainer.querySelector('.error-message')) {
                    termsContainer.appendChild(termsError);
                }
            }
        }

        return isValid;
    }

    function validatePassword(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        
        return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers;
    }
});