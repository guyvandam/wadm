export interface OptionScore {
  score: number;
  note: string;
}

export interface Criterion {
  id: string;
  name: string;
  weight: number;
  note: string;
  icon?: string; // Lucide icon name, e.g. "Star", "DollarSign"
  color?: string; // Background color for the criterion row's first column
}

export interface Option {
  id: string;
  name: string;
  scores: Record<string, OptionScore>; // keyed by criterion id
  icon?: string;
  color?: string;
}

export interface Wadm {
  id: string;
  name: string;
  date: string;
  notes: string;
  criteria: Criterion[];
  options: Option[];
}

export interface WadmSummary {
  id: string;
  name: string;
  date: string;
  optionCount: number;
  criteriaCount: number;
}
