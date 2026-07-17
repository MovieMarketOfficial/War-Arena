import { useState } from "react";
import { Link } from "wouter";
import { useListWars, useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Swords, Globe, Target, AlertTriangle, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function WarList({ nationId, activeOnly }: { nationId?: number, activeOnly?: boolean }) {
  const { data: warsData, isLoading } = useListWars({ nationId, active: activeOnly });

  if (isLoading) {
    return <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }

  if (!warsData || warsData.length === 0) {
    return (
      <div className="text-center p-12 bg-card border border-border rounded-sm">
        <Swords className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h3 className="text-xl font-bold font-mono uppercase tracking-widest text-muted-foreground">No Active Conflicts</h3>
        <p className="text-muted-foreground mt-2">The world is currently at peace... for now.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {warsData.map((war) => (
        <Link key={war.id} href={`/wars/${war.id}`}>
          <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer rounded-sm group overflow-hidden relative">
            {war.status === 'active' && <div className="absolute top-0 left-0 w-1 h-full bg-destructive" />}
            {war.status === 'peace_offered' && <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />}
            {war.status === 'ended' && <div className="absolute top-0 left-0 w-1 h-full bg-muted" />}
            
            <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
              
              <div className="flex-1 flex flex-col items-center md:items-end">
                <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">Attacker</div>
                <div className="font-bold text-xl font-mono truncate max-w-[200px] text-destructive group-hover:text-destructive/80 transition-colors">{war.attackerName}</div>
                <div className="text-sm mt-1 font-mono">Score: {war.attackerWarScore}</div>
              </div>

              <div className="flex flex-col items-center px-8 shrink-0">
                <Swords className={`w-8 h-8 ${war.status === 'active' ? 'text-destructive animate-pulse' : 'text-muted-foreground'} mb-2`} />
                <Badge variant={war.status === 'active' ? 'destructive' : 'outline'} className="font-mono uppercase text-[10px]">
                  {war.status.replace('_', ' ')}
                </Badge>
                <div className="text-xs text-muted-foreground font-mono mt-2">
                  Started {formatDistanceToNow(new Date(war.startedAt))} ago
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center md:items-start">
                <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">Defender</div>
                <div className="font-bold text-xl font-mono truncate max-w-[200px] text-primary group-hover:text-primary/80 transition-colors">{war.defenderName}</div>
                <div className="text-sm mt-1 font-mono">Score: {war.defenderWarScore}</div>
              </div>

            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default function Wars() {
  const { data: me } = useGetMe();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase font-mono">War Room</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Global conflict monitoring and command center.</p>
        </div>
      </div>

      <Tabs defaultValue="my-wars" className="w-full">
        <TabsList className="bg-card border border-border rounded-sm w-full justify-start overflow-x-auto h-auto p-1">
          <TabsTrigger value="my-wars" className="font-mono uppercase text-xs py-3 px-6">
            <Target className="w-4 h-4 mr-2" /> Active Operations
          </TabsTrigger>
          <TabsTrigger value="global" className="font-mono uppercase text-xs py-3 px-6">
            <Globe className="w-4 h-4 mr-2" /> Global Feed
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="my-wars" className="mt-6">
          {me ? <WarList nationId={me.nation.id} activeOnly={true} /> : <Skeleton className="h-48 w-full" />}
        </TabsContent>
        
        <TabsContent value="global" className="mt-6">
          <WarList activeOnly={true} />
        </TabsContent>
      </Tabs>
    </div>
  );
}