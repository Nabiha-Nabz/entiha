import os

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-only-change-me')
    DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'database.db')
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{DATABASE_PATH}'
    STATIC_FOLDER = '../'
    TEMPLATE_FOLDER = '../'
    
    # Email Configuration
    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.getenv('MAIL_USERNAME', '')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD', '')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', 'Entiha <noreply@example.com>')
