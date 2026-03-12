/**
 * Convert a dollar amount (user input) to integer cents.
 * Returns null if the input is invalid (negative or more than 2 decimal places).
 */
export function dollarsToCents(dollars: number): number | null {
  if (dollars < 0) return null
  // Check for more than 2 decimal places
  const str = dollars.toString()
  const dotIndex = str.indexOf('.')
  if (dotIndex !== -1 && str.length - dotIndex - 1 > 2) return null
  return Math.round(dollars * 100)
}

/**
 * Validate a dollar amount from user input.
 * Returns an error message string if invalid, or null if valid.
 */
export function validateAmount(dollars: number): string | null {
  if (typeof dollars !== 'number' || isNaN(dollars)) {
    return 'Amount must be a valid number.'
  }
  if (dollars < 0) {
    return 'Amount cannot be negative.'
  }
  if (dollars === 0) {
    return 'Amount must be greater than zero.'
  }
  const str = dollars.toString()
  const dotIndex = str.indexOf('.')
  if (dotIndex !== -1 && str.length - dotIndex - 1 > 2) {
    return 'Amount cannot have more than 2 decimal places.'
  }
  return null
}
