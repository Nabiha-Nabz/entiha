import os

class Config:
    SECRET_KEY = 'your-secret-key-here-change-in-production'
    DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'database.db')
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{DATABASE_PATH}'
    STATIC_FOLDER = '../'
    TEMPLATE_FOLDER = '../'
    
    # Email Configuration
    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = 'assignmentstandard@gmail.com'
    # App password from your screenshot (16 chars, no spaces)
    MAIL_PASSWORD = 'grmajqebqalfymvg'
    # Use display name "Entiha" for the sender
    MAIL_DEFAULT_SENDER = 'Entiha <assignmentstandard@gmail.com>'
