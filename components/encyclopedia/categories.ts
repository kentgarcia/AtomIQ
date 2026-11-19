/** The encyclopedia's archives: a label, an icon and an accent for each (list filters and entry pages). */

export type VaultCat = {
  label: string;
  /** Icon name. */
  icon: string;
  /** Accent of that icon (each archive has its own). */
  color: string;
};

const CATEGORY_VAULT: Record<string, VaultCat> = {
  science: { label: "Science", icon: "AqAtom", color: "#8B5CF6" },
  technology: { label: "Technology", icon: "Cpu", color: "#3B82F6" },
  safety: { label: "Safety", icon: "ShieldTick", color: "#10B981" },
  environment: { label: "Environment", icon: "AqLeaf", color: "#16A34A" },
  people: { label: "People", icon: "People", color: "#F59E0B" },
  history: { label: "History", icon: "Clock", color: "#CA8A04" },
  default: { label: "Archive", icon: "Archive", color: "#6B7280" },
};

export const getVaultCat = (cat: string): VaultCat => CATEGORY_VAULT[cat?.toLowerCase()] ?? CATEGORY_VAULT.default!;
