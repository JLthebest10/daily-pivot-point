export type ImportanceLevel = "normal" | "importante" | "muito";

export const IMPORTANCE: {
  value: ImportanceLevel;
  label: string;
  dot: string;
  border: string;
  text: string;
  rank: number;
}[] = [
  {
    value: "normal",
    label: "Normal",
    dot: "bg-primary",
    border: "border-primary",
    text: "text-primary",
    rank: 1,
  },
  {
    value: "importante",
    label: "Importante",
    dot: "bg-warning",
    border: "border-warning",
    text: "text-warning",
    rank: 2,
  },
  {
    value: "muito",
    label: "Muito importante",
    dot: "bg-destructive",
    border: "border-destructive",
    text: "text-destructive",
    rank: 3,
  },
];

export function importanceOf(value?: string | null) {
  return IMPORTANCE.find((i) => i.value === value) ?? IMPORTANCE[0]!;
}
