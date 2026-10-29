import { useRef, useState } from "react";
import { Download, FileText, Minus, Printer, Plus } from "lucide-react";
import { Button, IconButton, useToast } from "./ui";
import { downloadPdf, printPapers, safeFileStem } from "../lib/export/print";
import { isTauri } from "../lib/export/save";
import { toThaiDigits } from "../lib/thai";

export function PaperStage({
  title,
  orientation,
  filename,
  children,
  pageCount,
}: {
  title: string;
  orientation: "portrait" | "landscape";
  filename: string;
  children: React.ReactNode;
  pageCount?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(orientation === "landscape" ? 0.72 : 0.88);
  const [busy, setBusy] = useState<"print" | "pdf" | null>(null);
  const notify = useToast();

  const handlePrint = async () => {
    if (!canvasRef.current) return;
    setBusy("print");
    try {
      if (isTauri()) {
        const saved = await downloadPdf(
          canvasRef.current,
          orientation,
          `${safeFileStem(toThaiDigits(filename))}.pdf`,
        );
        if (saved) notify("สร้าง PDF แล้ว เปิดไฟล์เพื่อสั่งพิมพ์ได้", "info");
        return;
      }
      await printPapers(canvasRef.current, orientation, title);
    } catch (error) {
      console.error(error);
      notify("เปิดหน้าพิมพ์ไม่สำเร็จ", "error");
    } finally {
      setBusy(null);
    }
  };

  const handlePdf = async () => {
    if (!canvasRef.current) return;
    setBusy("pdf");
    try {
      const saved = await downloadPdf(
        canvasRef.current,
        orientation,
        `${safeFileStem(toThaiDigits(filename))}.pdf`,
      );
      if (saved) notify("ดาวน์โหลด PDF แล้ว");
    } catch (error) {
      console.error(error);
      notify("สร้าง PDF ไม่สำเร็จ", "error");
    } finally {
      setBusy(null);
    }
  };

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
          <Button variant="secondary" size="sm" onClick={handlePrint} disabled={busy !== null}>
            <Printer size={15} /> {busy === "print" ? "กำลังเปิด…" : "พิมพ์"}
          </Button>
          <Button variant="soft" size="sm" onClick={handlePdf} disabled={busy !== null}>
            <Download size={15} /> {busy === "pdf" ? "กำลังสร้าง…" : "PDF"}
          </Button>
        </div>
      </div>

      <div className="paper-stage__scroll" ref={scrollRef}>
        <div
          className="paper-stage__canvas"
          ref={canvasRef}
          style={{ zoom }}
        >
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
