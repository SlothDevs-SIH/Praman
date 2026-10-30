import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  try {
    return twMerge(clsx(inputs));
  } catch {
    return inputs.flat().filter(Boolean).join(' ');
  }
}
