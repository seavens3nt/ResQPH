export function validEmail(value: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) && value.trim().length <= 254 }
export function validPhone(value: string): boolean { return /^(09\d{9}|\+639\d{9})$/.test(value.replace(/[\s()-]/g, '')) }
export function validPassword(value: string): boolean { return value.trim().length >= 6 }
