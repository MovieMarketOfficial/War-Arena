import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useGetWorldMap } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Map as MapIcon, ZoomIn, ZoomOut, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function WorldMap() {
  const { data: nations, isLoading } = useGetWorldMap();
  const [, setLocation] = useLocation();
  const [zoom, setZoom] = useState(1);
  const [search, setSearch] = useState("");

  const filteredNations = useMemo(() => {
    if (!nations) return [];
    if (!search) return nations;
    const s = search.toLowerCase();
    return nations.filter(n => n.name.toLowerCase().includes(s) || n.leaderName.toLowerCase().includes(s));
  }, [nations, search]);

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-[600px] w-full rounded-sm" /></div>;
  }

  // A basic equirectangular-ish coordinate system mapping
  // Let's assume the API returns mapX, mapY generally normalized or we just render them raw if they are arbitrary coords
  // If they are lat/lon: X = longitude (-180 to 180), Y = latitude (-90 to 90)
  // Let's assume x is -180 to 180 and y is -90 to 90
  
  const mapWidth = 1000;
  const mapHeight = 500;

  const getPos = (x: number, y: number) => {
    // Basic scaling assuming lat/lng bounds. If the API returns 0-100, we'd adjust.
    // For now, assume simple unbounded or lat/lng mapping: 
    // X: -180 to 180 -> 0 to 1000
    // Y: 90 to -90 -> 0 to 500
    
    // Just a fallback scaling in case they are unbounded
    const xPct = ((x + 180) / 360);
    const yPct = ((-y + 90) / 180);
    
    return {
      left: `${xPct * 100}%`,
      top: `${yPct * 100}%`
    };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase font-mono">Global Map</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Geopolitical visualization and territorial tracking.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Locate nation..." 
              className="pl-9 h-10 font-mono bg-card border-border rounded-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex border border-border rounded-sm overflow-hidden bg-card">
            <button className="px-3 hover:bg-muted text-muted-foreground" onClick={() => setZoom(z => Math.max(0.5, z - 0.5))}>
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="px-3 py-2 text-xs font-mono border-x border-border font-bold">{(zoom * 100).toFixed(0)}%</div>
            <button className="px-3 hover:bg-muted text-muted-foreground" onClick={() => setZoom(z => Math.min(3, z + 0.5))}>
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <Card className="flex-1 min-h-[600px] bg-card border-border rounded-sm overflow-hidden relative">
        <div className="absolute inset-0 overflow-auto bg-[#0a192f]">
          <div 
            className="relative transition-transform duration-300 origin-top-left"
            style={{ width: `${mapWidth}px`, height: `${mapHeight}px`, transform: `scale(${zoom})`, minWidth: '100%', minHeight: '100%' }}
          >
            {/* Grid overlay */}
            <div className="absolute inset-0" style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
              backgroundSize: '50px 50px'
            }} />
            
            {filteredNations?.map(nation => {
              const pos = getPos(nation.mapX, nation.mapY);
              const isSearchMatch = search && (nation.name.toLowerCase().includes(search.toLowerCase()) || nation.leaderName.toLowerCase().includes(search.toLowerCase()));
              
              return (
                <div 
                  key={nation.id}
                  className={`absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full cursor-pointer transition-all duration-300 z-10 group
                    ${isSearchMatch ? 'bg-amber-500 scale-150 animate-pulse z-20 shadow-[0_0_10px_rgba(245,158,11,0.8)]' : 'bg-primary hover:scale-150 hover:bg-amber-500 hover:z-30'}`
                  }
                  style={pos}
                  onClick={() => setLocation(`/nations/${nation.id}`)}
                >
                  {/* Tooltip */}
                  <div className="absolute opacity-0 group-hover:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-card border border-border p-2 rounded-sm whitespace-nowrap pointer-events-none transition-opacity">
                    <div className="font-bold text-xs font-mono text-foreground">{nation.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{nation.leaderName}</div>
                    <div className="text-[10px] text-primary font-mono mt-1">Score: {nation.score}</div>
                  </div>
                </div>
              );
            })}

            {filteredNations?.length === 0 && search && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-card/80 p-4 rounded-sm border border-border backdrop-blur">
                  <div className="font-mono text-muted-foreground">Target not found.</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}