// Admin functionality
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Admin dashboard loaded');
    
    // Check authentication and admin role
    try {
        const authResult = await API.checkAuth();
        console.log('Auth check result:', authResult);
        
        if (!authResult.success) {
            showMessage('Please login to access admin dashboard', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }
        
        if (authResult.user.role !== 'admin') {
            showMessage('Access denied! Admin only.', 'error');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
            return;
        }
        
        const user = authResult.user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        console.log('Admin user authenticated:', user);
        
        await loadStudentsList();
        
        // Load Remitly payments if on the payments section
        if (window.location.hash === '#remitly-payments') {
            await loadRemitlyPayments();
        }
        
        // Load payment history
        await loadPaymentHistory();
        
    } catch (error) {
        console.error('Authentication error:', error);
        showMessage('Authentication failed. Please login again.', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    }
});

let selectedStudent = null;

async function loadStudentsList() {
    try {
        const result = await API.getStudents();
        console.log('Students loaded:', result);
        
        if (result.success) {
            const studentsList = document.getElementById('studentsList');
            
            if (result.students.length === 0) {
                studentsList.innerHTML = '<p class="no-data-message">No students found</p>';
                return;
            }
            
            studentsList.innerHTML = result.students.map(student => `
                <div class="student-item glass hover-lift" onclick="selectStudent(${student.id})">
                    <h4>${student.name}</h4>
                    <p>Email: ${student.email}</p>
                    <p>Phone: ${student.phone}</p>
                    <p>Package: ${student.package || 'None'}</p>
                    <div class="student-stats">
                        <span class="stat">Applications: ${student.stats.total_applications}</span>
                        <span class="stat">Leads: ${student.stats.leads}</span>
                    </div>
                </div>
            `).join('');
        } else {
            showMessage('Failed to load students', 'error');
        }
    } catch (error) {
        console.error('Error loading students:', error);
        showMessage('Failed to load students', 'error');
    }
}

async function searchStudents() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const result = await API.getStudents();
    
    if (result.success) {
        const filteredStudents = result.students.filter(student => 
            student.name.toLowerCase().includes(searchTerm) || 
            student.email.toLowerCase().includes(searchTerm) || 
            student.phone.includes(searchTerm)
        );
        
        const studentsList = document.getElementById('studentsList');
        
        if (filteredStudents.length === 0) {
            studentsList.innerHTML = '<p class="no-data-message">No students found matching your search</p>';
            return;
        }
        
        studentsList.innerHTML = filteredStudents.map(student => `
            <div class="student-item glass hover-lift" onclick="selectStudent(${student.id})">
                <h4>${student.name}</h4>
                <p>Email: ${student.email}</p>
                <p>Phone: ${student.phone}</p>
                <p>Package: ${student.package || 'None'}</p>
            </div>
        `).join('');
    }
}

async function selectStudent(studentId) {
    try {
        const result = await API.getStudentDetails(studentId);
        
        if (result.success) {
            selectedStudent = result.student;
            
            document.getElementById('selectedStudentName').textContent = selectedStudent.name;
            document.getElementById('studentManagement').style.display = 'block';
            
            // Load current student data
            loadStudentData(selectedStudent);
            loadStudentApplications(selectedStudent);
            loadGitCredentials(selectedStudent);
        } else {
            showMessage('Failed to load student details', 'error');
        }
    } catch (error) {
        console.error('Error selecting student:', error);
        showMessage('Failed to load student details', 'error');
    }
}

function loadGitCredentials(student) {
    // Update Git-style credential display
    if (student.job_account_email) {
        document.getElementById('gitJobEmail').textContent = student.job_account_email;
    } else {
        document.getElementById('gitJobEmail').textContent = 'Not provided';
        document.getElementById('gitJobEmail').style.color = 'var(--text-muted)';
    }
    
    if (student.job_account_password) {
        document.getElementById('gitJobPassword').textContent = student.job_account_password;
    } else {
        document.getElementById('gitJobPassword').textContent = 'Not provided';
        document.getElementById('gitJobPassword').style.color = 'var(--text-muted)';
    }
    
    if (student.job_preferences) {
        document.getElementById('gitJobPreferences').textContent = student.job_preferences;
    } else {
        document.getElementById('gitJobPreferences').textContent = 'Not specified';
        document.getElementById('gitJobPreferences').style.color = 'var(--text-muted)';
    }
    
    // Load skills in Git style
    const skillsContainer = document.getElementById('gitSkillsContainer');
    if (student.skills && student.skills.length > 0) {
        skillsContainer.innerHTML = student.skills.map(skill => 
            `<span class="skill-tag-git">${skill}</span>`
        ).join('');
    } else {
        skillsContainer.innerHTML = '<span class="no-data-message" style="font-size: 0.8rem;">No skills listed</span>';
    }
}

function loadStudentData(student) {
    // Professional profiles
    document.getElementById('githubInput').value = student.profile.github_link || '';
    document.getElementById('linkedinInput').value = student.profile.linkedin_link || '';
    
    // Progress tracking - FIXED: Use correct field names
    document.getElementById('leadsInput').value = student.profile.leads_done || 0;
    document.getElementById('jobsInput').value = student.profile.jobs_applied || 0;
    document.getElementById('interviewsInput').value = student.profile.interviews_done || 0;
    
    // Courses
    const coursesList = document.getElementById('coursesList');
    if (student.courses && student.courses.length > 0) {
        coursesList.innerHTML = student.courses.map(course => 
            `<li>${course.name} - <a href="${course.link}" target="_blank" class="profile-link">Link</a> 
            <button class="btn btn-secondary" onclick="removeCourse(${student.id}, ${course.id})">Remove</button></li>`
        ).join('');
    } else {
        coursesList.innerHTML = '<li>No courses added yet</li>';
    }
}

function loadStudentApplications(student) {
    const applicationsList = document.getElementById('studentApplicationsList');
    
    if (student.job_applications && student.job_applications.length > 0) {
        applicationsList.innerHTML = `
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
                        ${student.job_applications.map(application => `
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
        applicationsList.innerHTML = '<p class="no-data-message">No job applications yet</p>';
    }
}

// Copy to clipboard function
function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    const text = element.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        // Show temporary success message
        const originalText = element.textContent;
        element.textContent = 'Copied!';
        element.style.color = 'var(--accent-green)';
        
        setTimeout(() => {
            element.textContent = originalText;
            element.style.color = 'var(--accent-blue)';
        }, 1500);
        
        showMessage('Copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showMessage('Failed to copy to clipboard', 'error');
    });
}

async function addJobApplication() {
    const jobTitle = document.getElementById('jobTitle').value;
    const company = document.getElementById('company').value;
    const source = document.getElementById('source').value;
    const status = document.getElementById('applicationStatus').value;
    const applicationLink = document.getElementById('applicationLink').value;
    const interviewDate = document.getElementById('interviewDate').value;
    const notes = document.getElementById('applicationNotes').value;
    const adminNotes = document.getElementById('adminNotes').value;
    
    if (!jobTitle) {
        showMessage('Job Title is required', 'error');
        return;
    }
    
    const applicationData = {
        job_title: jobTitle,
        company: company,
        source: source,
        status: status,
        application_link: applicationLink,
        interview_date: interviewDate,
        notes: notes,
        admin_notes: adminNotes
    };
    
    try {
        const result = await API.addJobApplication(selectedStudent.id, applicationData);
        
        if (result.success) {
            showMessage('Job application added successfully!');
            // Reload student data to refresh applications and stats
            await selectStudent(selectedStudent.id);
            // Reset form
            document.getElementById('jobApplicationForm').reset();
        } else {
            showMessage('Failed to add job application: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error adding job application:', error);
        showMessage('Failed to add job application', 'error');
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

async function uploadResume() {
    const fileInput = document.getElementById('resumeUpload');
    const file = fileInput.files[0];
    
    if (!file) {
        showMessage('Please select a resume file', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const result = await API.updateStudentData(selectedStudent.id, {
                resume: e.target.result
            });
            
            if (result.success) {
                showMessage('Resume uploaded successfully!');
                fileInput.value = '';
            } else {
                showMessage('Failed to upload resume', 'error');
            }
        } catch (error) {
            console.error('Error uploading resume:', error);
            showMessage('Failed to upload resume', 'error');
        }
    };
    reader.readAsDataURL(file);
}

async function addCourse() {
    const courseName = document.getElementById('courseName').value;
    const courseLink = document.getElementById('courseLink').value;
    
    if (!courseName || !courseLink) {
        showMessage('Please enter both course name and link', 'error');
        return;
    }
    
    try {
        const result = await API.updateStudentData(selectedStudent.id, {
            course_name: courseName,
            course_link: courseLink
        });
        
        if (result.success) {
            document.getElementById('courseName').value = '';
            document.getElementById('courseLink').value = '';
            
            // Reload student data to show new course
            await selectStudent(selectedStudent.id);
            showMessage('Course added successfully!');
        } else {
            showMessage('Failed to add course', 'error');
        }
    } catch (error) {
        console.error('Error adding course:', error);
        showMessage('Failed to add course', 'error');
    }
}

async function removeCourse(studentId, courseId) {
    if (confirm('Are you sure you want to remove this course?')) {
        try {
            const result = await API.deleteCourse(studentId, courseId);
            
            if (result.success) {
                // Reload student data
                await selectStudent(studentId);
                showMessage('Course removed successfully!');
            } else {
                showMessage('Failed to remove course', 'error');
            }
        } catch (error) {
            console.error('Error removing course:', error);
            showMessage('Failed to remove course', 'error');
        }
    }
}

async function updateProfiles() {
    const github = document.getElementById('githubInput').value;
    const linkedin = document.getElementById('linkedinInput').value;
    
    try {
        const result = await API.updateStudentData(selectedStudent.id, {
            github_link: github,
            linkedin_link: linkedin
        });
        
        if (result.success) {
            showMessage('Professional profiles updated successfully!');
        } else {
            showMessage('Failed to update profiles', 'error');
        }
    } catch (error) {
        console.error('Error updating profiles:', error);
        showMessage('Failed to update profiles', 'error');
    }
}

async function updateProgress() {
    const leads = parseInt(document.getElementById('leadsInput').value) || 0;
    const jobs = parseInt(document.getElementById('jobsInput').value) || 0;
    const interviews = parseInt(document.getElementById('interviewsInput').value) || 0;
    
    try {
        const result = await API.updateStudentData(selectedStudent.id, {
            leads_done: leads,
            jobs_applied: jobs,
            interviews_done: interviews
        });
        
        if (result.success) {
            showMessage('Progress updated successfully!');
        } else {
            showMessage('Failed to update progress', 'error');
        }
    } catch (error) {
        console.error('Error updating progress:', error);
        showMessage('Failed to update progress', 'error');
    }
}

// Remitly Payments Management
async function loadRemitlyPayments() {
    try {
        const result = await API.getRemitlyPayments();
        
        if (result.success) {
            const paymentsContainer = document.getElementById('remitlyPaymentsContainer');
            
            if (result.payments.length === 0) {
                paymentsContainer.innerHTML = '<p class="no-data-message">No Remitly payments found</p>';
                return;
            }
            
            paymentsContainer.innerHTML = `
                <table class="remitly-payments-table">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Student</th>
                            <th>Plan</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Proof</th>
                            <th>Submitted</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${result.payments.map(payment => `
                            <tr>
                                <td>${payment.order_id}</td>
                                <td>
                                    <strong>${payment.user_name}</strong><br>
                                    <small>${payment.user_email}</small>
                                </td>
                                <td>${payment.plan}</td>
                                <td>$${payment.amount}</td>
                                <td>
                                    <span class="payment-status status-${payment.status}">
                                        ${payment.status}
                                    </span>
                                </td>
                                <td>
                                    ${payment.proof_image ? 
                                        `<img src="${payment.proof_image}" alt="Payment Proof" class="proof-image" onclick="showProofModal('${payment.proof_image}')">` : 
                                        'No proof'
                                    }
                                </td>
                                <td>${new Date(payment.created_at).toLocaleDateString()}</td>
                                <td>
                                    <div class="action-buttons">
                                        ${payment.status === 'pending' ? `
                                            <button class="btn btn-success" onclick="verifyPayment(${payment.id}, 'verified')">Verify</button>
                                            <button class="btn btn-danger" onclick="verifyPayment(${payment.id}, 'rejected')">Reject</button>
                                        ` : `
                                            <span>Verified: ${payment.verified_at ? new Date(payment.verified_at).toLocaleDateString() : 'N/A'}</span>
                                        `}
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            showMessage('Failed to load Remitly payments', 'error');
        }
    } catch (error) {
        console.error('Error loading Remitly payments:', error);
        showMessage('Failed to load Remitly payments', 'error');
    }
}

function showProofModal(imageSrc) {
    // Create modal for image preview
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 90%; max-height: 90%; position: relative;">
            <button class="close-modal" onclick="this.parentElement.parentElement.remove()" style="
                position: absolute;
                top: 10px;
                right: 10px;
                background: var(--accent-red);
                border: none;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                color: white;
                cursor: pointer;
                font-size: 1rem;
                z-index: 1001;
            ">✕</button>
            <img src="${imageSrc}" alt="Payment Proof" style="max-width: 100%; max-height: 100%; border-radius: 8px;">
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal on background click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

async function verifyPayment(paymentId, status) {
    const transactionId = prompt('Enter transaction ID:');
    if (transactionId === null) return;
    
    const remitlyReference = prompt('Enter Remitly reference number:');
    if (remitlyReference === null) return;
    
    const adminNotes = prompt('Enter admin notes (optional):') || '';
    
    try {
        const result = await API.verifyRemitlyPayment(paymentId, {
            status: status,
            transaction_id: transactionId,
            remitly_reference: remitlyReference,
            admin_notes: adminNotes
        });
        
        if (result.success) {
            showMessage(`Payment ${status} successfully`);
            await loadRemitlyPayments();
        } else {
            showMessage(result.message || 'Failed to verify payment', 'error');
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        showMessage('Failed to verify payment', 'error');
    }
}

// Payment History
async function loadPaymentHistory() {
    try {
        // This would call a backend endpoint to get all payments
        const paymentsContainer = document.getElementById('paymentHistoryContainer');
        
        // For now, show a placeholder message
        paymentsContainer.innerHTML = `
            <div class="payment-history-table">
                <table>
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>User</th>
                            <th>Plan</th>
                            <th>Amount</th>
                            <th>Method</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="7" class="no-data-message">Payment history will be displayed here</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading payment history:', error);
    }
}