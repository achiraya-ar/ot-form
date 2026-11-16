import { useState } from "react";
import { FileText, Minus, Plus } from "lucide-react";
import { IconButton } from "./ui";

export function PaperStage({
  title,
  orientation,
  children,
  pageCount,
}: {
  title: string;
  orientation: "portrait" | "landscape";
  children: React.ReactNode;
  pageCount?: number;
}) {
  const [zoom, setZoom] = useState(orientation === "landscape" ? 0.72 : 0.88);

  return (
    <section className="paper-stage">
      <div className="paper-stage__toolbar">
        <div className="paper-stage__meta">
          <span className="paper-stage__icon">
            <FileText size={17} />
          </span>
          <div>
            <strong>{title}</strong>
            <span>
              A4 {orientation === "landscape" ? "แนวนอน" : "แนวตั้ง"}
              {pageCount ? ` · ${pageCount} หน้า` : ""}
            </span>
          </div>
        </div>
        <div className="paper-stage__tools">
          <div className="zoom-control">
            <IconButton
              label="ย่อ"
              onClick={() => setZoom((value) => Math.max(0.35, value - 0.08))}
            >
              <Minus size={15} />
            </IconButton>
            <span>{Math.round(zoom * 100)}%</span>
            <IconButton
              label="ขยาย"
              onClick={() => setZoom((value) => Math.min(1.4, value + 0.08))}
            >
              <Plus size={15} />
            </IconButton>
          </div>
        </div>
      </div>

      <div className="paper-stage__scroll">
        <div className="paper-stage__canvas" style={{ zoom }}>
          {children}
        </div>
      </div>
    </section>
  );
}

export function Paper({
  children,
  landscape = false,
  className = "",
}: {
  children: React.ReactNode;
  landscape?: boolean;
  className?: string;
}) {
  return (
    <article
      className={`paper ${landscape ? "paper--landscape" : ""} ${className}`}
    >
      {children}
    </article>
  );
}
