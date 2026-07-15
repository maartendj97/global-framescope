import { BackIcon } from "./icons";

type BackButtonProps = {
  onClick: () => void;
  label?: string;
};

export function BackButton({ onClick, label = "Back" }: BackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ml-2 flex min-h-11 items-center gap-1 px-2 text-sm font-medium text-muted-foreground"
    >
      <BackIcon className="h-4 w-4" />
      {label}
    </button>
  );
}
