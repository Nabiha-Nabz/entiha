// Packages functionality
document.addEventListener('DOMContentLoaded', async function() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        showMessage('Please login first', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }
    
    await loadPackagePage(user);
});

async function loadPackagePage(user) {
    const packagesGrid = document.getElementById('packagesGrid');
    const currentPackageInfo = document.getElementById('currentPackageInfo');
    const upgradeSection = document.getElementById('upgradeSection');
    
    if (user.package) {
        if (packagesGrid) packagesGrid.style.display = 'none';
        if (currentPackageInfo) currentPackageInfo.style.display = 'block';
        
        const currentPlanDisplay = document.getElementById('currentPlanDisplay');
        if (currentPlanDisplay) {
            currentPlanDisplay.innerHTML = `
                <div class="current-plan-card">
                    <h4>${user.package.charAt(0).toUpperCase() + user.package.slice(1)} Plan - $${user.package === 'basic' ? '50' : '100'}</h4>
                    <p>Your plan is active and running</p>
                </div>
            `;
        }
        
        if (upgradeSection) {
            if (user.package === 'basic') {
                upgradeSection.style.display = 'block';
            } else {
                upgradeSection.style.display = 'none';
            }
        }
    } else {
        if (currentPackageInfo) currentPackageInfo.style.display = 'none';
        if (upgradeSection) upgradeSection.style.display = 'none';
        if (packagesGrid) packagesGrid.style.display = 'grid';
    }
}