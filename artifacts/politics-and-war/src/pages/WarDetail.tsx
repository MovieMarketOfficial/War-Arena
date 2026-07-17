import { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetWar, usePerformAttack, useOfferPeace, useGetMe, getGetWarQueryKey, AttackInputType } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Swords, Crosshair, Plane, Ship, Rocket, Bomb, AlertTriangle, Shield, Flag } from "lucide-react";
import { format } from "date-fns";

export default function WarDetail() {
  const { id } = useParams();
  const warId = parseInt(id || "0", 10);
  
  const { data: me } = useGetMe();
  const { data: warDetail, isLoading } = useGetWar(warId, { query: { enabled: !!warId } });
  
  const attackMut = usePerformAttack();
  const peaceMut = useOfferPeace();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-64 w-full" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!warDetail || !me) return <div className="text-center py-12 text-muted-foreground">Classified Intel Not Found.</div>;

  const { war, attacks } = warDetail;
  const isAttacker = me.nation.id === war.attackerId;
  const isDefender = me.nation.id === war.defenderId;
  const isParticipant = isAttacker || isDefender;
  
  const myWarScore = isAttacker ? war.attackerWarScore : war.defenderWarScore;
  const enemyWarScore = isAttacker ? war.defenderWarScore : war.attackerWarScore;
  
  const opponentName = isAttacker ? war.defenderName : war.attackerName;
  const opponentId = isAttacker ? war.defenderId : war.attackerId;

  const handleAttack = (type: AttackInputType) => {
    attackMut.mutate(
      { warId, data: { type } },
      {
        onSuccess: (res) => {
          let desc = `Outcome: ${res.attack.outcome.replace('_', ' ')}. Infra destroyed: ${res.infraDestroyed}.`;
          if (res.looted?.money) desc += ` Looted $${res.looted.money.toLocaleString()}.`;
          
          toast({ title: "Operation Executed", description: desc });
          queryClient.invalidateQueries({ queryKey: getGetWarQueryKey(warId) });
        },
        onError: (err: any) => {
          toast({ title: "Operation Failed", description: err?.error || "Attack aborted.", variant: "destructive" });
        }
      }
    );
  };

  const handlePeace = (action: 'offer' | 'accept' | 'reject') => {
    peaceMut.mutate(
      { warId, data: { action } },
      {
        onSuccess: () => {
          toast({ title: "Diplomatic Action", description: `Peace treaty ${action}ed.` });
          queryClient.invalidateQueries({ queryKey: getGetWarQueryKey(warId) });
        },
        onError: (err: any) => {
          toast({ title: "Diplomatic Failure", description: err?.error || "Action failed.", variant: "destructive" });
        }
      }
    );
  };

  // Calculate percentages for war score bar (min 5% for visibility)
  const totalScore = war.attackerWarScore + war.defenderWarScore || 1;
  const attackerPct = Math.max(5, Math.min(95, (war.attackerWarScore / totalScore) * 100));
  const defenderPct = 100 - attackerPct;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/wars" className="text-muted-foreground hover:text-primary font-mono text-sm uppercase">← Back to War Room</Link>
      </div>

      {/* Theater Status Banner */}
      <Card className="bg-card border-border rounded-sm relative overflow-hidden">
        {war.status === 'active' && <div className="absolute top-0 left-0 w-full h-1 bg-destructive animate-pulse" />}
        {war.status === 'peace_offered' && <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />}
        {war.status === 'ended' && <div className="absolute top-0 left-0 w-full h-1 bg-muted" />}

        <CardContent className="p-8">
          <div className="flex flex-col items-center mb-8 text-center space-y-2">
            <Badge variant={war.status === 'active' ? 'destructive' : 'outline'} className="font-mono uppercase text-xs mb-2">
              {war.status.replace('_', ' ')}
            </Badge>
            <div className="text-sm font-mono text-muted-foreground uppercase tracking-widest">Operation Objective</div>
            <div className="text-xl font-bold font-mono italic">"{war.reason}"</div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-8">
            <div className="flex-1 w-full text-center md:text-left">
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Aggressor</div>
              <Link href={`/nations/${war.attackerId}`} className="text-3xl font-bold font-mono text-destructive hover:underline">{war.attackerName}</Link>
              <div className="text-2xl font-mono mt-2">{war.attackerWarScore} pts</div>
            </div>

            <Swords className="w-16 h-16 text-muted-foreground/30 shrink-0 hidden md:block" />

            <div className="flex-1 w-full text-center md:text-right">
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Defender</div>
              <Link href={`/nations/${war.defenderId}`} className="text-3xl font-bold font-mono text-primary hover:underline">{war.defenderName}</Link>
              <div className="text-2xl font-mono mt-2">{war.defenderWarScore} pts</div>
            </div>
          </div>

          {/* War Score Bar */}
          <div className="h-4 w-full bg-background rounded-full overflow-hidden flex shadow-inner">
            <div className="h-full bg-destructive transition-all duration-1000" style={{ width: `${attackerPct}%` }} />
            <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${defenderPct}%` }} />
          </div>
          
          {/* Peace controls */}
          {isParticipant && war.status !== 'ended' && (
            <div className="mt-8 flex justify-center p-4 bg-muted/10 border border-border rounded-sm">
              {war.status === 'active' && (
                <Button variant="outline" onClick={() => handlePeace('offer')} disabled={peaceMut.isPending} className="font-mono uppercase">
                  <Flag className="w-4 h-4 mr-2" /> Offer Peace Treaty
                </Button>
              )}
              {war.status === 'peace_offered' && (
                war.peaceOfferedBy === me.nation.id ? (
                  <span className="text-amber-500 font-mono text-sm uppercase">Awaiting enemy response to treaty...</span>
                ) : (
                  <div className="flex gap-4">
                    <Button variant="outline" onClick={() => handlePeace('accept')} disabled={peaceMut.isPending} className="font-mono uppercase text-green-500 hover:text-green-500 hover:bg-green-500/10 border-green-500/50">
                      Accept Treaty
                    </Button>
                    <Button variant="outline" onClick={() => handlePeace('reject')} disabled={peaceMut.isPending} className="font-mono uppercase text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/50">
                      Reject Treaty
                    </Button>
                  </div>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Command Controls */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-card border-border rounded-sm">
            <CardHeader className="border-b border-border bg-muted/20">
              <CardTitle className="font-mono text-sm uppercase tracking-widest">Tactical Command</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {!isParticipant ? (
                <div className="text-center p-6 text-muted-foreground font-mono text-sm">
                  Observer status only.
                </div>
              ) : war.status === 'ended' ? (
                <div className="text-center p-6 text-muted-foreground font-mono text-sm">
                  Hostilities have ceased.
                </div>
              ) : (
                <>
                  <Button 
                    className="w-full justify-start h-12 font-mono uppercase tracking-widest bg-card border border-border hover:bg-muted hover:border-primary text-foreground"
                    onClick={() => handleAttack(AttackInputType.ground)}
                    disabled={attackMut.isPending}
                  >
                    <Crosshair className="w-5 h-5 mr-3 text-primary" /> Ground Assault
                  </Button>
                  <Button 
                    className="w-full justify-start h-12 font-mono uppercase tracking-widest bg-card border border-border hover:bg-muted hover:border-primary text-foreground"
                    onClick={() => handleAttack(AttackInputType.airstrike)}
                    disabled={attackMut.isPending}
                  >
                    <Plane className="w-5 h-5 mr-3 text-primary" /> Airstrike
                  </Button>
                  <Button 
                    className="w-full justify-start h-12 font-mono uppercase tracking-widest bg-card border border-border hover:bg-muted hover:border-primary text-foreground"
                    onClick={() => handleAttack(AttackInputType.naval)}
                    disabled={attackMut.isPending}
                  >
                    <Ship className="w-5 h-5 mr-3 text-primary" /> Naval Bombardment
                  </Button>
                  <Button 
                    className="w-full justify-start h-12 font-mono uppercase tracking-widest bg-card border border-border hover:bg-destructive hover:text-destructive-foreground hover:border-destructive text-foreground transition-colors"
                    onClick={() => handleAttack(AttackInputType.missile)}
                    disabled={attackMut.isPending}
                  >
                    <Rocket className="w-5 h-5 mr-3" /> Launch Missile
                  </Button>
                  <Button 
                    variant="destructive"
                    className="w-full justify-start h-12 font-mono uppercase tracking-widest"
                    onClick={() => handleAttack(AttackInputType.nuke)}
                    disabled={attackMut.isPending}
                  >
                    <Bomb className="w-5 h-5 mr-3" /> Nuclear Strike
                  </Button>
                  <div className="pt-2 text-center text-xs font-mono text-muted-foreground">
                    Attacks consume Action Points (AP).
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Log */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card border-border rounded-sm overflow-hidden flex flex-col h-[600px]">
            <CardHeader className="border-b border-border bg-muted/20 shrink-0">
              <CardTitle className="font-mono text-sm uppercase tracking-widest flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2" /> Combat Log
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto bg-background/50">
              {attacks.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground font-mono">No engagements recorded yet.</div>
              ) : (
                <div className="divide-y divide-border">
                  {attacks.map((attack) => {
                    const attackerName = attack.attackerNationId === war.attackerId ? war.attackerName : war.defenderName;
                    const defenderName = attack.attackerNationId === war.attackerId ? war.defenderName : war.attackerName;
                    const isMyAttack = attack.attackerNationId === me?.nation.id;
                    const isAgainstMe = !isMyAttack && isParticipant;
                    
                    return (
                      <div key={attack.id} className={`p-4 ${isMyAttack ? 'bg-primary/5' : isAgainstMe ? 'bg-destructive/5' : ''}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono">{attackerName}</span>
                            <span className="text-muted-foreground font-mono text-xs uppercase">executed</span>
                            <Badge variant="outline" className="font-mono text-[10px] uppercase border-primary/30">{attack.type}</Badge>
                            <span className="text-muted-foreground font-mono text-xs uppercase">vs</span>
                            <span className="font-bold font-mono">{defenderName}</span>
                          </div>
                          <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                            {format(new Date(attack.createdAt), 'MM/dd HH:mm')}
                          </span>
                        </div>
                        
                        <div className="pl-4 border-l-2 border-border mt-2 space-y-1">
                          <div className="text-sm">
                            <span className="font-mono text-muted-foreground uppercase tracking-widest text-xs mr-2">Result:</span>
                            <span className={`font-bold uppercase tracking-wider text-sm ${
                              attack.outcome === 'immense_triumph' ? 'text-green-500' :
                              attack.outcome === 'utter_failure' ? 'text-destructive' : 'text-amber-500'
                            }`}>
                              {attack.outcome.replace('_', ' ')}
                            </span>
                          </div>
                          
                          <div className="text-sm font-mono text-muted-foreground">
                            Casualties: <span className="text-destructive">{attack.attackerCasualties}</span> (Atk) / <span className="text-primary">{attack.defenderCasualties}</span> (Def)
                          </div>
                          
                          {(attack.infraDestroyed > 0 || attack.moneyLooted) && (
                            <div className="text-sm font-mono mt-2 pt-2 border-t border-border/50 inline-block">
                              {attack.infraDestroyed > 0 && <div>Destroyed <span className="text-amber-500">{attack.infraDestroyed} infra</span>.</div>}
                              {attack.moneyLooted && <div>Looted <span className="text-green-500">${attack.moneyLooted.toLocaleString()}</span>.</div>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}