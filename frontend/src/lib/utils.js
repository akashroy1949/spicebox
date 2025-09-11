import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Validates and clamps weight values to be within valid bounds
 * @param {number} weight - The raw weight value
 * @param {number} maxWeight - The maximum allowed weight
 * @returns {number} - The clamped weight value
 */
export function validateWeight(weight, maxWeight = 500) {
  // Convert to number if it's a string
  const numWeight = typeof weight === 'string' ? parseFloat(weight) : weight;
  
  // If weight is null, undefined, or NaN, return 0
  if (numWeight == null || isNaN(numWeight)) {
    return 0;
  }
  
  // Clamp weight between 0 and maxWeight
  return Math.max(0, Math.min(numWeight, maxWeight));
}
