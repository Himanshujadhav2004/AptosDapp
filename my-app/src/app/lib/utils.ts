import { ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  const classes: string[] = [];
  
  for (const input of inputs) {
    if (!input) continue;
    
    if (typeof input === 'string') {
      classes.push(input);
    } else if (Array.isArray(input)) {
      const result = cn(...input);
    }
  }
  
  return classes.join(' ');
}
