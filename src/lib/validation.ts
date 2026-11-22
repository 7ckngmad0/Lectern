const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Enter your email address.';
  if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address.';
  return null;
}

export function validatePassword(password: string, { strict = false } = {}): string | null {
  if (!password) return 'Enter your password.';
  if (password.length < 8) return 'Use at least 8 characters.';
  if (strict && !/[A-Za-z]/.test(password)) return 'Include at least one letter.';
  if (strict && !/\d/.test(password)) return 'Include at least one number.';
  return null;
}

export function validateName(name: string): string | null {
  if (!name.trim()) return 'Enter your full name.';
  if (name.trim().length < 2) return 'Name is too short.';
  if (name.trim().length > 80) return 'Keep your name under 80 characters.';
  return null;
}
