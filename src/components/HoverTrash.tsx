import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "./ConfirmDelete";

interface HoverTrashProps {
  title: string;
  description: string;
  onConfirm: () => void;
  /** CSS class for the hover group, e.g. "group-hover/crit:opacity-100" */
  hoverClass: string;
}

export function HoverTrash({ title, description, onConfirm, hoverClass }: HoverTrashProps) {
  return (
    <div className={`absolute left-0 top-0 bottom-0 z-10 flex items-center pl-1 opacity-0 ${hoverClass} transition-opacity bg-gradient-to-r from-background/90 to-transparent pr-4`}>
      <ConfirmDelete title={title} description={description} onConfirm={onConfirm}>
        <Button variant="ghost" size="icon-sm" className="size-6">
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
      </ConfirmDelete>
    </div>
  );
}
