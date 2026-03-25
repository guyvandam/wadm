import { useEffect, useState } from "react";
import { Plus, Trash2, ChevronRight, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { fetchWadms, createWadm, deleteWadm } from "../api-switch";
import type { WadmSummary } from "../types";

interface WadmListProps {
  onNavigate: (id: string) => void;
}

export function WadmList({ onNavigate }: WadmListProps) {
  const [wadms, setWadms] = useState<WadmSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await fetchWadms();
    setWadms(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    const c1 = crypto.randomUUID();
    const c2 = crypto.randomUUID();
    const o1 = crypto.randomUUID();
    const o2 = crypto.randomUUID();
    const wadm = await createWadm({
      name: "Untitled Decision",
      notes: "",
      criteria: [
        { id: c1, name: "", weight: 5, note: "" },
        { id: c2, name: "", weight: 5, note: "" },
      ],
      options: [
        { id: o1, name: "", scores: { [c1]: { score: 0, note: "" }, [c2]: { score: 0, note: "" } } },
        { id: o2, name: "", scores: { [c1]: { score: 0, note: "" }, [c2]: { score: 0, note: "" } } },
      ],
    });
    onNavigate(wadm.id);
  };

  const handleDelete = async (id: string) => {
    await deleteWadm(id);
    load();
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Scale className="size-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">WADM</h1>
            <p className="text-sm text-muted-foreground">
              Weighted Average Decision Matrix
            </p>
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={handleCreate}>
              <Plus className="size-4" />
              New Decision
            </Button>
          </TooltipTrigger>
          <TooltipContent>Create a new decision matrix</TooltipContent>
        </Tooltip>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : wadms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Scale className="size-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">
              No decisions yet. Create your first one!
            </p>
            <Button onClick={handleCreate} variant="outline">
              <Plus className="size-4" />
              Create Decision
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {wadms.map((wadm) => (
            <Card
              key={wadm.id}
              className="cursor-pointer transition-colors hover:bg-accent/50"
              onClick={() => onNavigate(wadm.id)}
            >
              <CardHeader className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">
                        {wadm.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {new Date(wadm.date).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary">
                      {wadm.criteriaCount} criteria
                    </Badge>
                    <Badge variant="secondary">
                      {wadm.optionCount} options
                    </Badge>
                    <AlertDialog>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </AlertDialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent>Delete decision</TooltipContent>
                      </Tooltip>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{wadm.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete
                            this decision matrix.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(wadm.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
