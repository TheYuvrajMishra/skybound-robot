"use client";
import dynamic from "next/dynamic";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import type { ViewKind } from "@/components/ModelCanvas";

const ModelCanvas = dynamic(() => import("@/components/ModelCanvas").then((m) => m.ModelCanvas), { ssr: false });

function ViewerInner() {
  const params = useParams();
  const search = useSearchParams();
  const id = String(params.id);
  const view = (search.get("view") as ViewKind) || "front";
  const holding = search.get("holding") || undefined;
  const turntable = search.get("turntable") || "0";
  void turntable;
  if (view === "sheet") {
    return (
      <div style={{ display: "flex", width: "100vw", height: "100vh", background: "#d9d9d9" }}>
        <div style={{ width: "50%", height: "100%" }}><ModelCanvas id={id} view="close" /></div>
        <div style={{ width: "25%", height: "100%" }}><ModelCanvas id={id} view="front" /></div>
        <div style={{ width: "25%", height: "100%" }}><ModelCanvas id={id} view="back" /></div>
      </div>
    );
  }
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#d9d9d9" }}>
      <ModelCanvas id={id} view={view} holding={holding} />
    </div>
  );
}

export default function ViewerPage() {
  return (
    <Suspense>
      <ViewerInner />
    </Suspense>
  );
}
