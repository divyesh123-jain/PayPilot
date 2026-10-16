import { AlertTriangle, ArrowRight, Sparkles, X } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import type { BusinessProfile } from "@/frontend/features/paypilot/types";

export function AlertBanner({
  data,
  onAction,
}: {
  data: BusinessProfile["alert"];
  onAction: () => void;
}) {
  return (
    <div className={`alert-banner ${data.tone}`}>
      <div className="alert-symbol">
        {data.tone === "blue" ? <Sparkles size={19} /> : <AlertTriangle size={19} />}
      </div>
      <div className="alert-copy">
        <span className="eyebrow">{data.eyebrow}</span>
        <h3>{data.title}</h3>
        <p>{data.detail}</p>
      </div>
      <Button variant="dark" onClick={onAction}>
        {data.action}
        <ArrowRight size={15} />
      </Button>
      <Button variant="icon" className="alert-close" aria-label="Dismiss alert">
        <X size={16} />
      </Button>
    </div>
  );
}
