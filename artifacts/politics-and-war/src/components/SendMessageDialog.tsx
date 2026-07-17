import { useState } from "react";
import { useSendMessage, getListMessagesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare } from "lucide-react";

interface SendMessageDialogProps {
  targetNationId: number;
  targetNationName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  replyToSubject?: string;
}

export function SendMessageDialog({ targetNationId, targetNationName, open, onOpenChange, replyToSubject }: SendMessageDialogProps) {
  const [subject, setSubject] = useState(replyToSubject ? (replyToSubject.startsWith("Re:") ? replyToSubject : `Re: ${replyToSubject}`) : "");
  const [body, setBody] = useState("");
  const sendMessageMut = useSendMessage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSend = () => {
    if (!subject || !body) {
      toast({ title: "Validation Error", description: "Subject and body are required.", variant: "destructive" });
      return;
    }

    sendMessageMut.mutate(
      { data: { toNationId: targetNationId, subject, body } },
      {
        onSuccess: () => {
          toast({ title: "Message Sent", description: `Transmission delivered to ${targetNationName}.` });
          queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey() });
          setSubject("");
          setBody("");
          onOpenChange(false);
        },
        onError: (err: any) => {
          toast({ title: "Transmission Failed", description: err?.error || "Could not send message.", variant: "destructive" });
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center text-primary font-mono uppercase tracking-widest text-lg">
            <MessageSquare className="w-5 h-5 mr-2" /> Secure Transmission
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            Composing encrypted message to <span className="font-bold text-foreground">{targetNationName}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Subject</Label>
            <Input 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter subject..."
              className="bg-background border-border font-mono rounded-sm"
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Body</Label>
            <Textarea 
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message here..." 
              className="bg-background border-border font-mono resize-none h-40 focus-visible:ring-primary"
              maxLength={5000}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="font-mono uppercase tracking-widest rounded-sm border-border">
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sendMessageMut.isPending} className="font-mono uppercase tracking-widest rounded-sm">
            {sendMessageMut.isPending ? "Sending..." : "Transmit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}