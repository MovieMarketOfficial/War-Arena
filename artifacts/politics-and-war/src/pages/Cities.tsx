import { useState } from "react";
import { useGetMyCities, useBuildCity, useImproveCity, getGetMyCitiesQueryKey, CityImprovementInputType } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, MapPin, Factory, Store, ArrowUpCircle } from "lucide-react";

export default function Cities() {
  const { data: cities, isLoading } = useGetMyCities();
  const buildCityMut = useBuildCity();
  const improveCityMut = useImproveCity();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [buildDialogOpen, setBuildDialogOpen] = useState(false);
  const [newCityName, setNewCityName] = useState("");

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-48 w-full" /><Skeleton className="h-96 w-full" /></div>;
  }

  const handleBuildCity = () => {
    if (!newCityName) return;
    buildCityMut.mutate(
      { data: { name: newCityName } },
      {
        onSuccess: () => {
          toast({ title: "City Established", description: `Successfully founded ${newCityName}.` });
          queryClient.invalidateQueries({ queryKey: getGetMyCitiesQueryKey() });
          setBuildDialogOpen(false);
          setNewCityName("");
        },
        onError: (err: any) => {
          toast({ title: "Construction Failed", description: err?.error || "Could not build city.", variant: "destructive" });
        }
      }
    );
  };

  const handleImprove = (cityId: number, type: CityImprovementInputType) => {
    improveCityMut.mutate(
      { cityId, data: { type, amount: 100 } },
      {
        onSuccess: () => {
          toast({ title: "Infrastructure Upgraded", description: `Added 100 ${type} to city.` });
          queryClient.invalidateQueries({ queryKey: getGetMyCitiesQueryKey() });
        },
        onError: (err: any) => {
          toast({ title: "Upgrade Failed", description: err?.error || "Not enough resources.", variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase font-mono">Territories</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Manage infrastructure and economy of your cities.</p>
        </div>
        <Button onClick={() => setBuildDialogOpen(true)} className="font-mono uppercase tracking-widest rounded-sm">
          <Plus className="w-4 h-4 mr-2" /> Found New City
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {cities?.map((city) => (
          <Card key={city.id} className="bg-card border-border rounded-sm overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/20 pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center text-xl font-bold tracking-tight">
                  <MapPin className="w-5 h-5 text-primary mr-2" /> {city.name}
                </CardTitle>
                <div className="text-right">
                  <div className="text-xs font-mono text-muted-foreground uppercase">Income</div>
                  <div className="text-lg font-bold text-green-500 font-mono">+${city.income?.toLocaleString() || 0}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border">
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-mono uppercase text-muted-foreground flex items-center"><Building2 className="w-4 h-4 mr-2"/> Infra</span>
                    <span className="font-bold font-mono">{city.infrastructure.toLocaleString()}</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full font-mono uppercase text-xs" onClick={() => handleImprove(city.id, "infrastructure")} disabled={improveCityMut.isPending}>
                    <ArrowUpCircle className="w-3 h-3 mr-1" /> Add 100
                  </Button>
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-mono uppercase text-muted-foreground flex items-center"><MapPin className="w-4 h-4 mr-2"/> Land</span>
                    <span className="font-bold font-mono">{city.land.toLocaleString()}</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full font-mono uppercase text-xs" onClick={() => handleImprove(city.id, "land")} disabled={improveCityMut.isPending}>
                    <ArrowUpCircle className="w-3 h-3 mr-1" /> Add 100
                  </Button>
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-mono uppercase text-muted-foreground flex items-center"><Store className="w-4 h-4 mr-2"/> Commerce</span>
                    <span className="font-bold font-mono">{city.commerce.toLocaleString()}</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full font-mono uppercase text-xs" onClick={() => handleImprove(city.id, "commerce")} disabled={improveCityMut.isPending}>
                    <ArrowUpCircle className="w-3 h-3 mr-1" /> Add 100
                  </Button>
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-mono uppercase text-muted-foreground flex items-center"><Factory className="w-4 h-4 mr-2"/> Industry</span>
                    <span className="font-bold font-mono">{city.industry.toLocaleString()}</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full font-mono uppercase text-xs" onClick={() => handleImprove(city.id, "industry")} disabled={improveCityMut.isPending}>
                    <ArrowUpCircle className="w-3 h-3 mr-1" /> Add 100
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {cities?.length === 0 && (
          <div className="text-center p-12 bg-card border border-border rounded-sm">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold font-mono uppercase tracking-widest text-muted-foreground">No Cities Established</h3>
            <p className="text-muted-foreground mt-2">Found your first city to begin resource production.</p>
          </div>
        )}
      </div>

      <Dialog open={buildDialogOpen} onOpenChange={setBuildDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center text-primary font-mono uppercase tracking-widest text-lg">
              <Plus className="w-5 h-5 mr-2" /> Foundation Directive
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Establish a new city. Cost increases with each existing city.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">City Name</Label>
              <Input 
                value={newCityName}
                onChange={(e) => setNewCityName(e.target.value)}
                placeholder="New Alexandria"
                className="bg-background border-border font-mono rounded-sm focus-visible:ring-primary"
                maxLength={50}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuildDialogOpen(false)} className="font-mono uppercase tracking-widest rounded-sm border-border">
              Cancel
            </Button>
            <Button onClick={handleBuildCity} disabled={buildCityMut.isPending || !newCityName} className="font-mono uppercase tracking-widest rounded-sm">
              {buildCityMut.isPending ? "Constructing..." : "Found City"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}