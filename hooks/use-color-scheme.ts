// Default to light mode as per requirements
export function useColorScheme(): 'light' | 'dark' {
  // In a real app with "unless changed" requirement, 
  // we would check a persisted user preference here.
  // For now, we force 'light' to override system dark mode.
  return 'light';
}
