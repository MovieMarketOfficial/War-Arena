import { useState } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetAlliance, 
  useApplyToAlliance, 
  useLeaveAlliance, 
  useRespondToApplication, 
  useGetMe,
  getGetAllianceQueryKey,
  getGetMeQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, LogOut, Check, X, FileSignature } from "lucide-react";
import { format } from "date-fns";
import { Label } from "recharts";

export default function AllianceDetail() {
  const { id } = useParams();
  const allianceId = parseInt(id || "0", 10);
  
  const { data: me } = useGetMe();
  const { data: alliance, isLoading } = useGetAlliance(allianceId, { query: { enabled: !!allianceId } });
  
  const applyMut = useApplyToAlliance();
  const leaveMut = useLeaveAlliance();
  const respondMut = useRespondToApplication();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [applyOpen, setApplyOpen] = useState(false);
  const [applyMessage, setApplyMessage] = useState("");

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-64 w-full" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!alliance) return <div className="text-center py-12 text-muted-foreground">Alliance not found.</div>;

  const isMember = me?.nation.allianceId === alliance.id;
  const myMemberInfo = isMember ? alliance.members.find(m => m.nationId === me?.nation.id) : null;
  const isOfficerOrLeader = myMemberInfo?.role === 'leader' || myMemberInfo?.role === 'officer';
  const isPendingApplicant = alliance.pendingApplications?.some(a => a.nationId === me?.nation.id) || false;

  const handleApply = () => {
    applyMut.mutate(
      { data: { message: applyMessage } },
      {
        onSuccess: () => {
          toast({ title: "Application Submitted", description: `Your request to join ${alliance.name} has been sent.` });
          queryClient.invalidateQueries({ queryKey: getGetAllianceQueryKey(allianceId) });
          setApplyOpen(false);
          setApplyMessage("");
        },
        onError: (err: any) => {
          toast({ title: "Application Failed", description: err?.error || "Could not apply.", variant: "destructive" });
        }
      }
    );
  };

  const handleLeave = () => {
    if (!window.confirm("Are you sure you want to leave this alliance?")) return;
    
    leaveMut.mutate(
      undefined,
      {
        onSuccess: () => {
          toast({ title: "Alliance Left", description: "You are no longer a member." });
          queryClient.invalidateQueries({ queryKey: getGetAllianceQueryKey(allianceId) });
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        },
        onError: (err: any) => {
          toast({ title: "Departure Failed", description: err?.error || "Could not leave alliance.", variant: "destructive" });
        }
      }
    );
  };

  const handleRespond = (nationId: number, accepted: boolean) => {
    respondMut.mutate(
      { nationId, data: { accepted } },
      {
        onSuccess: () => {
          toast({ title: "Response Recorded", description: `Application ${accepted ? 'accepted' : 'rejected'}.` });
          queryClient.invalidateQueries({ queryKey: getGetAllianceQueryKey(allianceId) });
        },
        onError: (err: any) => {
          toast({ title: "Response Failed", description: err?.error || "Action failed.", variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/alliances" className="text-muted-foreground hover:text-primary font-mono text-sm uppercase">← Alliances Directory</Link>
      </div>

      <div className="bg-card border border-border p-8 rounded-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row gap-8 justify-between relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-10 h-10 text-primary" />
              <h1 className="text-4xl font-bold tracking-tight">{alliance.name}</h1>
              <Badge variant="outline" className="text-lg font-mono px-3 py-1 border-primary/50 text-primary bg-primary/10">
                {alliance.acronym}
              </Badge>
            </div>
            <div className="text-muted-foreground mt-4 max-w-2xl whitespace-pre-wrap font-mono text-sm leading-relaxed border-l-2 border-border pl-4">
              {alliance.description || "No charter provided."}
            </div>
          </div>
          
          <div className="shrink-0 flex flex-col gap-4 min-w-[200px]">
            <div className="bg-background border border-border p-4 rounded-sm">
              <div className="text-xs font-mono text-muted-foreground uppercase mb-1">Total Score</div>
              <div className="text-2xl font-bold text-primary font-mono">{alliance.score.toLocaleString()}</div>
            </div>
            
            {isMember ? (
              <Button variant="destructive" className="w-full font-mono uppercase" onClick={handleLeave} disabled={leaveMut.isPending}>
                <LogOut className="w-4 h-4 mr-2" /> Leave Alliance
              </Button>
            ) : isPendingApplicant ? (
              <Button disabled variant="outline" className="w-full font-mono uppercase bg-muted/50 text-muted-foreground">
                Application Pending
              </Button>
            ) : me?.nation.allianceId ? (
               <Button disabled variant="outline" className="w-full font-mono uppercase bg-muted/50 text-muted-foreground" title="You are already in an alliance.">
                 Already in Alliance
               </Button>
            ) : (
              <Button className="w-full font-mono uppercase" onClick={() => setApplyOpen(true)}>
                <FileSignature className="w-4 h-4 mr-2" /> Apply to Join
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-card border-border rounded-sm lg:col-span-2">
          <CardHeader className="border-b border-border bg-muted/20">
            <CardTitle className="font-mono text-sm uppercase tracking-widest flex items-center">
              <Users className="w-4 h-4 mr-2" /> Member Roster ({alliance.members.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs font-mono uppercase tracking-wider text-muted-foreground bg-background border-b border-border">
                  <tr>
                    <th className="px-6 py-3 font-medium">Nation</th>
                    <th className="px-6 py-3 font-medium">Role</th>
                    <th className="px-6 py-3 font-medium text-right">Score</th>
                    <th className="px-6 py-3 font-medium text-right">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {alliance.members.map((member) => (
                    <tr key={member.nationId} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3">
                        <Link href={`/nations/${member.nationId}`} className="font-bold hover:text-primary transition-colors">
                          {member.nationName}
                        </Link>
                        <div className="text-xs text-muted-foreground font-mono">{member.leaderName}</div>
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={member.role === 'leader' ? 'default' : member.role === 'officer' ? 'secondary' : 'outline'} className="font-mono text-[10px] uppercase">
                          {member.role}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-right font-mono font-bold text-primary">{member.score?.toLocaleString() || '---'}</td>
                      <td className="px-6 py-3 text-right font-mono text-muted-foreground text-xs">{format(new Date(member.joinedAt), 'MMM d, yyyy')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {isOfficerOrLeader && alliance.pendingApplications && alliance.pendingApplications.length > 0 && (
          <Card className="bg-card border-border rounded-sm lg:col-span-1 border-primary/50">
            <CardHeader className="border-b border-border bg-primary/5">
              <CardTitle className="font-mono text-sm uppercase tracking-widest text-primary flex items-center">
                <FileSignature className="w-4 h-4 mr-2" /> Pending Applications
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {alliance.pendingApplications.map((app) => (
                  <div key={app.nationId} className="p-4 bg-background">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <Link href={`/nations/${app.nationId}`} className="font-bold hover:text-primary">
                          {app.nationName}
                        </Link>
                        <div className="text-xs font-mono text-muted-foreground">Score: {app.score?.toLocaleString()}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="icon" variant="outline" className="w-8 h-8 rounded-sm text-green-500 hover:text-green-500 hover:bg-green-500/10 border-green-500/50" onClick={() => handleRespond(app.nationId, true)}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="outline" className="w-8 h-8 rounded-sm text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/50" onClick={() => handleRespond(app.nationId, false)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center text-primary font-mono uppercase tracking-widest text-lg">
              <FileSignature className="w-5 h-5 mr-2" /> Application to Join
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Submit your request to join {alliance.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Message to Leadership (Optional)</Label>
              <Textarea 
                value={applyMessage}
                onChange={(e) => setApplyMessage(e.target.value)}
                placeholder="Why do you want to join?"
                className="bg-background border-border font-mono rounded-sm resize-none h-24"
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyOpen(false)} className="font-mono uppercase tracking-widest rounded-sm border-border">
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={applyMut.isPending} className="font-mono uppercase tracking-widest rounded-sm">
              {applyMut.isPending ? "Submitting..." : "Send Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}