from flask import Flask, request, jsonify, session, send_from_directory, send_file, current_app
from flask_cors import CORS
from database import db, init_db
from models import User, UserProfile, Course, JobApplication, ContactMessage, AdminAction, PasswordReset, Payment, PendingPayment, RemitlyPayment
from config import Config
import json
from datetime import datetime, timedelta
import base64
import io
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import requests
import secrets
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__, static_folder='../', template_folder='../')
app.config.from_object(Config)
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = 3600  # 1 hour

# CORS configuration
CORS(app,
     supports_credentials=True,
     origins=[
         'http://localhost:5000',
         'http://127.0.0.1:5000',
         'http://localhost:3000',
         'https://entiha-8a494.web.app',
         'https://entiha-8a494.firebaseapp.com'
     ],
     allow_headers=['Content-Type', 'Authorization'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

# Initialize database
init_db(app)

# Cashfree Configuration
CASHFREE_APP_ID = "your_cashfree_app_id"  # Replace with your Cashfree App ID
CASHFREE_SECRET_KEY = "your_cashfree_secret_key"  # Replace with your Cashfree Secret Key
CASHFREE_BASE_URL = "https://sandbox.cashfree.com"  # Change to "https://api.cashfree.com" for production

def get_cashfree_headers():
    return {
        "Content-Type": "application/json",
        "x-client-id": CASHFREE_APP_ID,
        "x-client-secret": CASHFREE_SECRET_KEY,
        "x-api-version": "2022-09-01"
    }

def send_email(to_email, subject, body, is_html=True):
    """Send email using SMTP"""
    try:
        msg = MIMEMultipart()
        # Ensure From is a string like "Name <email@domain>"
        msg['From'] = app.config['MAIL_DEFAULT_SENDER']
        msg['To'] = to_email
        msg['Subject'] = subject

        if is_html:
            msg.attach(MIMEText(body, 'html'))
        else:
            msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(app.config['MAIL_SERVER'], app.config['MAIL_PORT'])
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(app.config['MAIL_USERNAME'], app.config['MAIL_PASSWORD'])
        server.send_message(msg)
        server.quit()

        print(f"Email sent successfully to {to_email}")
        return True

    except Exception as e:
        print(f"Error sending email to {to_email}: {str(e)}")
        return False

def generate_reset_token():
    """Generate a secure reset token"""
    return secrets.token_urlsafe(32)

def create_password_reset_token(user_id):
    """Create and store password reset token"""
    # Invalidate any existing tokens for this user
    PasswordReset.query.filter_by(user_id=user_id, used=False).update({'used': True})
    db.session.commit()
    
    # Create new token
    token = generate_reset_token()
    expires_at = datetime.utcnow() + timedelta(hours=1)  # Token valid for 1 hour
    
    reset_token = PasswordReset(
        user_id=user_id,
        token=token,
        expires_at=expires_at
    )
    
    db.session.add(reset_token)
    db.session.commit()
    
    return token

def validate_reset_token(token):
    """Validate reset token"""
    reset_request = PasswordReset.query.filter_by(
        token=token, 
        used=False
    ).first()
    
    if not reset_request:
        return None
    
    if datetime.utcnow() > reset_request.expires_at:
        return None
    
    return reset_request.user_id

# Serve frontend pages
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if path.startswith('api/'):
        return jsonify({'error': 'Endpoint not found'}), 404
    try:
        return send_from_directory(app.static_folder, path)
    except:
        return jsonify({'error': 'File not found'}), 404

# Serve favicon.ico
@app.route('/favicon.ico')
def favicon():
    ico_path = os.path.join(app.root_path, 'favicon.ico')
    if os.path.exists(ico_path):
        return send_from_directory(app.root_path, 'favicon.ico', mimetype='image/vnd.microsoft.icon')
    
    # Fallback small PNG
    png_b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII='
    png_bytes = base64.b64decode(png_b64)
    return send_file(io.BytesIO(png_bytes), mimetype='image/png')

# Authentication routes
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json or {}
    email = data.get('email', '')
    password = data.get('password', '')

    # Find user by email and password (keeps current plaintext password logic)
    user = User.query.filter_by(email=email, password=password).first()

    if user:
        session.permanent = True
        session['user_id'] = user.id
        session['user_role'] = user.role

        user_data = {
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'role': user.role,
            'package': user.current_package
        }
        return jsonify({'success': True, 'user': user_data})

    return jsonify({'success': False, 'message': 'Invalid credentials'})

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json or {}
    email = data.get('email', '')

    # Check if user with this email already exists
    existing_user = User.query.filter_by(email=email).first()

    if existing_user:
        return jsonify({'success': False, 'message': 'User already exists'})

    user = User(
        name=data.get('name', ''),
        email=email,
        phone=data.get('phone', ''),
        skills=json.dumps(data.get('skills', [])),
        job_preferences=data.get('job_preferences', ''),
        job_account_email=data.get('job_account_email', ''),
        job_account_password=data.get('job_account_password', ''),
        password=data.get('password', ''),  # plaintext (keeps current behavior)
        role='student'
    )

    db.session.add(user)
    db.session.commit()

    profile = UserProfile(user_id=user.id)
    db.session.add(profile)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Account created successfully! Please login.'})

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    response = jsonify({'success': True})
    response.set_cookie('session', '', expires=0)
    return response

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json or {}
    email = data.get('email', '').strip().lower()
    
    if not email:
        return jsonify({'success': False, 'message': 'Email is required'})
    
    user = User.query.filter_by(email=email).first()

    if not user:
        # Fallback to query for compatibility
        user = User.query.filter_by(email=email).first()
    
    if user:
        # Generate and store reset token
        token = create_password_reset_token(user.id)
        
        # Create reset link
        reset_link = f"http://localhost:5000/reset-password.html?token={token}"
        
        # Email content
        subject = "Password Reset Request - Entiha"
        body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
                .code {{ background: #f4f4f4; padding: 10px; border-radius: 5px; font-family: monospace; margin: 10px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🌍 Entiha</h1>
                </div>
                <div class="content">
                    <h2>Password Reset Request</h2>
                    <p>Hello <strong>{user.name}</strong>,</p>
                    <p>We received a request to reset your password for your Entiha account.</p>
                    <p>Click the button below to reset your password:</p>
                    <p style="text-align: center;">
                        <a href="{reset_link}" class="button">Reset Your Password</a>
                    </p>
                    <p>Or copy and paste this link in your browser:</p>
                    <div class="code">{reset_link}</div>
                    <p><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
                    <p>If you didn't request this reset, please ignore this email. Your password will remain unchanged.</p>
                </div>
                <div class="footer">
                    <p>&copy; 2025 Entiha. All rights reserved.</p>
                    <p>This is an automated message, please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Send email
        if send_email(email, subject, body):
            return jsonify({
                'success': True, 
                'message': f'Password reset link sent to {email}. Please check your inbox (and spam folder).'
            })
        else:
            return jsonify({
                'success': False, 
                'message': 'Failed to send reset email. Please try again later or contact support.'
            })
    else:
        # Don't reveal whether email exists for security
        return jsonify({
            'success': True, 
            'message': 'If an account with this email exists, a reset link has been sent.'
        })

@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    data = request.json or {}
    token = data.get('token', '')
    new_password = data.get('new_password', '')
    
    if not token or not new_password:
        return jsonify({'success': False, 'message': 'Token and new password are required'})
    
    # Validate token
    user_id = validate_reset_token(token)
    if not user_id:
        return jsonify({'success': False, 'message': 'Invalid or expired reset token'})
    
    # Validate password strength
    if len(new_password) < 8:
        return jsonify({'success': False, 'message': 'Password must be at least 8 characters long'})
    
    # Update password
    user = db.session.get(User, user_id)
    if not user:
        user = User.query.get(user_id)
    
    if user:
        user.password = new_password
        
        # Mark token as used
        reset_request = PasswordReset.query.filter_by(token=token).first()
        if reset_request:
            reset_request.used = True
        
        db.session.commit()
        
        # Send confirmation email
        subject = "Password Updated Successfully - Entiha"
        body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🌍 Entiha</h1>
                </div>
                <div class="content">
                    <h2>Password Updated Successfully</h2>
                    <p>Hello <strong>{user.name}</strong>,</p>
                    <p>Your password has been successfully updated.</p>
                    <p>If you did not make this change, please contact our support team immediately.</p>
                    <p>You can now login with your new password.</p>
                </div>
                <div class="footer">
                    <p>&copy; 2025 Entiha. All rights reserved.</p>
                    <p>This is an automated message, please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        send_email(user.email, subject, body)
        
        return jsonify({'success': True, 'message': 'Password reset successfully! You can now login with your new password.'})
    
    return jsonify({'success': False, 'message': 'User not found'})

@app.route('/api/validate-reset-token', methods=['POST'])
def validate_reset_token_endpoint():
    data = request.json or {}
    token = data.get('token', '')
    
    user_id = validate_reset_token(token)
    if user_id:
        return jsonify({'success': True, 'valid': True})
    else:
        return jsonify({'success': True, 'valid': False})

@app.route('/api/check-auth', methods=['GET'])
def check_auth():
    print(f"Session data: {dict(session)}")  # Debug session
    if 'user_id' in session:
        user = db.session.get(User, session['user_id'])
        if not user:
            # Fallback to query for compatibility
            user = User.query.get(session['user_id'])
        
        if user:
            return jsonify({
                'success': True,
                'user': {
                    'id': user.id,
                    'name': user.name,
                    'email': user.email,
                    'role': user.role,
                    'package': user.current_package
                }
            })
    return jsonify({'success': False, 'message': 'Not authenticated'})

# User routes
@app.route('/api/user/profile', methods=['GET'])
def get_user_profile():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'})
    
    user = db.session.get(User, session['user_id'])
    if not user:
        user = User.query.get(session['user_id'])
    
    profile = UserProfile.query.filter_by(user_id=user.id).first()
    courses = Course.query.filter_by(user_id=user.id).all()
    job_applications = JobApplication.query.filter_by(user_id=user.id).order_by(JobApplication.application_date.desc()).all()
    
    user_data = {
        'id': user.id,
        'name': user.name,
        'email': user.email,
        'phone': user.phone,
        'skills': json.loads(user.skills) if user.skills else [],
        'job_preferences': user.job_preferences,
        'job_account_email': user.job_account_email,
        'package': user.current_package,
        'package_purchase_date': user.package_purchase_date.isoformat() if user.package_purchase_date else None,
        'profile': {
            'photo': profile.photo if profile else None,
            'github_link': profile.github_link if profile else None,
            'linkedin_link': profile.linkedin_link if profile else None,
            'leads_done': profile.leads_done if profile else 0,
            'jobs_applied': profile.jobs_applied if profile else 0,
            'interviews_done': profile.interviews_done if profile else 0,
            'resume': profile.resume if profile else None
        },
        'courses': [{'id': c.id, 'name': c.name, 'link': c.link} for c in courses],
        'job_applications': [{
            'id': ja.id,
            'job_title': ja.job_title,
            'company': ja.company,
            'application_date': ja.application_date.isoformat() if ja.application_date else None,
            'status': ja.status,
            'source': ja.source,
            'application_link': ja.application_link,
            'interview_date': ja.interview_date.isoformat() if ja.interview_date else None,
            'interview_result': ja.interview_result,
            'notes': ja.notes,
            'admin_notes': ja.admin_notes
        } for ja in job_applications]
    }
    
    return jsonify({'success': True, 'user': user_data})

@app.route('/api/user/profile', methods=['PUT'])
def update_user_profile():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'})
    
    data = request.json or {}
    user = db.session.get(User, session['user_id'])
    if not user:
        user = User.query.get(session['user_id'])
    
    if not user:
        return jsonify({'success': False, 'message': 'User not found'})
    
    if 'name' in data:
        user.name = data['name']
    if 'email' in data:
        user.email = data['email']
    if 'phone' in data:
        user.phone = data['phone']
    if 'password' in data and data['password']:
        user.password = data['password']
    
    if 'photo' in data and data['photo']:
        profile = UserProfile.query.filter_by(user_id=user.id).first()
        if not profile:
            profile = UserProfile(user_id=user.id)
            db.session.add(profile)
        profile.photo = data['photo']
    
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Profile updated successfully'})

# Package routes
@app.route('/api/packages/purchase', methods=['POST'])
def purchase_package():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'})
    
    data = request.json or {}
    user = db.session.get(User, session['user_id'])
    if not user:
        user = User.query.get(session['user_id'])
    
    if not user:
        return jsonify({'success': False, 'message': 'User not found'})
    
    user.current_package = data.get('package', user.current_package)
    user.package_purchase_date = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Package purchased successfully'})

# Job Applications routes
@app.route('/api/job-applications', methods=['GET'])
def get_job_applications():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'})
    
    user = db.session.get(User, session['user_id'])
    if not user:
        user = User.query.get(session['user_id'])
    
    job_applications = JobApplication.query.filter_by(user_id=user.id).order_by(JobApplication.application_date.desc()).all()
    
    applications_data = [{
        'id': ja.id,
        'job_title': ja.job_title,
        'company': ja.company,
        'application_date': ja.application_date.isoformat() if ja.application_date else None,
        'status': ja.status,
        'source': ja.source,
        'application_link': ja.application_link,
        'interview_date': ja.interview_date.isoformat() if ja.interview_date else None,
        'interview_result': ja.interview_result,
        'notes': ja.notes,
        'admin_notes': ja.admin_notes
    } for ja in job_applications]
    
    return jsonify({'success': True, 'applications': applications_data})

# Contact routes
@app.route('/api/contact', methods=['POST'])
def submit_contact():
    data = request.json or {}
    
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    subject = data.get('subject', '').strip()
    message = data.get('message', '').strip()
    
    if not all([name, email, subject, message]):
        return jsonify({'success': False, 'message': 'All fields are required'})
    
    # Save to database
    contact_message = ContactMessage(
        name=name,
        email=email,
        subject=subject,
        message=message
    )
    
    db.session.add(contact_message)
    db.session.commit()
    
    # Send email to admin
    admin_subject = f"New Contact Form Submission: {subject}"
    admin_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; }}
            .field {{ margin-bottom: 15px; }}
            .field-label {{ font-weight: bold; color: #555; }}
            .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🌍 Entiha</h1>
                <h2>New Contact Form Submission</h2>
            </div>
            <div class="content">
                <div class="field">
                    <div class="field-label">From:</div>
                    <div>{name} ({email})</div>
                </div>
                <div class="field">
                    <div class="field-label">Subject:</div>
                    <div>{subject}</div>
                </div>
                <div class="field">
                    <div class="field-label">Message:</div>
                    <div style="background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #667eea;">
                        {message}
                    </div>
                </div>
                <div class="field">
                    <div class="field-label">Received:</div>
                    <div>{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</div>
                </div>
            </div>
            <div class="footer">
                <p>&copy; 2025 Entiha. All rights reserved.</p>
                <p>This is an automated notification from your website contact form.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Send to admin email
    admin_email_sent = send_email('assignmentstandard@gmail.com', admin_subject, admin_body)
    
    # Send confirmation to user
    user_subject = "Thank You for Contacting Entiha"
    user_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; }}
            .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🌍 Entiha</h1>
            </div>
            <div class="content">
                <h2>Thank You for Contacting Us!</h2>
                <p>Hello <strong>{name}</strong>,</p>
                <p>We have received your message and will get back to you within 24 hours.</p>
                <p><strong>Here's a summary of your inquiry:</strong></p>
                <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #667eea;">
                    <p><strong>Subject:</strong> {subject}</p>
                    <p><strong>Your Message:</strong></p>
                    <p>{message}</p>
                </div>
                <p>If you have any urgent questions, feel free to call us at +91 99969 96575.</p>
                <p>Best regards,<br>The Entiha Team</p>
            </div>
            <div class="footer">
                <p>&copy; 2025 Entiha. All rights reserved.</p>
                <p>This is an automated confirmation email.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    user_email_sent = send_email(email, user_subject, user_body)
    
    if admin_email_sent or user_email_sent:
        return jsonify({'success': True, 'message': 'Message sent successfully! We will get back to you within 24 hours.'})
    else:
        return jsonify({'success': True, 'message': 'Message received! We will contact you soon. (Email delivery issue)'})

# Admin routes
@app.route('/api/admin/students', methods=['GET'])
def get_students():
    if 'user_id' not in session or session.get('user_role') != 'admin':
        return jsonify({'success': False, 'message': 'Unauthorized'})
    
    students = User.query.filter_by(role='student').all()
    students_data = []
    
    for student in students:
        profile = UserProfile.query.filter_by(user_id=student.id).first()
        total_applications = JobApplication.query.filter_by(user_id=student.id).count()
        leads_count = JobApplication.query.filter_by(user_id=student.id, status='lead').count()
        interviews_scheduled = JobApplication.query.filter_by(user_id=student.id, status='interview_scheduled').count()
        interviews_done = JobApplication.query.filter_by(user_id=student.id, status='interview_done').count()
        offers = JobApplication.query.filter_by(user_id=student.id, status='offer').count()
        
        students_data.append({
            'id': student.id,
            'name': student.name,
            'email': student.email,
            'phone': student.phone,
            'package': student.current_package,
            'stats': {
                'total_applications': total_applications,
                'leads': leads_count,
                'interviews_scheduled': interviews_scheduled,
                'interviews_done': interviews_done,
                'offers': offers
            },
            'profile': {
                'leads_done': profile.leads_done if profile else 0,
                'jobs_applied': profile.jobs_applied if profile else 0,
                'interviews_done': profile.interviews_done if profile else 0
            } if profile else {}
        })
    
    return jsonify({'success': True, 'students': students_data})

@app.route('/api/admin/student/<int:student_id>', methods=['GET'])
def get_student_details(student_id):
    if 'user_id' not in session or session.get('user_role') != 'admin':
        return jsonify({'success': False, 'message': 'Unauthorized'})
    
    student = db.session.get(User, student_id)
    if not student:
        student = User.query.get(student_id)
    
    if not student or student.role != 'student':
        return jsonify({'success': False, 'message': 'Student not found'})
    
    profile = UserProfile.query.filter_by(user_id=student.id).first()
    courses = Course.query.filter_by(user_id=student.id).all()
    job_applications = JobApplication.query.filter_by(user_id=student.id).order_by(JobApplication.application_date.desc()).all()
    
    student_data = {
        'id': student.id,
        'name': student.name,
        'email': student.email,
        'phone': student.phone,
        'skills': json.loads(student.skills) if student.skills else [],
        'job_preferences': student.job_preferences,
        'job_account_email': student.job_account_email,
        'job_account_password': student.job_account_password,
        'package': student.current_package,
        'profile': {
            'photo': profile.photo if profile else None,
            'github_link': profile.github_link if profile else None,
            'linkedin_link': profile.linkedin_link if profile else None,
            'leads_done': profile.leads_done if profile else 0,
            'jobs_applied': profile.jobs_applied if profile else 0,
            'interviews_done': profile.interviews_done if profile else 0,
            'resume': profile.resume if profile else None
        },
        'courses': [{'id': c.id, 'name': c.name, 'link': c.link} for c in courses],
        'job_applications': [{
            'id': ja.id,
            'job_title': ja.job_title,
            'company': ja.company,
            'application_date': ja.application_date.isoformat() if ja.application_date else None,
            'status': ja.status,
            'source': ja.source,
            'application_link': ja.application_link,
            'interview_date': ja.interview_date.isoformat() if ja.interview_date else None,
            'interview_result': ja.interview_result,
            'notes': ja.notes,
            'admin_notes': ja.admin_notes
        } for ja in job_applications]
    }
    
    return jsonify({'success': True, 'student': student_data})

@app.route('/api/admin/student/<int:student_id>/update', methods=['POST'])
def update_student_data(student_id):
    if 'user_id' not in session or session.get('user_role') != 'admin':
        return jsonify({'success': False, 'message': 'Unauthorized'})
    
    data = request.json or {}
    student = db.session.get(User, student_id)
    if not student:
        student = User.query.get(student_id)
    
    if not student or student.role != 'student':
        return jsonify({'success': False, 'message': 'Student not found'})
    
    profile = UserProfile.query.filter_by(user_id=student.id).first()
    if not profile:
        profile = UserProfile(user_id=student.id)
        db.session.add(profile)
    
    if 'github_link' in data:
        profile.github_link = data['github_link']
    if 'linkedin_link' in data:
        profile.linkedin_link = data['linkedin_link']
    if 'leads_done' in data:
        profile.leads_done = data['leads_done']
    if 'jobs_applied' in data:
        profile.jobs_applied = data['jobs_applied']
    if 'interviews_done' in data:
        profile.interviews_done = data['interviews_done']
    if 'resume' in data:
        profile.resume = data['resume']
    
    if 'course_name' in data and 'course_link' in data:
        course = Course(
            user_id=student_id,
            name=data['course_name'],
            link=data['course_link'],
            added_by=db.session.get(User, session['user_id']).email
        )
        db.session.add(course)
    
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Student data updated successfully'})

@app.route('/api/admin/student/<int:student_id>/job-application', methods=['POST'])
def add_job_application(student_id):
    if 'user_id' not in session or session.get('user_role') != 'admin':
        return jsonify({'success': False, 'message': 'Unauthorized'})
    
    data = request.json or {}
    student = db.session.get(User, student_id)
    if not student:
        student = User.query.get(student_id)
    
    if not student or student.role != 'student':
        return jsonify({'success': False, 'message': 'Student not found'})
    
    job_application = JobApplication(
        user_id=student_id,
        job_title=data.get('job_title', ''),
        company=data.get('company', ''),
        status=data.get('status', 'applied'),
        source=data.get('source', ''),
        application_link=data.get('application_link', ''),
        notes=data.get('notes', ''),
        admin_notes=data.get('admin_notes', '')
    )
    
    if data.get('interview_date'):
        job_application.interview_date = datetime.fromisoformat(data['interview_date'].replace('Z', '+00:00'))
    
    db.session.add(job_application)
    
    # Update profile stats based on application status
    profile = UserProfile.query.filter_by(user_id=student_id).first()
    if not profile:
        profile = UserProfile(user_id=student_id)
        db.session.add(profile)
    
    status = data.get('status', 'applied')
    if status == 'lead':
        profile.leads_done = JobApplication.query.filter_by(user_id=student_id, status='lead').count()
    elif status == 'applied':
        profile.jobs_applied = JobApplication.query.filter_by(user_id=student_id).count()
    elif status == 'interview_done':
        profile.interviews_done = JobApplication.query.filter_by(user_id=student_id, status='interview_done').count()
    
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Job application added successfully'})

@app.route('/api/admin/student/<int:student_id>/job-application/<int:application_id>', methods=['PUT'])
def update_job_application(student_id, application_id):
    if 'user_id' not in session or session.get('user_role') != 'admin':
        return jsonify({'success': False, 'message': 'Unauthorized'})
    
    data = request.json or {}
    job_application = JobApplication.query.get(application_id)
    
    if not job_application or job_application.user_id != student_id:
        return jsonify({'success': False, 'message': 'Job application not found'})
    
    if 'job_title' in data:
        job_application.job_title = data['job_title']
    if 'company' in data:
        job_application.company = data['company']
    if 'status' in data:
        job_application.status = data['status']
    if 'source' in data:
        job_application.source = data['source']
    if 'application_link' in data:
        job_application.application_link = data['application_link']
    if 'interview_date' in data:
        job_application.interview_date = datetime.fromisoformat(data['interview_date'].replace('Z', '+00:00')) if data['interview_date'] else None
    if 'interview_result' in data:
        job_application.interview_result = data['interview_result']
    if 'notes' in data:
        job_application.notes = data['notes']
    if 'admin_notes' in data:
        job_application.admin_notes = data['admin_notes']
    
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Job application updated successfully'})

@app.route('/api/admin/student/<int:student_id>/course/<int:course_id>', methods=['DELETE'])
def delete_course(student_id, course_id):
    if 'user_id' not in session or session.get('user_role') != 'admin':
        return jsonify({'success': False, 'message': 'Unauthorized'})
    
    course = Course.query.get(course_id)
    if course and course.user_id == student_id:
        db.session.delete(course)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Course deleted successfully'})
    
    return jsonify({'success': False, 'message': 'Course not found'})

# Cashfree Payment Routes
@app.route('/api/create-cashfree-session', methods=['POST'])
def create_cashfree_session():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'})
    
    data = request.json or {}
    amount = data.get('amount', 0)
    currency = data.get('currency', 'USD')
    plan = data.get('plan', '')
    order_id = data.get('orderId', '')
    
    try:
        user = db.session.get(User, session['user_id'])
        if not user:
            user = User.query.get(session['user_id'])
        
        # Convert amount to INR for Cashfree (if needed)
        if currency == 'USD':
            amount_inr = amount * 83  # Convert USD to INR (adjust rate as needed)
        else:
            amount_inr = amount
        
        # Create order in Cashfree
        order_data = {
            "order_id": order_id,
            "order_amount": amount_inr,
            "order_currency": "INR",
            "order_note": f"{plan} Plan - Entiha",
            "customer_details": {
                "customer_id": str(user.id),
                "customer_name": user.name,
                "customer_email": user.email,
                "customer_phone": user.phone
            },
            "order_meta": {
                "return_url": f"http://localhost:5000/payment-success.html?order_id={order_id}&plan={plan}",
                "notify_url": "http://localhost:5000/api/webhook/cashfree"
            }
        }
        
        response = requests.post(
            f"{CASHFREE_BASE_URL}/pg/orders",
            headers=get_cashfree_headers(),
            json=order_data
        )
        
        if response.status_code == 200:
            result = response.json()
            
            # Store pending payment
            pending_payment = PendingPayment(
                user_id=session['user_id'],
                order_id=order_id,
                amount=amount,
                currency=currency,
                plan=plan,
                payment_method='cashfree',
                status='pending'
            )
            db.session.add(pending_payment)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'paymentSessionId': result['payment_session_id'],
                'orderId': order_id
            })
        else:
            return jsonify({'success': False, 'message': 'Failed to create payment session'})
            
    except Exception as e:
        print(f"Cashfree session error: {str(e)}")
        return jsonify({'success': False, 'message': f'Payment error: {str(e)}'})

@app.route('/api/create-remittance-payment', methods=['POST'])
def create_remittance_payment():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'})
    
    data = request.json or {}
    amount = data.get('amount', 0)
    currency = data.get('currency', 'USD')
    plan = data.get('plan', '')
    order_id = data.get('orderId', '')
    method = data.get('method', '')
    proof = data.get('proof', '')
    
    try:
        user = db.session.get(User, session['user_id'])
        if not user:
            user = User.query.get(session['user_id'])
        
        # Create remitly payment record
        remitly_payment = RemitlyPayment(
            user_id=session['user_id'],
            order_id=order_id,
            amount=amount,
            currency=currency,
            plan=plan,
            proof_image=proof,
            status='pending'
        )
        
        db.session.add(remitly_payment)
        db.session.commit()
        
        # Send notification email to admin
        send_remitly_notification_email(user, order_id, amount, plan)
        
        return jsonify({
            'success': True,
            'message': 'Remitly payment submitted successfully. We will verify and activate your service shortly.'
        })
        
    except Exception as e:
        print(f"Remittance payment error: {str(e)}")
        return jsonify({'success': False, 'message': f'Payment submission failed: {str(e)}'})

def send_remitly_notification_email(user, order_id, amount, plan):
    """Send email to admin about new Remitly payment"""
    subject = f"New Remitly Payment - Order {order_id}"
    body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; }}
            .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🌍 Entiha</h1>
                <h2>New Remitly Payment Received</h2>
            </div>
            <div class="content">
                <h3>Payment Details:</h3>
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Order ID:</strong> {order_id}</p>
                    <p><strong>Student:</strong> {user.name} ({user.email})</p>
                    <p><strong>Plan:</strong> {plan}</p>
                    <p><strong>Amount:</strong> ${amount}</p>
                    <p><strong>Payment Method:</strong> Remitly</p>
                    <p><strong>Submitted:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M')}</p>
                </div>
                <p>Please verify this payment in the admin dashboard and activate the student's service.</p>
                <a href="http://localhost:5000/admin-dashboard.html#remitly-payments" style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: bold;">View in Admin Dashboard</a>
            </div>
            <div class="footer">
                <p>&copy; 2025 Entiha. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    send_email('assignmentstandard@gmail.com', subject, body)

# Admin routes for Remitly payments
@app.route('/api/admin/remitly-payments', methods=['GET'])
def get_remitly_payments():
    if 'user_id' not in session or session.get('user_role') != 'admin':
        return jsonify({'success': False, 'message': 'Unauthorized'})
    
    payments = RemitlyPayment.query.order_by(RemitlyPayment.created_at.desc()).all()
    payments_data = []
    
    for payment in payments:
        user = User.query.get(payment.user_id)
        payments_data.append({
            'id': payment.id,
            'order_id': payment.order_id,
            'user_name': user.name if user else 'Unknown',
            'user_email': user.email if user else 'Unknown',
            'amount': payment.amount,
            'currency': payment.currency,
            'plan': payment.plan,
            'proof_image': payment.proof_image,
            'status': payment.status,
            'transaction_id': payment.transaction_id,
            'remitly_reference': payment.remitly_reference,
            'admin_notes': payment.admin_notes,
            'created_at': payment.created_at.isoformat() if payment.created_at else None,
            'verified_at': payment.verified_at.isoformat() if payment.verified_at else None
        })
    
    return jsonify({'success': True, 'payments': payments_data})

@app.route('/api/admin/remitly-payment/<int:payment_id>/verify', methods=['POST'])
def verify_remitly_payment(payment_id):
    if 'user_id' not in session or session.get('user_role') != 'admin':
        return jsonify({'success': False, 'message': 'Unauthorized'})
    
    data = request.json or {}
    status = data.get('status', 'verified')
    transaction_id = data.get('transaction_id', '')
    remitly_reference = data.get('remitly_reference', '')
    admin_notes = data.get('admin_notes', '')
    
    try:
        payment = RemitlyPayment.query.get(payment_id)
        if not payment:
            return jsonify({'success': False, 'message': 'Payment not found'})
        
        payment.status = status
        payment.transaction_id = transaction_id
        payment.remitly_reference = remitly_reference
        payment.admin_notes = admin_notes
        payment.verified_at = datetime.utcnow()
        payment.verified_by = session['user_id']
        
        # If verified, activate user package
        if status == 'verified':
            user = User.query.get(payment.user_id)
            if user:
                user.current_package = payment.plan
                user.package_purchase_date = datetime.utcnow()
                
                # Create payment record
                payment_record = Payment(
                    user_id=payment.user_id,
                    order_id=payment.order_id,
                    transaction_id=transaction_id,
                    amount=payment.amount,
                    currency=payment.currency,
                    payment_method='remitly',
                    plan=payment.plan,
                    status='completed'
                )
                db.session.add(payment_record)
                
                # Send confirmation email to student
                send_payment_confirmation_email(user, payment.plan, payment.amount, 'remitly')
        
        db.session.commit()
        
        return jsonify({'success': True, 'message': f'Payment {status} successfully'})
        
    except Exception as e:
        print(f"Verify remitly payment error: {str(e)}")
        return jsonify({'success': False, 'message': f'Verification failed: {str(e)}'})

# Webhook for Cashfree
@app.route('/api/webhook/cashfree', methods=['POST'])
def cashfree_webhook():
    try:
        data = request.json
        order_id = data.get('orderId')
        payment_status = data.get('paymentStatus')
        
        if payment_status == 'SUCCESS':
            # Find pending payment
            pending_payment = PendingPayment.query.filter_by(order_id=order_id).first()
            if pending_payment:
                user = User.query.get(pending_payment.user_id)
                if user:
                    user.current_package = pending_payment.plan
                    user.package_purchase_date = datetime.utcnow()
                    
                    # Create payment record
                    payment = Payment(
                        user_id=user.id,
                        order_id=order_id,
                        transaction_id=data.get('transactionId', ''),
                        amount=pending_payment.amount,
                        currency=pending_payment.currency,
                        payment_method='cashfree',
                        plan=pending_payment.plan,
                        status='completed'
                    )
                    db.session.add(payment)
                    
                    # Update pending payment status
                    pending_payment.status = 'completed'
                    pending_payment.completed_at = datetime.utcnow()
                    
                    db.session.commit()
                    
                    send_payment_confirmation_email(user, pending_payment.plan, pending_payment.amount, 'cashfree')
        
        return jsonify({'success': True})
        
    except Exception as e:
        print(f"Cashfree webhook error: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 400

def send_payment_confirmation_email(user, plan, amount, method):
    subject = f"Payment Confirmed - {plan} Plan"
    body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; }}
            .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🌍 Entiha</h1>
                <h2>Payment Confirmed!</h2>
            </div>
            <div class="content">
                <h3>Thank you for your purchase!</h3>
                <p>Hello <strong>{user.name}</strong>,</p>
                <p>Your payment has been confirmed and your <strong>{plan} Plan</strong> is now active.</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4ade80;">
                    <h4>Order Details:</h4>
                    <p><strong>Plan:</strong> {plan}</p>
                    <p><strong>Amount:</strong> ${amount}</p>
                    <p><strong>Payment Method:</strong> {method}</p>
                    <p><strong>Activation Date:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M')}</p>
                </div>
                
                <p>You can now access all features of your plan in your dashboard.</p>
                <a href="http://localhost:5000/dashboard.html" style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold;">Go to Dashboard</a>
            </div>
            <div class="footer">
                <p>&copy; 2025 Entiha. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    send_email(user.email, subject, body)

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'success': True, 'message': 'Backend is running'})

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')