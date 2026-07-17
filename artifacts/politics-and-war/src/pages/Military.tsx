import { useState } from "react";
import { useGetMyMilitary, useBuyMilitary, useSellMilitary, getGetMyMilitaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Shield, Crosshair, Plane, Ship, Rocket, Bomb, ShoppingCart, DollarSign } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const UNIT_COSTS = {
  soldiers: { money: 100, food: 1 },
  tanks: { money: 500, steel: 1 },
  aircraft: { money: 2000, aluminum: 1 },
  ships: { money: 10000, steel: 5, aluminum: 2 },
  missiles: { money: 50000, aluminum: 10, munitions: 10 },
  nukes: { money: 1000000, uranium: 100, aluminum: 50 },
};

export default function Military() {
  const { data: military, isLoading } = useGetMyMilitary();
  const buyMut = useBuyMilitary();
  const sellMut = useSellMilitary();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [buyAmounts, setBuyAmounts] = useState<Record<string, string>>({});
  const [sellAmounts, setSellAmounts] = useState<Record<string, string>>({});

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-48 w-full" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!military) return null;

  const handleBuy = (unit: string) => {
    const amount = parseInt(buyAmounts[unit] || "0", 10);
    if (!amount || amount <= 0) return;

    buyMut.mutate(
      { data: { [unit]: amount } },
      {
        onSuccess: () => {
          toast({ title: "Procurement Successful", description: `Purchased ${amount} ${unit}.` });
          queryClient.invalidateQueries({ queryKey: getGetMyMilitaryQueryKey() });
          setBuyAmounts({ ...buyAmounts, [unit]: "" });
        },
        onError: (err: any) => {
          toast({ title: "Procurement Failed", description: err?.error || "Could not buy units.", variant: "destructive" });
        }
      }
    );
  };

  const handleSell = (unit: string) => {
    const amount = parseInt(sellAmounts[unit] || "0", 10);
    if (!amount || amount <= 0) return;

    sellMut.mutate(
      { data: { [unit]: amount } },
      {
        onSuccess: () => {
          toast({ title: "Decommission Successful", description: `Sold ${amount} ${unit}.` });
          queryClient.invalidateQueries({ queryKey: getGetMyMilitaryQueryKey() });
          setSellAmounts({ ...sellAmounts, [unit]: "" });
        },
        onError: (err: any) => {
          toast({ title: "Decommission Failed", description: err?.error || "Could not sell units.", variant: "destructive" });
        }
      }
    );
  };

  const units = [
    { id: "soldiers", label: "Infantry", icon: Crosshair, count: military.soldiers, costs: UNIT_COSTS.soldiers },
    { id: "tanks", label: "Armor", icon: Shield, count: military.tanks, costs: UNIT_COSTS.tanks },
    { id: "aircraft", label: "Air Force", icon: Plane, count: military.aircraft, costs: UNIT_COSTS.aircraft },
    { id: "ships", label: "Navy", icon: Ship, count: military.ships, costs: UNIT_COSTS.ships },
    { id: "missiles", label: "Missiles", icon: Rocket, count: military.missiles, costs: UNIT_COSTS.missiles },
    { id: "nukes", label: "Nuclear", icon: Bomb, count: military.nukes, costs: UNIT_COSTS.nukes },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase font-mono">Military Command</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Manage armed forces and strategic deterrence.</p>
        </div>
        <div className="bg-card border border-border px-4 py-2 rounded-sm text-right">
          <div className="text-xs font-mono text-muted-foreground uppercase">Action Points Used</div>
          <div className="text-xl font-bold font-mono text-primary">{military.actionPointsUsed} / 12</div>
        </div>
      </div>

      {/* Current Forces Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {units.map((unit) => (
          <Card key={unit.id} className="bg-card border-border rounded-sm text-center">
            <CardContent className="p-6">
              <unit.icon className="w-6 h-6 mx-auto mb-3 text-primary opacity-80" />
              <div className="text-2xl font-bold font-mono">{unit.count.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground uppercase font-mono tracking-wider mt-1">{unit.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Procurement / Decommissioning */}
      <Card className="bg-card border-border rounded-sm">
        <Tabs defaultValue="buy" className="w-full">
          <CardHeader className="border-b border-border bg-muted/20 pb-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <CardTitle className="font-mono uppercase tracking-widest flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2" /> Quartermaster
              </CardTitle>
              <TabsList className="bg-background border border-border rounded-sm">
                <TabsTrigger value="buy" className="font-mono uppercase text-xs">Procure</TabsTrigger>
                <TabsTrigger value="sell" className="font-mono uppercase text-xs">Decommission</TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>
          
          <TabsContent value="buy" className="m-0">
            <div className="divide-y divide-border">
              {units.map((unit) => (
                <div key={`buy-${unit.id}`} className="p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-muted/10 transition-colors">
                  <div className="flex items-center gap-4 min-w-[200px]">
                    <div className="p-3 bg-primary/10 rounded-sm">
                      <unit.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg font-mono uppercase">{unit.label}</h3>
                      <div className="text-sm text-muted-foreground font-mono">Current: {unit.count.toLocaleString()}</div>
                    </div>
                  </div>
                  
                  <div className="flex-1 flex flex-wrap gap-3 md:justify-center">
                    {Object.entries(unit.costs).map(([res, cost]) => (
                      <div key={res} className="bg-background border border-border px-3 py-1.5 rounded-sm flex items-center gap-2">
                        <span className="text-xs text-muted-foreground uppercase font-mono">{res}</span>
                        <span className="font-mono font-bold">{cost.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <Input 
                      type="number"
                      min="1"
                      placeholder="Qty"
                      className="w-24 font-mono bg-background border-border rounded-sm h-10"
                      value={buyAmounts[unit.id] || ""}
                      onChange={(e) => setBuyAmounts({ ...buyAmounts, [unit.id]: e.target.value })}
                    />
                    <Button 
                      onClick={() => handleBuy(unit.id)} 
                      disabled={buyMut.isPending || !buyAmounts[unit.id]}
                      className="font-mono uppercase tracking-wider rounded-sm h-10 min-w-[100px]"
                    >
                      {buyMut.isPending ? "..." : "Procure"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="sell" className="m-0">
            <div className="divide-y divide-border">
              {units.map((unit) => (
                <div key={`sell-${unit.id}`} className="p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-muted/10 transition-colors">
                  <div className="flex items-center gap-4 min-w-[200px]">
                    <div className="p-3 bg-destructive/10 rounded-sm">
                      <unit.icon className="w-6 h-6 text-destructive" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg font-mono uppercase">{unit.label}</h3>
                      <div className="text-sm text-muted-foreground font-mono">Current: {unit.count.toLocaleString()}</div>
                    </div>
                  </div>
                  
                  <div className="flex-1 flex flex-wrap gap-3 md:justify-center">
                    <div className="text-sm text-muted-foreground font-mono italic">
                      Yields 50% of procurement monetary cost. Resources are not recovered.
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <Input 
                      type="number"
                      min="1"
                      max={unit.count}
                      placeholder="Qty"
                      className="w-24 font-mono bg-background border-border rounded-sm h-10"
                      value={sellAmounts[unit.id] || ""}
                      onChange={(e) => setSellAmounts({ ...sellAmounts, [unit.id]: e.target.value })}
                    />
                    <Button 
                      variant="destructive"
                      onClick={() => handleSell(unit.id)} 
                      disabled={sellMut.isPending || !sellAmounts[unit.id]}
                      className="font-mono uppercase tracking-wider rounded-sm h-10 min-w-[100px]"
                    >
                      {sellMut.isPending ? "..." : "Sell"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}