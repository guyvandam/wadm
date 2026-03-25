import { useState, useMemo } from "react";
import * as icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Smile } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Build icon map once (exclude non-icon exports and *Icon duplicates)
const ICON_MAP: Record<string, LucideIcon> = {};
for (const [name, component] of Object.entries(icons)) {
  if (
    name[0] === name[0].toUpperCase() &&
    !name.endsWith("Icon") &&
    name !== "default" &&
    name !== "createLucideIcon" &&
    name !== "icons" &&
    typeof component === "object"
  ) {
    ICON_MAP[name] = component as LucideIcon;
  }
}

const ICON_NAMES = Object.keys(ICON_MAP);

export const CRITERION_COLORS = [
  "hsl(210, 80%, 92%)", // blue
  "hsl(150, 70%, 90%)", // green
  "hsl(35, 90%, 90%)",  // orange
  "hsl(280, 60%, 92%)", // purple
  "hsl(350, 75%, 92%)", // red/pink
  "hsl(180, 60%, 90%)", // teal
  "hsl(55, 85%, 90%)",  // yellow
  "hsl(320, 60%, 92%)", // magenta
  "hsl(200, 70%, 92%)", // sky
  "hsl(100, 55%, 90%)", // lime
];

interface IconPickerProps {
  value?: string;
  onChange: (iconName: string) => void;
  color?: string;
  onColorChange?: (color: string) => void;
}

export function IconPicker({ value, onChange, color, onColorChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return ICON_NAMES.slice(0, 60);
    const q = search.toLowerCase();
    return ICON_NAMES.filter((n) => n.toLowerCase().includes(q)).slice(0, 60);
  }, [search]);

  const SelectedIcon = value ? ICON_MAP[value] : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0 size-7"
            >
              {SelectedIcon ? (
                <SelectedIcon className="size-4" />
              ) : (
                <Smile className="size-4 text-muted-foreground" />
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Pick icon & color</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-[280px] p-2" align="start">
        {/* Color swatches */}
        {onColorChange && (
          <>
            <div className="grid grid-cols-10 gap-1.5 px-1">
              {CRITERION_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`size-6 rounded-full border-2 transition-transform hover:scale-110 ${
                    color === c
                      ? "border-primary ring-1 ring-primary"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => onColorChange(c)}
                />
              ))}
            </div>
            <Separator className="my-2" />
          </>
        )}
        {/* Icon search */}
        <Input
          placeholder="Search icons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 mb-2 text-sm"
          autoFocus
        />
        <div className="grid grid-cols-8 gap-1 max-h-[200px] overflow-y-auto">
          {filtered.map((name) => {
            const Icon = ICON_MAP[name]!;
            return (
              <Tooltip key={name}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={`flex items-center justify-center size-8 rounded hover:bg-accent ${
                      value === name
                        ? "bg-accent ring-1 ring-primary"
                        : ""
                    }`}
                    onClick={() => {
                      onChange(name);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Icon className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{name}</TooltipContent>
              </Tooltip>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-8 text-center text-sm text-muted-foreground py-4">
              No icons found
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
