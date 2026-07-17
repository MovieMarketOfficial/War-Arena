import { useState } from "react";
import { useLocation } from "wouter";
import { useDeclareWar, getListWarsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Target } from "lucide-react";

interface DeclareWarDialogProps {
  targetNationId: number;
  targetNationName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeclareWarDialog({ targetNationId, targetNationName, open, onOpenChange }: DeclareWarDialogProps) {
  const [reason, setReason] = useState("");
  const declareWarMut = useDeclareWar();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const handleDeclare = () => {
    declareWarMut.mutate(
      { data: { targetNationId, reason: reason || "Unprovoked aggression." } },
      {
        onSuccess: (war) => {
          toast({
            title: "War Declared",
            description: `Hostilities commenced against ${targetNationName}.`,
            variant: "destructive",
          });
          queryClient.invalidateQueries({ queryKey: getListWarsQueryKey() });
          onOpenChange(false);
          setLocation(`/wars/${war.id}`);
        },
        onError: (err: any) => {
          toast({
            title: "Declaration Failed",
            description: err?.error || "Could not declare war.",
            variant: "destructive",
          });
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card border-destructive">
        <DialogHeader>
          <DialogTitle className="flex items-center text-destructive font-mono uppercase tracking-widest text-xl">
            <Target className="w-5 h-5 mr-2" /> Declare War
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            Initiate combat operations against <span className="font-bold text-foreground">{targetNationName}</span>. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Casus Belli (Reason)</Label>
            <Textarea 
              placeholder="State your reasons for this conflict..." 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-background border-border font-mono resize-none h-24 focus-visible:ring-destructive"
              maxLength={200}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="font-mono uppercase tracking-widest rounded-sm border-border">
            Abort
          </Button>
          <Button variant="destructive" onClick={handleDeclare} disabled={declareWarMut.isPending} className="font-mono uppercase tracking-widest rounded-sm">
            {declareWarMut.isPending ? "Initiating..." : "Launch Strike"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}