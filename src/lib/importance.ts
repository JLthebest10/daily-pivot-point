export type ImportanceLevel = "normal" | "importante" | "muito";

export const IMPORTANCE: {
  value: ImportanceLevel;
  label: string;
  dot: string;
  border: string;
  text: string;
}[] = [
  {
    value: "normal",
    label: "Normal",
    dot: "bg-primary",
    border: "border-primary",
    text: "text-primary",
  },
  {
    value: "importante",
    label: "Importante",
    dot: "bg-warning",
    border: "border-warning",
    text: "text-warning",
  },
  {
    value: "muito",
    label: "Muito importante",
    dot: "bg-destructive",
    border: "border-destructive",
    text: "text-destructive",
  },
];

export function importanceOf(value?: string | null) {
  return IMPORTANCE.find((i) => i.value === value) ?? IMPORTANCE[0]!;
}
