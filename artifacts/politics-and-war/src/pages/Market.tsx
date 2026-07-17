import { useState } from "react";
import { Link } from "wouter";
import { 
  useListMarketOffers, 
  useCreateMarketOffer, 
  useAcceptMarketOffer, 
  useCancelMarketOffer, 
  useGetMe,
  getListMarketOffersQueryKey,
  getGetMeQueryKey,
  ListMarketOffersType,
  MarketOfferInputOfferType,
  MarketOfferInputResource
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Landmark, ArrowRightLeft, Coins, TrendingUp, X } from "lucide-react";
import { format } from "date-fns";

const RESOURCES = [
  "food", "coal", "oil", "iron", "bauxite", "lead", 
  "uranium", "gasoline", "steel", "munitions", "aluminum"
];

export default function Market() {
  const { data: me } = useGetMe();
  const [tradeType, setTradeType] = useState<ListMarketOffersType>("sell"); // default to viewing what people are selling (so I can buy)
  const [resourceFilter, setResourceFilter] = useState<string>("all");
  
  const { data: offers, isLoading } = useListMarketOffers({
    type: tradeType,
    resource: resourceFilter !== "all" ? resourceFilter : undefined
  });

  const createMut = useCreateMarketOffer();
  const acceptMut = useAcceptMarketOffer();
  const cancelMut = useCancelMarketOffer();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [newOfferType, setNewOfferType] = useState<MarketOfferInputOfferType>("sell");
  const [newOfferResource, setNewOfferResource] = useState<MarketOfferInputResource>("food");
  const [newOfferQuantity, setNewOfferQuantity] = useState("");
  const [newOfferPrice, setNewOfferPrice] = useState("");

  const [acceptOpen, setAcceptOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [acceptQuantity, setAcceptQuantity] = useState("");

  const handleCreateOffer = () => {
    const qty = parseInt(newOfferQuantity, 10);
    const price = parseInt(newOfferPrice, 10);
    
    if (!qty || !price || qty <= 0 || price <= 0) {
      toast({ title: "Invalid Input", description: "Quantity and price must be greater than zero.", variant: "destructive" });
      return;
    }

    createMut.mutate(
      { data: { offerType: newOfferType, resource: newOfferResource, quantity: qty, pricePerUnit: price } },
      {
        onSuccess: () => {
          toast({ title: "Offer Posted", description: "Your trade offer is now live on the global market." });
          queryClient.invalidateQueries({ queryKey: getListMarketOffersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          setCreateOpen(false);
          setNewOfferQuantity("");
          setNewOfferPrice("");
        },
        onError: (err: any) => {
          toast({ title: "Post Failed", description: err?.error || "Could not post offer.", variant: "destructive" });
        }
      }
    );
  };

  const handleAcceptOffer = () => {
    if (!selectedOffer) return;
    const qty = parseInt(acceptQuantity, 10);
    
    if (!qty || qty <= 0 || qty > selectedOffer.quantity) {
      toast({ title: "Invalid Input", description: "Invalid quantity specified.", variant: "destructive" });
      return;
    }

    acceptMut.mutate(
      { offerId: selectedOffer.id, data: { quantity: qty } },
      {
        onSuccess: (res) => {
          toast({ title: "Trade Executed", description: `Transaction complete for ${qty} ${res.resource}.` });
          queryClient.invalidateQueries({ queryKey: getListMarketOffersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          setAcceptOpen(false);
          setSelectedOffer(null);
          setAcceptQuantity("");
        },
        onError: (err: any) => {
          toast({ title: "Trade Failed", description: err?.error || "Transaction aborted.", variant: "destructive" });
        }
      }
    );
  };

  const handleCancelOffer = (offerId: number) => {
    cancelMut.mutate(
      { offerId },
      {
        onSuccess: () => {
          toast({ title: "Offer Revoked", description: "Trade offer removed from market." });
          queryClient.invalidateQueries({ queryKey: getListMarketOffersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        },
        onError: (err: any) => {
          toast({ title: "Revocation Failed", description: err?.error || "Could not cancel offer.", variant: "destructive" });
        }
      }
    );
  };

  const openAcceptDialog = (offer: any) => {
    setSelectedOffer(offer);
    setAcceptQuantity(offer.quantity.toString());
    setAcceptOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase font-mono">Global Market</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Resource exchange and commodities trading.</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="bg-card border border-border px-4 py-2 rounded-sm flex items-center justify-between min-w-[150px]">
            <span className="text-xs font-mono text-muted-foreground uppercase mr-4">Treasury</span>
            <span className="font-bold text-primary font-mono">${me?.nation.resources.money.toLocaleString() || 0}</span>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="font-mono uppercase tracking-widest rounded-sm shrink-0">
            <TrendingUp className="w-4 h-4 mr-2" /> Post Trade
          </Button>
        </div>
      </div>

      <Card className="bg-card border-border rounded-sm">
        <div className="p-4 border-b border-border bg-muted/20 flex flex-col md:flex-row gap-4 items-center justify-between">
          <Tabs value={tradeType} onValueChange={(v) => setTradeType(v as ListMarketOffersType)} className="w-full md:w-auto">
            <TabsList className="bg-background border border-border rounded-sm w-full md:w-auto">
              <TabsTrigger value="sell" className="font-mono uppercase text-xs">Available to Buy (Selling)</TabsTrigger>
              <TabsTrigger value="buy" className="font-mono uppercase text-xs">Available to Sell (Buying)</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 w-full md:w-64">
            <Label className="text-xs font-mono uppercase text-muted-foreground whitespace-nowrap">Filter Resource:</Label>
            <Select value={resourceFilter} onValueChange={setResourceFilter}>
              <SelectTrigger className="h-9 font-mono bg-background border-border rounded-sm">
                <SelectValue placeholder="All Resources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                {RESOURCES.map(r => <SelectItem key={r} value={r}>{r.toUpperCase()}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs font-mono uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Nation</th>
                <th className="px-6 py-4 font-medium">Resource</th>
                <th className="px-6 py-4 font-medium text-right">Quantity</th>
                <th className="px-6 py-4 font-medium text-right">Price per Unit</th>
                <th className="px-6 py-4 font-medium text-right">Total Value</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-16 ml-auto" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-20 ml-auto" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-24 ml-auto" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-8 w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : offers?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground font-mono">
                    <Landmark className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    No active offers matching criteria.
                  </td>
                </tr>
              ) : (
                offers?.map((offer) => {
                  const isMyOffer = offer.nationId === me?.nation.id;
                  const totalValue = offer.quantity * offer.pricePerUnit;
                  const canAfford = tradeType === "sell" && me && me.nation.resources.money >= totalValue;
                  const hasResource = tradeType === "buy" && me && (me.nation.resources as any)[offer.resource] >= offer.quantity;

                  return (
                    <tr key={offer.id} className={`hover:bg-muted/10 transition-colors ${isMyOffer ? 'bg-primary/5' : ''}`}>
                      <td className="px-6 py-4">
                        <Link href={`/nations/${offer.nationId}`} className="font-bold hover:text-primary transition-colors flex items-center gap-2">
                          {isMyOffer && <Badge variant="outline" className="text-[10px] uppercase font-mono px-1 py-0 mr-1 border-primary text-primary">You</Badge>}
                          {offer.nationName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold uppercase text-muted-foreground">{offer.resource}</td>
                      <td className="px-6 py-4 text-right font-mono text-lg">{offer.quantity.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right font-mono text-primary">${offer.pricePerUnit.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-foreground">${totalValue.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        {isMyOffer ? (
                          <Button variant="outline" size="sm" className="font-mono text-[10px] uppercase text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30" onClick={() => handleCancelOffer(offer.id)}>
                            <X className="w-3 h-3 mr-1" /> Revoke
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            className="font-mono text-[10px] uppercase"
                            onClick={() => openAcceptDialog(offer)}
                            variant={tradeType === "sell" ? "default" : "secondary"}
                          >
                            {tradeType === "sell" ? "Buy Now" : "Sell Now"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Offer Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center text-primary font-mono uppercase tracking-widest text-lg">
              <TrendingUp className="w-5 h-5 mr-2" /> Post Trade Offer
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Action</Label>
                <Select value={newOfferType} onValueChange={(v) => setNewOfferType(v as MarketOfferInputOfferType)}>
                  <SelectTrigger className="font-mono bg-background border-border rounded-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sell">Sell Resource</SelectItem>
                    <SelectItem value="buy">Buy Resource</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Resource</Label>
                <Select value={newOfferResource} onValueChange={(v) => setNewOfferResource(v as MarketOfferInputResource)}>
                  <SelectTrigger className="font-mono bg-background border-border rounded-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCES.map(r => <SelectItem key={r} value={r}>{r.toUpperCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {newOfferType === 'sell' && me && (
               <div className="text-xs font-mono text-muted-foreground text-right">
                 Inventory: {(me.nation.resources as any)[newOfferResource]?.toLocaleString() || 0}
               </div>
            )}

            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Quantity</Label>
              <Input 
                type="number"
                min="1"
                value={newOfferQuantity}
                onChange={(e) => setNewOfferQuantity(e.target.value)}
                className="bg-background border-border font-mono rounded-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Price Per Unit ($)</Label>
              <Input 
                type="number"
                min="1"
                value={newOfferPrice}
                onChange={(e) => setNewOfferPrice(e.target.value)}
                className="bg-background border-border font-mono rounded-sm"
              />
            </div>

            {newOfferQuantity && newOfferPrice && (
              <div className="pt-2 mt-2 border-t border-border flex justify-between items-center text-sm font-mono">
                <span className="text-muted-foreground uppercase">Total Value:</span>
                <span className="font-bold text-primary text-lg">
                  ${(parseInt(newOfferQuantity) * parseInt(newOfferPrice)).toLocaleString()}
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="font-mono uppercase tracking-widest rounded-sm border-border">
              Cancel
            </Button>
            <Button onClick={handleCreateOffer} disabled={createMut.isPending} className="font-mono uppercase tracking-widest rounded-sm">
              {createMut.isPending ? "Posting..." : "Post Offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accept Offer Dialog */}
      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center text-primary font-mono uppercase tracking-widest text-lg">
              <ArrowRightLeft className="w-5 h-5 mr-2" /> Execute Trade
            </DialogTitle>
            {selectedOffer && (
               <DialogDescription className="font-mono text-xs">
                 {selectedOffer.offerType === 'sell' ? 'Buying' : 'Selling'} {selectedOffer.resource.toUpperCase()} from {selectedOffer.nationName} at ${selectedOffer.pricePerUnit}/unit.
               </DialogDescription>
            )}
          </DialogHeader>
          {selectedOffer && (
            <div className="py-4 space-y-4">
              <div className="bg-muted/20 p-3 border border-border rounded-sm text-sm font-mono flex justify-between">
                <span className="text-muted-foreground">Available Quantity:</span>
                <span className="font-bold">{selectedOffer.quantity.toLocaleString()}</span>
              </div>

              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Trade Quantity</Label>
                <Input 
                  type="number"
                  min="1"
                  max={selectedOffer.quantity}
                  value={acceptQuantity}
                  onChange={(e) => setAcceptQuantity(e.target.value)}
                  className="bg-background border-border font-mono rounded-sm text-lg"
                />
              </div>

              {acceptQuantity && (
                <div className="pt-2 mt-2 border-t border-border flex justify-between items-center text-sm font-mono">
                  <span className="text-muted-foreground uppercase">Total Transaction:</span>
                  <span className={`font-bold text-lg ${selectedOffer.offerType === 'sell' ? 'text-destructive' : 'text-green-500'}`}>
                    {selectedOffer.offerType === 'sell' ? '-' : '+'}${(parseInt(acceptQuantity) * selectedOffer.pricePerUnit || 0).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptOpen(false)} className="font-mono uppercase tracking-widest rounded-sm border-border">
              Cancel
            </Button>
            <Button onClick={handleAcceptOffer} disabled={acceptMut.isPending} className="font-mono uppercase tracking-widest rounded-sm">
              {acceptMut.isPending ? "Executing..." : "Confirm Trade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}