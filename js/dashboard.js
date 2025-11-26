// Dashboard functionality
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Dashboard loaded');
    
    // Check authentication
    try {
        const authResult = await API.checkAuth();
        console.log('Auth check result:', authResult);
        
        if (!authResult.success) {
            showMessage('Please login to access dashboard', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }
        
        if (authResult.user.role !== 'student') {
            showMessage('Access denied! Student dashboard only.', 'error');
            setTimeout(() => {
                if (authResult.user.role === 'admin') {
                    window.location.href = 'admin-dashboard.html';
                } else {
                    window.location.href = 'login.html';
                }
            }, 2000);
            return;
        }
        
        const user = authResult.user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        console.log('Student user authenticated:', user);
        
        // Update navigation based on package
        updateNavigation(user);
        
        // Load dashboard data
        await loadDashboardData(user);
    } catch (error) {
        console.error('Authentication error:', error);
        showMessage('Authentication failed. Please login again.', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    }
});

function updateNavigation(user) {
    const packageLink = document.getElementById('packageLink');
    if (packageLink) {
        packageLink.textContent = user.package ? 'Package' : 'Buy Packages';
    }
}

async function loadDashboardData(user) {
    try {
        // Welcome message
        document.getElementById('welcomeMessage').textContent = `Welcome, ${user.name}!`;
        
        // Load full user data
        const result = await API.getProfile();
        console.log('Profile data loaded:', result);
        
        if (result.success) {
            const userData = result.user;
            
            // Skills and Job Preferences
            const skillsSection = document.getElementById('skillsSection');
            let skillsHtml = '';
            
            if (userData.skills && userData.skills.length > 0) {
                skillsHtml += `<div class="skills-container">${userData.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}</div>`;
            }
            
            // Add job preferences to skills section
            if (userData.job_preferences) {
                skillsHtml += `
                    <div style="margin-top: 1.5rem;">
                        <h4 style="color: var(--accent-blue); margin-bottom: 0.5rem;">Job Preferences:</h4>
                        <p style="color: var(--text-secondary); line-height: 1.6;">${userData.job_preferences}</p>
                    </div>
                `;
            }
            
            if (skillsHtml) {
                skillsSection.innerHTML = skillsHtml;
            } else {
                skillsSection.innerHTML = '<p class="no-data-message">No skills or preferences listed</p>';
            }
            
            // Account Information Section
            const accountInfoSection = document.getElementById('accountInfoSection');
            if (accountInfoSection) {
                let accountInfoHtml = '';
                
                if (userData.job_account_email) {
                    accountInfoHtml += `
                        <div class="profile-item">
                            <strong>Job Application Email:</strong>
                            <span>${userData.job_account_email}</span>
                        </div>
                    `;
                }
                
                if (userData.job_account_password) {
                    accountInfoHtml += `
                        <div class="profile-item">
                            <strong>Job Account Password:</strong>
                            <span>${userData.job_account_password}</span>
                        </div>
                    `;
                }
                
                if (accountInfoHtml) {
                    accountInfoSection.innerHTML = accountInfoHtml;
                } else {
                    accountInfoSection.innerHTML = '<p class="no-data-message">No account information provided</p>';
                }
            }
            
            // Admin provided data
            if (userData.profile) {
                // Resume
                const resumeSection = document.getElementById('resumeSection');
                if (userData.profile.resume) {
                    resumeSection.innerHTML = `
                        <a href="${userData.profile.resume}" target="_blank" class="btn btn-primary">Download Resume</a>
                    `;
                } else {
                    resumeSection.innerHTML = '<p class="no-data-message">No resume uploaded yet</p>';
                }
                
                // Courses
                const coursesSection = document.getElementById('coursesSection');
                if (userData.courses && userData.courses.length > 0) {
                    coursesSection.innerHTML = `
                        <ul class="courses-list">
                            ${userData.courses.map(course => 
                                `<li><a href="${course.link}" target="_blank" class="profile-link">${course.name}</a></li>`
                            ).join('')}
                        </ul>
                    `;
                } else {
                    coursesSection.innerHTML = '<p class="no-data-message">No courses suggested yet</p>';
                }
                
                // Professional profiles
                if (userData.profile.github_link) {
                    document.getElementById('githubLink').innerHTML = `<a href="${userData.profile.github_link}" target="_blank" class="profile-link">View Profile</a>`;
                }
                if (userData.profile.linkedin_link) {
                    document.getElementById('linkedinLink').innerHTML = `<a href="${userData.profile.linkedin_link}" target="_blank" class="profile-link">View Profile</a>`;
                }
            }

            // Job Applications - FIXED: Load applications properly
            await loadJobApplications(userData);
            
            // Update progress stats from profile data
            updateProgressStats(userData);
        } else {
            showMessage('Failed to load dashboard data', 'error');
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showMessage('Failed to load dashboard data', 'error');
    }
}

function updateProgressStats(userData) {
    // Update progress stats from profile data
    if (userData.profile) {
        document.getElementById('leadsCount').textContent = userData.profile.leads_done || 0;
        document.getElementById('interviewsDone').textContent = userData.profile.interviews_done || 0;
    }
}

async function loadJobApplications(userData) {
    const applicationsSection = document.getElementById('jobApplicationsSection');
    
    // FIXED: Get fresh job applications data
    let jobApplications = userData.job_applications;
    
    if (!jobApplications) {
        try {
            const appsResult = await API.getJobApplications();
            if (appsResult.success) {
                jobApplications = appsResult.applications;
            }
        } catch (error) {
            console.error('Error loading job applications:', error);
        }
    }
    
    if (jobApplications && jobApplications.length > 0) {
        // Calculate statistics
        const stats = {
            total: jobApplications.length,
            leads: jobApplications.filter(app => app.status === 'lead').length,
            interviewsScheduled: jobApplications.filter(app => app.status === 'interview_scheduled').length,
            interviewsDone: jobApplications.filter(app => app.status === 'interview_done').length,
            offers: jobApplications.filter(app => app.status === 'offer').length
        };
        
        // Update statistics
        document.getElementById('totalApplications').textContent = stats.total;
        document.getElementById('leadsCount').textContent = stats.leads;
        document.getElementById('interviewsScheduled').textContent = stats.interviewsScheduled;
        document.getElementById('interviewsDone').textContent = stats.interviewsDone;
        document.getElementById('jobOffers').textContent = stats.offers;
        
        // Display applications
        applicationsSection.innerHTML = `
            <div class="applications-table">
                <table>
                    <thead>
                        <tr>
                            <th>Job Title</th>
                            <th>Company</th>
                            <th>Status</th>
                            <th>Application Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${jobApplications.map(application => `
                            <tr>
                                <td>${application.job_title}</td>
                                <td>${application.company || 'N/A'}</td>
                                <td><span class="status-badge">${formatStatus(application.status)}</span></td>
                                <td>${application.application_date ? new Date(application.application_date).toLocaleDateString() : 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else {
        applicationsSection.innerHTML = '<p class="no-data-message">No job applications yet</p>';
        
        // Reset statistics
        document.getElementById('totalApplications').textContent = '0';
        document.getElementById('leadsCount').textContent = '0';
        document.getElementById('interviewsScheduled').textContent = '0';
        document.getElementById('interviewsDone').textContent = '0';
        document.getElementById('jobOffers').textContent = '0';
    }
}

function formatStatus(status) {
    const statusMap = {
        'applied': 'Applied',
        'lead': 'Lead',
        'interview_scheduled': 'Interview Scheduled',
        'interview_done': 'Interview Done',
        'offer': 'Offer',
        'rejected': 'Rejected'
    };
    return statusMap[status] || status;
}