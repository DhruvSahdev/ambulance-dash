import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import CityMap, { Edge } from "@/components/CityMap";

// Dijkstra's algorithm
function dijkstra(graph: Edge[][], source: number) {
  const n = graph.length;
  const time = new Array(n).fill(Infinity);
  const parent = new Array(n).fill(-1);
  time[source] = 0;
  const pq: [number, number][] = [[0, source]];

  while (pq.length) {
    pq.sort((a, b) => a[0] - b[0]);
    const [curTime, node] = pq.shift()!;
    if (curTime > time[node]) continue;
    for (const edge of graph[node]) {
      const newTime = curTime + edge.time;
      if (newTime < time[edge.to]) {
        time[edge.to] = newTime;
        parent[edge.to] = node;
        pq.push([newTime, edge.to]);
      }
    }
  }
  return { time, parent };
}

function buildPath(parent: number[], dest: number): number[] {
  const path: number[] = [];
  let cur = dest;
  while (cur !== -1) {
    path.push(cur);
    cur = parent[cur];
  }
  return path.reverse();
}

// Default sample city — 15 locations laid out nicely on the canvas
const defaultNodes = [
  { x: 80,  y: 240, label: "0" },
  { x: 180, y: 100, label: "1" },
  { x: 180, y: 380, label: "2" },
  { x: 300, y: 200, label: "3" },
  { x: 300, y: 320, label: "4" },
  { x: 420, y: 80,  label: "5" },
  { x: 420, y: 240, label: "6" },
  { x: 420, y: 400, label: "7" },
  { x: 540, y: 160, label: "8" },
  { x: 540, y: 320, label: "9" },
  { x: 660, y: 100, label: "10" },
  { x: 660, y: 240, label: "11" },
  { x: 660, y: 380, label: "12" },
  { x: 780, y: 170, label: "13" },
  { x: 780, y: 330, label: "14" },
];

const defaultRoads = [
  "0 1 4", "0 2 3", "1 3 2", "2 4 2", "1 2 5",
  "3 4 3", "3 5 4", "3 6 2", "4 6 3", "4 7 4",
  "5 6 2", "6 7 3", "5 8 5", "6 8 2", "6 9 3",
  "7 9 2", "8 9 4", "8 10 3", "8 11 2", "9 11 3",
  "9 12 4", "10 11 2", "11 12 3", "10 13 4", "11 13 2",
  "11 14 3", "12 14 2", "13 14 5"
].join("\n");

const Index = () => {
  const [roadsInput, setRoadsInput] = useState(defaultRoads);
  const [accident, setAccident] = useState("0");
  const [hospitals, setHospitals] = useState("13, 14");
  const [path, setPath] = useState<number[]>([]);
  const [resultInfo, setResultInfo] = useState<{ time: number; hospital: number } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const numLocations = defaultNodes.length;

  const graph = useMemo(() => {
    const g: Edge[][] = Array.from({ length: numLocations }, () => []);
    const lines = roadsInput.trim().split("\n").filter((l) => l.trim());
    for (const line of lines) {
      const [u, v, t] = line.trim().split(/\s+/).map(Number);
      if (
        isNaN(u) || isNaN(v) || isNaN(t) ||
        u < 0 || v < 0 || u >= numLocations || v >= numLocations
      ) continue;
      g[u].push({ to: v, time: t });
      g[v].push({ to: u, time: t });
    }
    return g;
  }, [roadsInput, numLocations]);

  const accidentNum = parseInt(accident);
  const hospitalList = hospitals
    .split(/[\s,]+/)
    .map(Number)
    .filter((h) => !isNaN(h) && h >= 0 && h < numLocations);

  const handleFindRoute = () => {
    if (isNaN(accidentNum) || accidentNum < 0 || accidentNum >= numLocations) {
      toast({ title: "Invalid accident location" });
      return;
    }
    if (!hospitalList.length) {
      toast({ title: "Enter at least one valid hospital" });
      return;
    }

    const { time, parent } = dijkstra(graph, accidentNum);
    let bestHospital = -1;
    let bestTime = Infinity;
    for (const h of hospitalList) {
      if (time[h] < bestTime) {
        bestTime = time[h];
        bestHospital = h;
      }
    }

    if (bestHospital === -1 || bestTime === Infinity) {
      toast({ title: "No hospital reachable" });
      setPath([]);
      setResultInfo(null);
      return;
    }

    const newPath = buildPath(parent, bestHospital);
    setPath(newPath);
    setResultInfo({ time: bestTime, hospital: bestHospital });
    setIsPlaying(true);
  };

  const handleReset = () => {
    setPath([]);
    setResultInfo(null);
    setIsPlaying(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold">
            🚑 Emergency Ambulance Routing System
          </h1>
          <p className="text-muted-foreground">
            Watch the ambulance travel the fastest route — powered by Dijkstra's Algorithm
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <Card className="lg:col-span-2 p-4 animate-fade-in">
            <CityMap
              nodes={defaultNodes}
              edges={graph}
              accident={isNaN(accidentNum) ? null : accidentNum}
              hospitals={hospitalList}
              path={path}
              isPlaying={isPlaying}
              onAnimationEnd={() => setIsPlaying(false)}
            />
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-destructive" />
                Accident
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary" />
                Hospital
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-0.5 bg-primary" />
                Shortest Path
              </div>
              <div className="flex items-center gap-2">
                <span>🚑</span> Ambulance
              </div>
            </div>
          </Card>

          {/* Controls */}
          <Card className="p-5 space-y-4 animate-fade-in">
            <div>
              <h2 className="font-semibold mb-1">Controls</h2>
              <p className="text-xs text-muted-foreground">
                City has 15 locations (0–14). Edit roads or pick different points.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="roads">Roads (from to time)</Label>
              <textarea
                id="roads"
                className="w-full min-h-[140px] rounded-md border border-input bg-background p-3 text-sm font-mono"
                value={roadsInput}
                onChange={(e) => setRoadsInput(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="acc">Accident Location</Label>
              <Input
                id="acc"
                value={accident}
                onChange={(e) => setAccident(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hosp">Hospitals (comma separated)</Label>
              <Input
                id="hosp"
                value={hospitals}
                onChange={(e) => setHospitals(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleFindRoute} className="flex-1 hover-scale">
                🚑 Dispatch
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Reset
              </Button>
            </div>

            {resultInfo && (
              <div className="rounded-md border border-primary/40 bg-primary/5 p-4 space-y-2 animate-scale-in">
                <p className="text-sm">
                  <span className="text-muted-foreground">Nearest Hospital:</span>{" "}
                  <span className="font-semibold">Location {resultInfo.hospital}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Total Time:</span>{" "}
                  <span className="font-semibold">{resultInfo.time} minutes</span>
                </p>
                <div className="flex flex-wrap items-center gap-1 text-sm">
                  {path.map((n, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <span className="px-2 py-0.5 rounded bg-secondary font-mono text-xs">
                        {n}
                      </span>
                      {i < path.length - 1 && <span className="text-primary">→</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
