// Profile functionality
document.addEventListener('DOMContentLoaded', async function() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        showMessage('Please login first', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }
    
    await loadProfileData(user);
    setupProfileForm(user);
});

async function loadProfileData(user) {
    const result = await API.getProfile();
    
    if (result.success) {
        const userData = result.user;
        
        // Personal info
        document.getElementById('name').value = userData.name;
        document.getElementById('email').value = userData.email;
        document.getElementById('phone').value = userData.phone;
        
        // Admin info
        if (userData.profile) {
            document.getElementById('githubProfile').textContent = userData.profile.github_link || 'Not provided';
            document.getElementById('linkedinProfile').textContent = userData.profile.linkedin_link || 'Not provided';
            document.getElementById('leadsDone').textContent = userData.profile.leads_done || 0;
            
            // Photo preview - FIXED: Show circular photo
            if (userData.profile.photo) {
                const photoPreview = document.getElementById('photoPreview');
                photoPreview.src = userData.profile.photo;
                photoPreview.style.display = 'block';
                document.querySelector('.upload-area').style.display = 'none';
            }
        }
        
        // Package info
        document.getElementById('currentPackage').textContent = userData.package ? `${userData.package} Plan` : 'None';
        
        // Upgrade section
        const upgradeSection = document.getElementById('upgradeSection');
        if (upgradeSection) {
            if (userData.package === 'basic') {
                upgradeSection.style.display = 'block';
            } else {
                upgradeSection.style.display = 'none';
            }
        }
        
        // Clear password fields on page load to prevent any issues
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmNewPassword').value = '';
    }
}

function setupProfileForm(user) {
    document.getElementById('profileForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await updateProfile();
    });
}

async function updateProfile() {
    const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value
    };
    
    // FIXED: Password change logic - only validate if user intentionally filled both fields
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    
    console.log('Password fields:', { newPassword, confirmNewPassword }); // Debug log
    
    // Only validate passwords if BOTH fields have actual content (not just spaces)
    const hasNewPassword = newPassword && newPassword.trim().length > 0;
    const hasConfirmPassword = confirmNewPassword && confirmNewPassword.trim().length > 0;
    
    if (hasNewPassword && hasConfirmPassword) {
        // Both fields have content, validate them
        const trimmedNewPassword = newPassword.trim();
        const trimmedConfirmPassword = confirmNewPassword.trim();
        
        if (trimmedNewPassword !== trimmedConfirmPassword) {
            showMessage('New passwords do not match!', 'error');
            return;
        }
        
        if (!validatePassword(trimmedNewPassword)) {
            showMessage('Password must be at least 8 characters long and contain uppercase, lowercase letters and numbers', 'error');
            return;
        }
        
        // Only add password to formData if validation passes
        formData.password = trimmedNewPassword;
    } else if (hasNewPassword || hasConfirmPassword) {
        // Only one field has content, show error
        showMessage('Please fill both password fields to change password', 'error');
        return;
    }
    // If neither field has content, skip password validation entirely
    
    // Update photo if changed
    const photoFile = document.getElementById('photo').files[0];
    if (photoFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            formData.photo = e.target.result;
            sendUpdate(formData);
        };
        reader.readAsDataURL(photoFile);
    } else {
        await sendUpdate(formData);
    }
}

async function sendUpdate(formData) {
    const result = await API.updateProfile(formData);
    
    if (result.success) {
        // Update local storage
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        currentUser.name = formData.name;
        currentUser.email = formData.email;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Clear password fields only if password was changed
        if (formData.password) {
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmNewPassword').value = '';
        }
        
        showMessage('Profile updated successfully!');
    } else {
        showMessage(result.message || 'Failed to update profile', 'error');
    }
}

function validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers;
}