import { useEffect, useState, useCallback, useRef } from "react";
import {
  ArrowLeft,
  Plus,
  Check,
  CalendarIcon,
  Download,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchWadm, updateWadm } from "../api-switch";
import type { Wadm, Criterion, Option, OptionScore } from "../types";
import { IconPicker, CRITERION_COLORS } from "./IconPicker";
import { HoverTrash } from "./HoverTrash";

interface WadmEditorProps {
  wadmId: string;
  onBack: () => void;
}

export function WadmEditor({ wadmId, onBack }: WadmEditorProps) {
  const [wadm, setWadm] = useState<Wadm | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saveAnim, setSaveAnim] = useState(false);
  const [noteDialog, setNoteDialog] = useState<{
    type: "criterion" | "score";
    criterionId?: string;
    optionId?: string;
    value: string;
  } | null>(null);
  const [dateOpen, setDateOpen] = useState(false);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const saveAnimTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchWadm(wadmId);
      setWadm(data);
    } catch {
      setNotFound(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [wadmId]);

  const autoSave = useCallback((updated: Wadm) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const saved = await updateWadm(updated);
        // If the id changed (name/date changed), update local state and URL
        if (saved.id !== updated.id) {
          setWadm((prev) => (prev ? { ...prev, id: saved.id } : prev));
          window.history.replaceState(null, "", `#/edit/${saved.id}`);
        }
        // Trigger saved animation
        setSaveAnim(true);
        if (saveAnimTimeoutRef.current) clearTimeout(saveAnimTimeoutRef.current);
        saveAnimTimeoutRef.current = setTimeout(() => setSaveAnim(false), 1500);
      } catch {
        // File may have been deleted externally - recreate it
        const { createWadm } = await import("../api-switch");
        const saved = await createWadm(updated);
        setWadm((prev) => (prev ? { ...prev, id: saved.id } : prev));
        window.history.replaceState(null, "", `#/edit/${saved.id}`);
        setSaveAnim(true);
        if (saveAnimTimeoutRef.current) clearTimeout(saveAnimTimeoutRef.current);
        saveAnimTimeoutRef.current = setTimeout(() => setSaveAnim(false), 1500);
      }
    }, 500);
  }, []);

  const update = useCallback(
    (fn: (w: Wadm) => Wadm) => {
      setWadm((prev) => {
        if (!prev) return prev;
        const updated = fn(prev);
        autoSave(updated);
        return updated;
      });
    },
    [autoSave]
  );

  const addCriterion = () => {
    update((w) => ({
      ...w,
      criteria: [
        ...w.criteria,
        {
          id: crypto.randomUUID(),
          name: "",
          weight: 5,
          note: "",
          color: CRITERION_COLORS[w.criteria.length % CRITERION_COLORS.length],
        },
      ],
    }));
  };

  const removeCriterion = (id: string) => {
    update((w) => ({
      ...w,
      criteria: w.criteria.filter((c) => c.id !== id),
      options: w.options.map((o) => {
        const scores = { ...o.scores };
        delete scores[id];
        return { ...o, scores };
      }),
    }));
  };

  const updateCriterion = (id: string, patch: Partial<Criterion>) => {
    update((w) => ({
      ...w,
      criteria: w.criteria.map((c) =>
        c.id === id ? { ...c, ...patch } : c
      ),
    }));
  };

  const addOption = () => {
    update((w) => ({
      ...w,
      options: [
        ...w.options,
        {
          id: crypto.randomUUID(),
          name: "",
          scores: {},
          color: CRITERION_COLORS[w.options.length % CRITERION_COLORS.length],
        },
      ],
    }));
  };

  const removeOption = (id: string) => {
    update((w) => ({
      ...w,
      options: w.options.filter((o) => o.id !== id),
    }));
  };

  const updateOption = (id: string, patch: Partial<Option>) => {
    update((w) => ({
      ...w,
      options: w.options.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    }));
  };

  const updateScore = (
    optionId: string,
    criterionId: string,
    patch: Partial<OptionScore>
  ) => {
    update((w) => ({
      ...w,
      options: w.options.map((o) => {
        if (o.id !== optionId) return o;
        const existing = o.scores[criterionId] ?? { score: 1, note: "" };
        return {
          ...o,
          scores: {
            ...o.scores,
            [criterionId]: { ...existing, ...patch },
          },
        };
      }),
    }));
  };

  const getWeightedScore = (option: Option): number => {
    if (!wadm) return 0;
    const totalWeight = wadm.criteria.reduce((sum, c) => sum + c.weight, 0);
    if (totalWeight === 0) return 0;
    return wadm.criteria.reduce((sum, c) => {
      const score = option.scores[c.id]?.score ?? 0;
      return sum + score * c.weight;
    }, 0) / totalWeight;
  };

  const getBestOptionId = (): string | null => {
    if (!wadm || wadm.options.length === 0) return null;
    let bestId = wadm.options[0]!.id;
    let bestScore = getWeightedScore(wadm.options[0]!);
    for (const o of wadm.options) {
      const score = getWeightedScore(o);
      if (score > bestScore) {
        bestScore = score;
        bestId = o.id;
      }
    }
    return bestScore > 0 ? bestId : null;
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 text-center py-12 text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (notFound || !wadm) {
    return (
      <div className="max-w-6xl mx-auto p-6 text-center py-12 space-y-4">
        <p className="text-muted-foreground">
          This decision was not found. It may have been deleted.
        </p>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Back to list
        </Button>
      </div>
    );
  }

  const bestOptionId = getBestOptionId();
  const selectedDate = wadm.date ? new Date(wadm.date + "T00:00:00") : undefined;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Saved animation - upper right */}
      <div
        className={`fixed top-4 right-16 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-600 text-white text-sm font-medium transition-all duration-300 ${
          saveAnim
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        <Check className="size-4" />
        Saved
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Back to list</TooltipContent>
        </Tooltip>
        <div className="flex-1 min-w-0">
          <Input
            value={wadm.name}
            onChange={(e) => update((w) => ({ ...w, name: e.target.value }))}
            className="text-xl font-bold border-none shadow-none px-0 h-auto focus-visible:ring-0"
            placeholder="Decision name..."
          />
          <div className="flex items-center gap-2 mt-1">
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-0 py-0 text-sm text-muted-foreground hover:text-foreground font-normal gap-1.5"
                >
                  <CalendarIcon className="size-3.5" />
                  {selectedDate
                    ? selectedDate.toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  defaultMonth={selectedDate ?? new Date()}
                  onSelect={(date) => {
                    if (date) {
                      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                      update((w) => ({ ...w, date: iso }));
                    }
                    setDateOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".json";
                input.onchange = async () => {
                  const file = input.files?.[0];
                  if (!file) return;
                  try {
                    const data = JSON.parse(await file.text());
                    if (data && typeof data === "object" && "criteria" in data) {
                      update((w) => ({ ...w, ...data, id: w.id }));
                    } else {
                      alert("Invalid WADM JSON file.");
                    }
                  } catch {
                    alert("Invalid WADM JSON file.");
                  }
                };
                input.click();
              }}>
                <Download className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Import JSON</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={() => {
                const blob = new Blob([JSON.stringify(wadm, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${wadm.name || "wadm"}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}>
                <Upload className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export JSON</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <Separator />

      {/* Matrix Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {/* Options row - elevated above criteria/weight headers */}
                <TableRow>
                  <TableHead colSpan={2} />
                  {wadm.options.map((option, optionIndex) => (
                    <TableHead
                      key={option.id}
                      className="text-center group/opt relative text-gray-900"
                      style={{
                        backgroundColor:
                          option.color ??
                          CRITERION_COLORS[optionIndex % CRITERION_COLORS.length],
                      }}
                    >
                      <HoverTrash
                        title="Delete option?"
                        description={`Are you sure you want to delete "${option.name || "this option"}"? All scores for this option will be lost.`}
                        onConfirm={() => removeOption(option.id)}
                        hoverClass="group-hover/opt:opacity-100"
                      />
                      <div className="flex items-center justify-center gap-1">
                        <IconPicker
                          value={option.icon}
                          onChange={(icon) =>
                            updateOption(option.id, { icon })
                          }
                          color={
                            option.color ??
                            CRITERION_COLORS[optionIndex % CRITERION_COLORS.length]
                          }
                          onColorChange={(color) =>
                            updateOption(option.id, { color })
                          }
                        />
                        <Input
                          value={option.name}
                          onChange={(e) =>
                            updateOption(option.id, { name: e.target.value })
                          }
                          className="h-7 text-sm border-none shadow-none px-1 focus-visible:ring-0 font-semibold text-center"
                          placeholder="Option..."
                        />
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="w-[40px]">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={addOption}
                        >
                          <Plus className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Add option</TooltipContent>
                    </Tooltip>
                  </TableHead>
                </TableRow>
                {/* Criteria/Weight sub-header */}
                <TableRow>
                  <TableHead className="w-[180px] min-w-[180px]">
                    Criteria
                  </TableHead>
                  <TableHead className="w-[90px] text-center">
                    Weight (/10)
                  </TableHead>
                  {wadm.options.map((option) => (
                    <TableHead key={option.id} className="min-w-[100px] text-center text-xs text-muted-foreground">
                      Score
                    </TableHead>
                  ))}
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {wadm.criteria.map((criterion, criterionIndex) => (
                  <TableRow key={criterion.id} className="group/crit">
                    <TableCell
                      style={{
                        backgroundColor:
                          criterion.color ??
                          CRITERION_COLORS[criterionIndex % CRITERION_COLORS.length],
                      }}
                      className="rounded-l relative text-gray-900"
                    >
                      <HoverTrash
                        title="Delete criterion?"
                        description={`Are you sure you want to delete "${criterion.name || "this criterion"}"? All related scores will be lost.`}
                        onConfirm={() => removeCriterion(criterion.id)}
                        hoverClass="group-hover/crit:opacity-100"
                      />
                      <div className="flex items-center gap-1">
                        <IconPicker
                          value={criterion.icon}
                          onChange={(icon) =>
                            updateCriterion(criterion.id, { icon })
                          }
                          color={
                            criterion.color ??
                            CRITERION_COLORS[criterionIndex % CRITERION_COLORS.length]
                          }
                          onColorChange={(color) =>
                            updateCriterion(criterion.id, { color })
                          }
                        />
                        <Input
                          value={criterion.name}
                          onChange={(e) =>
                            updateCriterion(criterion.id, {
                              name: e.target.value,
                            })
                          }
                          className="h-7 text-sm border-none shadow-none px-1 focus-visible:ring-0"
                          placeholder="Criterion..."
                        />
                      </div>
                      {criterion.note ? (
                        <button
                          type="button"
                          className="block text-xs italic text-gray-600 truncate max-w-full text-left hover:text-gray-900 transition-colors mt-0.5"
                          onClick={() =>
                            setNoteDialog({
                              type: "criterion",
                              criterionId: criterion.id,
                              value: criterion.note,
                            })
                          }
                        >
                          {criterion.note}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="block text-xs italic text-gray-500 hover:text-gray-700 transition-colors mt-0.5"
                          onClick={() =>
                            setNoteDialog({
                              type: "criterion",
                              criterionId: criterion.id,
                              value: "",
                            })
                          }
                        >
                          Add note...
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-medium tabular-nums">
                          {criterion.weight}
                        </span>
                        <Slider
                          value={[criterion.weight]}
                          onValueChange={([v]) =>
                            updateCriterion(criterion.id, {
                              weight: v!,
                            })
                          }
                          min={1}
                          max={10}
                          step={1}
                          className="w-16"
                        />
                      </div>
                    </TableCell>
                    {wadm.options.map((option) => {
                      const score = option.scores[criterion.id];
                      return (
                        <TableCell key={option.id} className="text-center">
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            step={0.5}
                            value={score?.score ?? 1}
                            onChange={(e) =>
                              updateScore(
                                option.id,
                                criterion.id,
                                {
                                  score: Math.min(
                                    10,
                                    Math.max(
                                      1,
                                      Math.round(Number(e.target.value) * 2) / 2 || 1
                                    )
                                  ),
                                }
                              )
                            }
                            className="h-7 w-14 text-sm text-center px-1 mx-auto"
                          />
                          {score?.note ? (
                            <button
                              type="button"
                              className="block mx-auto mt-0.5 text-xs italic text-muted-foreground truncate max-w-[80px] text-center hover:text-foreground transition-colors"
                              onClick={() =>
                                setNoteDialog({
                                  type: "score",
                                  criterionId: criterion.id,
                                  optionId: option.id,
                                  value: score.note,
                                })
                              }
                            >
                              {score.note}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="block mx-auto mt-0.5 text-xs italic text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                              onClick={() =>
                                setNoteDialog({
                                  type: "score",
                                  criterionId: criterion.id,
                                  optionId: option.id,
                                  value: "",
                                })
                              }
                            >
                              note
                            </button>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell />
                  </TableRow>
                ))}

                {/* Add criterion row */}
                <TableRow>
                  <TableCell colSpan={2 + wadm.options.length + 1}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={addCriterion}
                          className="text-muted-foreground"
                        >
                          <Plus className="size-4" />
                          Add Criterion
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Add a new criterion row</TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>

                {/* Weighted Total Row */}
                {wadm.criteria.length > 0 && wadm.options.length > 0 && (
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell>Weighted Score</TableCell>
                    <TableCell />
                    {wadm.options.map((option) => {
                      const score = getWeightedScore(option);
                      const isBest = option.id === bestOptionId;
                      return (
                        <TableCell key={option.id} className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span
                              className={`text-lg tabular-nums ${
                                isBest
                                  ? "text-green-600 dark:text-green-400"
                                  : ""
                              }`}
                            >
                              {score.toFixed(1)}
                            </span>
                            {isBest && (
                              <Badge
                                variant="default"
                                className="bg-green-600 dark:bg-green-500 text-white"
                              >
                                Best
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      );
                    })}
                    <TableCell />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Decision Notes - inline markdown below the table */}
      <div className="px-8">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          Decision Notes
        </h3>
        <Textarea
          value={wadm.notes}
          onChange={(e) => update((w) => ({ ...w, notes: e.target.value }))}
          placeholder="Write notes about this decision in markdown..."
          className="min-h-[140px] text-sm font-mono resize-y"
        />
      </div>

      {/* Note Dialog (for criterion & score notes) */}
      <Dialog
        open={noteDialog !== null}
        onOpenChange={(open) => {
          if (!open) setNoteDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {noteDialog?.type === "criterion"
                ? "Criterion Note"
                : "Score Note"}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            value={noteDialog?.value ?? ""}
            onChange={(e) =>
              setNoteDialog((prev) =>
                prev ? { ...prev, value: e.target.value } : prev
              )
            }
            placeholder="Write your note here..."
            className="min-h-[120px]"
          />
          <DialogFooter>
            <Button
              onClick={() => {
                if (!noteDialog) return;
                if (
                  noteDialog.type === "criterion" &&
                  noteDialog.criterionId
                ) {
                  updateCriterion(noteDialog.criterionId, {
                    note: noteDialog.value,
                  });
                } else if (
                  noteDialog.type === "score" &&
                  noteDialog.optionId &&
                  noteDialog.criterionId
                ) {
                  updateScore(noteDialog.optionId, noteDialog.criterionId, {
                    note: noteDialog.value,
                  });
                }
                setNoteDialog(null);
              }}
            >
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
