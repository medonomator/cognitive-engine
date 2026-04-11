/**
 * Exponential decay weight based on time elapsed.
 *
 * weight = exp(-lambda * hoursAgo)
 *
 * With default lambda=0.03:
 *   1 hour ago:  ~0.97
 *   12 hours:    ~0.70
 *   1 day:       ~0.49
 *   3 days:      ~0.12
 *   7 days:      ~0.007
 *
 * @param hoursAgo - time elapsed in hours
 * @param lambda - decay rate per hour (default 0.03)
 */
export function exponentialDecay(hoursAgo: number, lambda = 0.03): number {
  return Math.exp(-lambda * Math.max(hoursAgo, 0))
}

/**
 * Compute time-decay weights for an array of timestamps.
 * More recent timestamps get higher weights.
 *
 * @param timestamps - array of Date objects
 * @param lambda - decay rate per hour
 * @param now - reference time (default: current time)
 * @returns array of weights (same order as input)
 */
export function timeDecayWeights(
  timestamps: Date[],
  lambda = 0.03,
  now?: Date,
): number[] {
  const ref = (now ?? new Date()).getTime()
  return timestamps.map((ts) => {
    const hoursAgo = (ref - ts.getTime()) / 3_600_000
    return exponentialDecay(hoursAgo, lambda)
  })
}

/**
 * One-hot encoding: set index to 1, rest to 0.
 *
 * @param index - which position to set to 1 (-1 or out of range = all zeros)
 * @param size - total vector size
 */
export function oneHot(index: number, size: number): number[] {
  const result = new Array<number>(size).fill(0)
  if (index >= 0 && index < size) {
    result[index] = 1
  }
  return result
}

/**
 * Bin a continuous value into discrete buckets.
 * Returns one-hot vector of length bins.length + 1.
 *
 * Example: binValue(7, [5, 30]) → [0, 1, 0]
 *   (7 falls into bin 1: ≥5 and <30)
 *
 * @param value - value to bin
 * @param bins - sorted bin boundaries (ascending)
 */
export function binValue(value: number, bins: number[]): number[] {
  const size = bins.length + 1
  let idx = 0
  for (let i = 0; i < bins.length; i++) {
    if (value >= bins[i]!) {
      idx = i + 1
    }
  }
  return oneHot(idx, size)
}
