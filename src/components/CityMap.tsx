import { useEffect, useRef, useState } from "react";

export interface Edge {
  to: number;
  time: number;
}

interface CityMapProps {
  nodes: { x: number; y: number; label: string }[];
  edges: Edge[][];
  accident: number | null;
  hospitals: number[];
  path: number[];
  isPlaying: boolean;
  onAnimationEnd: () => void;
}

const NODE_RADIUS = 22;

const CityMap = ({
  nodes,
  edges,
  accident,
  hospitals,
  path,
  isPlaying,
  onAnimationEnd,
}: CityMapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0); // 0..path.length-1
  const rafRef = useRef<number | null>(null);

  // Animate ambulance along the path
  useEffect(() => {
    if (!isPlaying || path.length < 2) return;
    setProgress(0);
    const start = performance.now();
    const segmentDuration = 800; // ms per edge
    const total = (path.length - 1) * segmentDuration;

    const tick = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(elapsed / total, 1) * (path.length - 1);
      setProgress(p);
      if (elapsed < total) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onAnimationEnd();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, path, onAnimationEnd]);

  // Compute logical bounds from node positions for auto-fit
  const padding = 50;
  const minX = Math.min(...nodes.map((n) => n.x)) - padding;
  const maxX = Math.max(...nodes.map((n) => n.x)) + padding;
  const minY = Math.min(...nodes.map((n) => n.y)) - padding;
  const maxY = Math.max(...nodes.map((n) => n.y)) + padding;
  const logicalW = maxX - minX;
  const logicalH = maxY - minY;

  // Draw the graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Fit logical coordinates into the visible canvas
    const scale = Math.min(rect.width / logicalW, rect.height / logicalH);
    const offsetX = (rect.width - logicalW * scale) / 2 - minX * scale;
    const offsetY = (rect.height - logicalH * scale) / 2 - minY * scale;
    const tx = (x: number) => x * scale + offsetX;
    const ty = (y: number) => y * scale + offsetY;

    const styles = getComputedStyle(document.documentElement);
    const fg = `hsl(${styles.getPropertyValue("--foreground")})`;
    const muted = `hsl(${styles.getPropertyValue("--muted-foreground")})`;
    const primary = `hsl(${styles.getPropertyValue("--primary")})`;
    const border = `hsl(${styles.getPropertyValue("--border")})`;
    const card = `hsl(${styles.getPropertyValue("--card")})`;
    const destructive = `hsl(${styles.getPropertyValue("--destructive")})`;

    const pathEdges = new Set<string>();
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      pathEdges.add(`${Math.min(a, b)}-${Math.max(a, b)}`);
    }

    const drawnEdges = new Set<string>();
    edges.forEach((edgeList, from) => {
      edgeList.forEach(({ to, time }) => {
        const key = `${Math.min(from, to)}-${Math.max(from, to)}`;
        if (drawnEdges.has(key)) return;
        drawnEdges.add(key);
        const a = nodes[from];
        const b = nodes[to];
        if (!a || !b) return;

        const ax = tx(a.x), ay = ty(a.y);
        const bx = tx(b.x), by = ty(b.y);

        const isOnPath = pathEdges.has(key);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.strokeStyle = isOnPath ? primary : border;
        ctx.lineWidth = isOnPath ? 4 : 2;
        ctx.stroke();

        const mx = (ax + bx) / 2;
        const my = (ay + by) / 2;
        ctx.fillStyle = card;
        ctx.fillRect(mx - 14, my - 10, 28, 20);
        ctx.strokeStyle = isOnPath ? primary : border;
        ctx.lineWidth = 1;
        ctx.strokeRect(mx - 14, my - 10, 28, 20);
        ctx.fillStyle = isOnPath ? primary : muted;
        ctx.font = "bold 11px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${time}m`, mx, my);
      });
    });

    nodes.forEach((node, i) => {
      const nx = tx(node.x), ny = ty(node.y);
      const isAccident = i === accident;
      const isHospital = hospitals.includes(i);
      const isOnPath = path.includes(i);

      ctx.beginPath();
      ctx.arc(nx, ny, NODE_RADIUS, 0, Math.PI * 2);
      if (isAccident) ctx.fillStyle = destructive;
      else if (isHospital) ctx.fillStyle = primary;
      else ctx.fillStyle = card;
      ctx.fill();
      ctx.strokeStyle = isOnPath ? primary : border;
      ctx.lineWidth = isOnPath ? 3 : 2;
      ctx.stroke();

      ctx.fillStyle =
        isAccident || isHospital
          ? `hsl(${styles.getPropertyValue("--primary-foreground")})`
          : fg;
      ctx.font = "bold 13px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.label, nx, ny);

      if (isAccident) {
        ctx.font = "16px system-ui";
        ctx.fillStyle = destructive;
        ctx.fillText("⚠️", nx, ny - NODE_RADIUS - 12);
      } else if (isHospital) {
        ctx.font = "16px system-ui";
        ctx.fillStyle = primary;
        ctx.fillText("🏥", nx, ny - NODE_RADIUS - 12);
      }
    });

    for (let i = 0; i < path.length - 1; i++) {
      const a = nodes[path[i]];
      const b = nodes[path[i + 1]];
      if (!a || !b) continue;
      const ax = tx(a.x), ay = ty(a.y);
      const bx = tx(b.x), by = ty(b.y);
      const angle = Math.atan2(by - ay, bx - ax);
      const tipX = bx - Math.cos(angle) * (NODE_RADIUS + 4);
      const tipY = by - Math.sin(angle) * (NODE_RADIUS + 4);
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(
        tipX - Math.cos(angle - Math.PI / 6) * 12,
        tipY - Math.sin(angle - Math.PI / 6) * 12
      );
      ctx.lineTo(
        tipX - Math.cos(angle + Math.PI / 6) * 12,
        tipY - Math.sin(angle + Math.PI / 6) * 12
      );
      ctx.closePath();
      ctx.fillStyle = primary;
      ctx.fill();
    }

    if (path.length >= 2 && isPlaying) {
      const segIndex = Math.floor(progress);
      const t = progress - segIndex;
      const a = nodes[path[Math.min(segIndex, path.length - 1)]];
      const b = nodes[path[Math.min(segIndex + 1, path.length - 1)]];
      if (a && b) {
        const ax = tx(a.x), ay = ty(a.y);
        const bx = tx(b.x), by = ty(b.y);
        const x = ax + (bx - ax) * t;
        const y = ay + (by - ay) * t;

        ctx.beginPath();
        ctx.arc(x, y, 18 + Math.sin(performance.now() / 150) * 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${styles.getPropertyValue("--destructive")} / 0.2)`;
        ctx.fill();

        ctx.font = "28px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🚑", x, y);
      }
    }
  }, [nodes, edges, accident, hospitals, path, progress, isPlaying, logicalW, logicalH, minX, minY]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-[520px] rounded-lg border border-border bg-muted/30"
    />
  );
};

export default CityMap;
