import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type ToothStatus = "healthy" | "cavity" | "filling" | "missing" | "crown" | "bridge";

interface ToothData {
  id: number;
  label: string;
  status: ToothStatus;
  notes?: string;
}

const INITIAL_TEETH: ToothData[] = Array.from({ length: 32 }, (_, i) => ({
  id: i + 1,
  label: (i + 1).toString(),
  status: "healthy",
}));

export function ToothChart() {
  const [teeth, setTeeth] = useState<ToothData[]>(INITIAL_TEETH);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);

  const handleStatusChange = (status: ToothStatus) => {
    if (selectedTooth === null) return;
    setTeeth(prev => prev.map(t => t.id === selectedTooth ? { ...t, status } : t));
  };

  const getToothColor = (status: ToothStatus) => {
    switch (status) {
      case "cavity": return "fill-red-500 stroke-red-700";
      case "filling": return "fill-blue-400 stroke-blue-600";
      case "missing": return "fill-slate-200 stroke-slate-300 opacity-30";
      case "crown": return "fill-yellow-400 stroke-yellow-600";
      case "bridge": return "fill-orange-400 stroke-orange-600";
      default: return "fill-white stroke-slate-400 hover:fill-slate-50";
    }
  };

  const renderTooth = (id: number, x: number, y: number, isUpper: boolean) => {
    const tooth = teeth.find(t => t.id === id);
    const isSelected = selectedTooth === id;

    return (
      <Tooltip key={id}>
        <TooltipTrigger asChild>
          <g 
            className="cursor-pointer transition-all duration-200"
            onClick={() => setSelectedTooth(id)}
          >
            {/* Simplified Tooth Shape */}
            <path
              d={isUpper 
                ? `M ${x-10} ${y+15} Q ${x} ${y-15} ${x+10} ${y+15} Z` 
                : `M ${x-10} ${y-15} Q ${x} ${y+15} ${x+10} ${y-15} Z`
              }
              className={cn(
                "stroke-2 transition-colors",
                getToothColor(tooth?.status || "healthy"),
                isSelected && "stroke-primary stroke-[3px]"
              )}
            />
            <text 
              x={x} 
              y={isUpper ? y + 25 : y - 20} 
              textAnchor="middle" 
              className="text-[10px] font-medium fill-muted-foreground select-none"
            >
              {id}
            </text>
          </g>
        </TooltipTrigger>
        <TooltipContent>
          <p>Tooth {id}: {tooth?.status.toUpperCase()}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <Card className="w-full bg-slate-50/50">
      <CardHeader>
        <CardTitle className="text-lg font-serif">Interactive Tooth Chart</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-8 items-center justify-center">
          <TooltipProvider>
            <svg viewBox="0 0 600 200" className="w-full max-w-2xl h-auto">
              {/* Upper Arch */}
              {Array.from({ length: 16 }).map((_, i) => (
                renderTooth(i + 1, 40 + i * 35, 60, true)
              ))}
              
              {/* Lower Arch */}
              {Array.from({ length: 16 }).map((_, i) => (
                renderTooth(32 - i, 40 + i * 35, 140, false)
              ))}
            </svg>
          </TooltipProvider>

          <div className="flex flex-col gap-4 w-full lg:w-48">
            <h3 className="text-sm font-semibold text-muted-foreground">Procedure Selection</h3>
            {selectedTooth ? (
              <div className="space-y-2">
                <p className="text-xs font-medium">Editing Tooth #{selectedTooth}</p>
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                  {(["healthy", "cavity", "filling", "missing", "crown", "bridge"] as ToothStatus[]).map((status) => (
                    <Button
                      key={status}
                      variant="outline"
                      size="sm"
                      className="justify-start text-xs h-8"
                      onClick={() => handleStatusChange(status)}
                    >
                      <div className={cn("w-2 h-2 rounded-full mr-2", 
                        status === "healthy" ? "bg-slate-300" :
                        status === "cavity" ? "bg-red-500" :
                        status === "filling" ? "bg-blue-400" :
                        status === "missing" ? "bg-slate-100 border" :
                        status === "crown" ? "bg-yellow-400" : "bg-orange-400"
                      )} />
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Select a tooth to record a procedure.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
