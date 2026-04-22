import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

// Edge in the city graph
interface Edge {
  to: number;
  time: number;
}

// Dijkstra's algorithm — returns shortest time array + parent array
function dijkstra(graph: Edge[][], source: number) {
  const n = graph.length;
  const time = new Array(n).fill(Infinity);
  const parent = new Array(n).fill(-1);
  time[source] = 0;

  // Simple priority queue (small graphs, so array is fine)
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

const Index = () => {
  const [locations, setLocations] = useState("");
  const [roadsInput, setRoadsInput] = useState("");
  const [accident, setAccident] = useState("");
  const [hospitals, setHospitals] = useState("");
  const [result, setResult] = useState<{
    path: number[];
    time: number;
    hospital: number;
  } | null>(null);

  const handleFindRoute = () => {
    const n = parseInt(locations);
    if (isNaN(n) || n <= 0) {
      toast({ title: "Invalid input", description: "Enter valid number of locations." });
      return;
    }

    // Build graph
    const graph: Edge[][] = Array.from({ length: n }, () => []);
    const roadLines = roadsInput.trim().split("\n").filter((l) => l.trim());
    for (const line of roadLines) {
      const [u, v, t] = line.trim().split(/\s+/).map(Number);
      if (isNaN(u) || isNaN(v) || isNaN(t) || u < 0 || v < 0 || u >= n || v >= n) {
        toast({ title: "Invalid road", description: `Check this road: ${line}` });
        return;
      }
      graph[u].push({ to: v, time: t });
      graph[v].push({ to: u, time: t });
    }

    const acc = parseInt(accident);
    if (isNaN(acc) || acc < 0 || acc >= n) {
      toast({ title: "Invalid accident location" });
      return;
    }

    const hospitalList = hospitals
      .trim()
      .split(/[\s,]+/)
      .map(Number)
      .filter((h) => !isNaN(h));

    if (!hospitalList.length) {
      toast({ title: "Enter at least one hospital" });
      return;
    }

    const { time, parent } = dijkstra(graph, acc);

    let bestHospital = -1;
    let bestTime = Infinity;
    for (const h of hospitalList) {
      if (h >= 0 && h < n && time[h] < bestTime) {
        bestTime = time[h];
        bestHospital = h;
      }
    }

    if (bestHospital === -1 || bestTime === Infinity) {
      toast({ title: "No hospital reachable from accident location" });
      setResult(null);
      return;
    }

    setResult({
      path: buildPath(parent, bestHospital),
      time: bestTime,
      hospital: bestHospital,
    });
  };

  const loadSample = () => {
    setLocations("5");
    setRoadsInput("0 1 4\n0 2 2\n1 2 1\n1 3 5\n2 3 8\n3 4 2");
    setAccident("0");
    setHospitals("3, 4");
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold">🚑 Emergency Ambulance Routing System</h1>
          <p className="text-muted-foreground">
            Find the fastest route from accident spot to nearest hospital using Dijkstra's Algorithm
          </p>
        </header>

        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="loc">Number of Locations</Label>
            <Input
              id="loc"
              placeholder="e.g. 5"
              value={locations}
              onChange={(e) => setLocations(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="roads">Roads (one per line: from to time)</Label>
            <textarea
              id="roads"
              className="w-full min-h-[140px] rounded-md border border-input bg-background p-3 text-sm font-mono"
              placeholder={"0 1 4\n0 2 2\n1 2 1"}
              value={roadsInput}
              onChange={(e) => setRoadsInput(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="acc">Accident Location</Label>
              <Input
                id="acc"
                placeholder="e.g. 0"
                value={accident}
                onChange={(e) => setAccident(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hosp">Hospital Locations (comma separated)</Label>
              <Input
                id="hosp"
                placeholder="e.g. 3, 4"
                value={hospitals}
                onChange={(e) => setHospitals(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleFindRoute} className="flex-1">
              Find Shortest Route
            </Button>
            <Button variant="outline" onClick={loadSample}>
              Load Sample
            </Button>
          </div>
        </Card>

        {result && (
          <Card className="p-6 space-y-3 border-primary">
            <h2 className="text-xl font-semibold">Result</h2>
            <p>
              <span className="text-muted-foreground">Nearest Hospital:</span>{" "}
              <span className="font-semibold">Location {result.hospital}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Total Time:</span>{" "}
              <span className="font-semibold">{result.time} minutes</span>
            </p>
            <div>
              <p className="text-muted-foreground mb-2">Route:</p>
              <div className="flex flex-wrap items-center gap-2">
                {result.path.map((node, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-md bg-secondary text-secondary-foreground font-mono">
                      {node}
                    </span>
                    {i < result.path.length - 1 && <span>→</span>}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6 space-y-2 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">How it works:</p>
          <p>1. Enter total locations (numbered 0 to N-1).</p>
          <p>2. Enter each road as: <code>from to time</code> (one per line).</p>
          <p>3. Enter accident location and possible hospital locations.</p>
          <p>4. Click "Find Shortest Route" — Dijkstra picks the fastest path.</p>
        </Card>
      </div>
    </div>
  );
};

export default Index;
