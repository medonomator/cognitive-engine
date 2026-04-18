let counter = 0

/**
 * Generate a unique ID with a prefix.
 * Format: `{prefix}_{timestamp}_{counter}`
 *
 * Not cryptographically secure - use for internal entity IDs only.
 */
export function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${++counter}`
}
