from database import db
from datetime import datetime, timedelta
import secrets

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    skills = db.Column(db.Text)  # JSON string of skills
    job_preferences = db.Column(db.Text)
    job_account_email = db.Column(db.String(100))
    job_account_password = db.Column(db.String(100))
    password = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), default='student')
    current_package = db.Column(db.String(20))
    package_purchase_date = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Profile relationships
    profile = db.relationship('UserProfile', backref='user', uselist=False)
    courses = db.relationship('Course', backref='user')
    job_applications = db.relationship('JobApplication', backref='user')
    password_resets = db.relationship('PasswordReset', backref='user')

class UserProfile(db.Model):
    __tablename__ = 'user_profiles'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True)
    photo = db.Column(db.Text)  # Base64 encoded image
    github_link = db.Column(db.String(200))
    linkedin_link = db.Column(db.String(200))
    leads_done = db.Column(db.Integer, default=0)
    jobs_applied = db.Column(db.Integer, default=0)
    interviews_done = db.Column(db.Integer, default=0)
    resume = db.Column(db.Text)  # Base64 encoded resume
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Course(db.Model):
    __tablename__ = 'courses'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    name = db.Column(db.String(200), nullable=False)
    link = db.Column(db.String(500), nullable=False)
    added_by = db.Column(db.String(100))  # admin email
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class JobApplication(db.Model):
    __tablename__ = 'job_applications'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    job_title = db.Column(db.String(200), nullable=False)
    company = db.Column(db.String(200))
    application_date = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(50), default='applied')  # applied/lead/interview_scheduled/interview_done/offer/rejected
    source = db.Column(db.String(100))  # LinkedIn/Indeed/etc.
    application_link = db.Column(db.String(500))
    interview_date = db.Column(db.DateTime)
    interview_result = db.Column(db.String(50))  # pending/passed/failed
    notes = db.Column(db.Text)
    admin_notes = db.Column(db.Text)

class ContactMessage(db.Model):
    __tablename__ = 'contact_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    subject = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='new')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class AdminAction(db.Model):
    __tablename__ = 'admin_actions'
    
    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    action_type = db.Column(db.String(100), nullable=False)
    action_details = db.Column(db.Text)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class PasswordReset(db.Model):
    __tablename__ = 'password_resets'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    token = db.Column(db.String(100), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)

class Payment(db.Model):
    __tablename__ = 'payments'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    order_id = db.Column(db.String(100), unique=True, nullable=False)
    transaction_id = db.Column(db.String(200))
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default='USD')
    payment_method = db.Column(db.String(50), nullable=False)  # cashfree, remitly
    plan = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, completed, failed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)

class PendingPayment(db.Model):
    __tablename__ = 'pending_payments'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    order_id = db.Column(db.String(100), unique=True, nullable=False)
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default='USD')
    plan = db.Column(db.String(20), nullable=False)
    payment_method = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)

class RemitlyPayment(db.Model):
    __tablename__ = 'remitly_payments'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    order_id = db.Column(db.String(100), unique=True, nullable=False)
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default='USD')
    plan = db.Column(db.String(20), nullable=False)
    proof_image = db.Column(db.Text)  # Base64 encoded proof image
    status = db.Column(db.String(20), default='pending')  # pending, verified, rejected
    transaction_id = db.Column(db.String(200))
    remitly_reference = db.Column(db.String(200))
    admin_notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    verified_at = db.Column(db.DateTime)
    verified_by = db.Column(db.Integer, db.ForeignKey('users.id'))