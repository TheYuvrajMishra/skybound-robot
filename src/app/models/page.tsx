import Link from "next/link";
import { REGISTRY } from "@/models/registry";

export default function Gallery() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Skybound — Phase 1 Model Gallery</h1>
      <p>13 subjects. Click a model to open its viewer (front / back / close / iso / sheet / tiled).</p>
      <ul>
        {REGISTRY.map((e) => (
          <li key={e.id} style={{ margin: "8px 0" }}>
            <Link href={`/models/${e.id}?view=front`}>{e.name}</Link> — tri cap {e.triCap} — sheet {e.sheetPath}
          </li>
        ))}
      </ul>
    </main>
  );
}
