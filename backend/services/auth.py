"""
backend/services/auth.py
Authentication helpers: validation, user creation, password verification.
"""

import re
from backend.services.database import db, User


def validate_signup(full_name: str, business_name: str, email: str, password: str, confirm_password: str, phone: str = "") -> tuple[bool, list[str]]:
    """Validate user registration inputs."""
    errors = []

    if not full_name or len(full_name.strip()) < 2:
        errors.append("Full name must be at least 2 characters.")

    if not email or not re.match(r"[^@]+@[^@]+\.[^@]+", email.strip()):
        errors.append("Please enter a valid email address.")
    else:
        existing = User.query.filter_by(email=email.strip().lower()).first()
        if existing:
            errors.append("An account with this email already exists.")

    if not password or len(password) < 6:
        errors.append("Password must be at least 6 characters.")

    if confirm_password is not None and password != confirm_password:
        errors.append("Passwords do not match.")

    return len(errors) == 0, errors


def create_user(full_name: str, business_name: str, email: str, password: str, phone: str = "", preferred_language: str = "en") -> User:
    """Create and persist a new user."""
    user = User(
        full_name=full_name.strip(),
        business_name=business_name.strip() if business_name else "",
        email=email.strip().lower(),
        phone=phone.strip() if phone else "",
        preferred_language=preferred_language or "en",
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return user


def get_user_by_email(email: str) -> User | None:
    """Find user by email address."""
    if not email:
        return None
    return User.query.filter_by(email=email.strip().lower()).first()


def get_user_by_id(user_id: int) -> User | None:
    """Find user by id."""
    if not user_id:
        return None
    return db.session.get(User, int(user_id))
