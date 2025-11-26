from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def init_db(app):
    db.init_app(app)
    
    with app.app_context():
        db.create_all()
        
        # Create default admin user
        from models import User
        admin = User.query.filter_by(email='Assignmentstandard@gmail.com').first()
        if not admin:
            admin = User(
                name='Admin User',
                email='Assignmentstandard@gmail.com',
                phone='+1-555-000-0000',
                password='Filing@ps',
                role='admin'
            )
            db.session.add(admin)
            db.session.commit()