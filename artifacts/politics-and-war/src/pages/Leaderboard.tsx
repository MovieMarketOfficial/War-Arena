import { useState } from "react";
import { Link } from "wouter";
import { useGetLeaderboard, GetLeaderboardCategory } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, TrendingUp, Shield, Coins, Building2, Globe } from "lucide-react";

export default function Leaderboard() {
  const [category, setCategory] = useState<GetLeaderboardCategory>("score");
  const { data: entries, isLoading } = useGetLeaderboard({ category });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase font-mono">Global Rankings</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">The most powerful nations in the simulation.</p>
        </div>
        <Trophy className="w-8 h-8 text-primary opacity-50" />
      </div>

      <Card className="bg-card border-border rounded-sm">
        <div className="p-4 border-b border-border bg-muted/20">
          <Tabs value={category} onValueChange={(v) => setCategory(v as GetLeaderboardCategory)} className="w-full">
            <TabsList className="bg-background border border-border rounded-sm w-full md:w-auto overflow-x-auto justify-start flex">
              <TabsTrigger value="score" className="font-mono uppercase text-xs flex-1 md:flex-none">
                <TrendingUp className="w-4 h-4 mr-2" /> Net Score
              </TabsTrigger>
              <TabsTrigger value="military" className="font-mono uppercase text-xs flex-1 md:flex-none">
                <Shield className="w-4 h-4 mr-2" /> Military
              </TabsTrigger>
              <TabsTrigger value="economy" className="font-mono uppercase text-xs flex-1 md:flex-none">
                <Coins className="w-4 h-4 mr-2" /> Economy
              </TabsTrigger>
              <TabsTrigger value="cities" className="font-mono uppercase text-xs flex-1 md:flex-none">
                <Building2 className="w-4 h-4 mr-2" /> Territory
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs font-mono uppercase tracking-wider text-muted-foreground bg-background border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium w-16 text-center">Rank</th>
                <th className="px-6 py-4 font-medium">Nation</th>
                <th className="px-6 py-4 font-medium">Alliance</th>
                <th className="px-6 py-4 font-medium text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4 text-center"><Skeleton className="h-5 w-8 mx-auto" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-48" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                    <td className="px-6 py-4 flex justify-end"><Skeleton className="h-5 w-20" /></td>
                  </tr>
                ))
              ) : entries?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-muted-foreground font-mono">
                    <Trophy className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    No rankings available.
                  </td>
                </tr>
              ) : (
                entries?.map((entry) => {
                  let displayValue = entry.score;
                  if (category === 'military' && entry.militaryScore) displayValue = entry.militaryScore;
                  if (category === 'economy' && entry.economyScore) displayValue = entry.economyScore;
                  if (category === 'cities') displayValue = entry.cityCount;

                  return (
                    <tr key={entry.nationId} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4 text-center">
                        <span className={`font-mono font-bold text-lg ${
                          entry.rank === 1 ? 'text-yellow-500' :
                          entry.rank === 2 ? 'text-gray-400' :
                          entry.rank === 3 ? 'text-amber-700' :
                          'text-muted-foreground'
                        }`}>
                          #{entry.rank}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/nations/${entry.nationId}`} className="font-bold hover:text-primary transition-colors flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                          <span className="flex items-center gap-2"><Globe className="w-4 h-4 text-muted-foreground" /> {entry.nationName}</span>
                          <span className="text-xs text-muted-foreground font-mono font-normal">({entry.leaderName})</span>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        {entry.allianceName ? (
                          <Badge variant="outline" className="font-mono text-[10px] uppercase border-primary/50 text-primary">
                            {entry.allianceName}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground font-mono text-xs">---</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-primary text-lg">
                        {category === 'economy' && '$'}
                        {displayValue.toLocaleString()}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}