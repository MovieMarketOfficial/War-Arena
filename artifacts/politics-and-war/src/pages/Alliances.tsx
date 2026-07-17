import { useState } from "react";
import { Link } from "wouter";
import { useListAlliances, useCreateAlliance, getListAlliancesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Users, Shield, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";

export default function Alliances() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  
  const { data: alliances, isLoading } = useListAlliances(); // The API might not have pagination for alliances yet, assume it returns array
  const createMut = useCreateAlliance();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [acronym, setAcronym] = useState("");
  const [description, setDescription] = useState("");

  const filteredAlliances = alliances?.filter(a => 
    !debouncedSearch || 
    a.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    a.acronym.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const handleCreate = () => {
    createMut.mutate(
      { data: { name, acronym, description } },
      {
        onSuccess: () => {
          toast({ title: "Alliance Formed", description: `The ${name} alliance is now official.` });
          queryClient.invalidateQueries({ queryKey: getListAlliancesQueryKey() });
          setCreateOpen(false);
          setName("");
          setAcronym("");
          setDescription("");
        },
        onError: (err: any) => {
          toast({ title: "Formation Failed", description: err?.error || "Could not create alliance.", variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase font-mono">Alliances</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Global power blocs and treaties.</p>
        </div>
        
        <div className="w-full md:w-auto flex gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search alliances..." 
              className="pl-9 h-10 font-mono bg-card border-border rounded-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => setCreateOpen(true)} className="font-mono uppercase tracking-widest rounded-sm shrink-0">
            <Plus className="w-4 h-4 mr-2" /> Found Alliance
          </Button>
        </div>
      </div>

      <Card className="bg-card border-border rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs font-mono uppercase tracking-wider text-muted-foreground bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Alliance Name</th>
                <th className="px-6 py-4 font-medium">Acronym</th>
                <th className="px-6 py-4 font-medium text-right">Members</th>
                <th className="px-6 py-4 font-medium text-right">Total Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-48" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-16" /></td>
                    <td className="px-6 py-4 flex justify-end"><Skeleton className="h-5 w-12" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-24 ml-auto" /></td>
                  </tr>
                ))
              ) : !filteredAlliances || filteredAlliances.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground font-mono">
                    <Shield className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    No alliances found.
                  </td>
                </tr>
              ) : (
                filteredAlliances.map((alliance) => (
                  <tr key={alliance.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4">
                      <Link href={`/alliances/${alliance.id}`} className="font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                        <Shield className="w-4 h-4 text-muted-foreground" />
                        {alliance.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-muted-foreground">{alliance.acronym}</td>
                    <td className="px-6 py-4 text-right font-mono flex items-center justify-end gap-1 text-muted-foreground">
                      {alliance.memberCount} <Users className="w-3 h-3" />
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-primary">
                      {alliance.score.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center text-primary font-mono uppercase tracking-widest text-lg">
              <Shield className="w-5 h-5 mr-2" /> Forge Alliance
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Establish a new global power bloc.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Name</Label>
              <Input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Global Defense Initiative"
                className="bg-background border-border font-mono rounded-sm"
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Acronym</Label>
              <Input 
                value={acronym}
                onChange={(e) => setAcronym(e.target.value)}
                placeholder="GDI"
                className="bg-background border-border font-mono rounded-sm"
                maxLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Charter / Description</Label>
              <Textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="State your alliance's purpose..."
                className="bg-background border-border font-mono rounded-sm resize-none h-24"
                maxLength={1000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="font-mono uppercase tracking-widest rounded-sm border-border">
              Abort
            </Button>
            <Button onClick={handleCreate} disabled={createMut.isPending || !name || !acronym} className="font-mono uppercase tracking-widest rounded-sm">
              {createMut.isPending ? "Forming..." : "Sign Charter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}