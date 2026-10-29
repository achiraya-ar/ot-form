import { saveBlob } from "./save";

type Orientation = "portrait" | "landscape";

function clonePapers(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(".paper")).map((paper) => {
    const clone = paper.cloneNode(true) as HTMLElement;
    clone.style.boxShadow = "none";
    clone.style.margin = "0";
    clone.style.zoom = "1";
    return clone;
  });
}

function collectStyles(): string {
  const chunks: string[] = [];
  for (const link of Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'))) {
    chunks.push(`<link rel="stylesheet" href="${link.href}">`);
  }
  for (const style of Array.from(document.querySelectorAll<HTMLStyleElement>("style"))) {
    chunks.push(style.outerHTML);
  }
  return chunks.join("\n");
}

export async function printPapers(
  container: HTMLElement,
  orientation: Orientation,
  title: string,
): Promise<void> {
  await document.fonts.ready;
  const papers = clonePapers(container);
  if (papers.length === 0) return;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(`<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<title>${title}</title>
${collectStyles()}
<style>
  @page { size: A4 ${orientation}; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff !important; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .paper { box-shadow: none !important; margin: 0 !important; break-after: page; page-break-after: always; }
  .paper:last-child { break-after: auto; page-break-after: auto; }
  @media print { .paper { margin: 0 !important; } }
</style>
</head>
<body>${papers.map((paper) => paper.outerHTML).join("")}</body>
</html>`);
  doc.close();

  await new Promise((resolve) => window.setTimeout(resolve, 700));
  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();
  window.setTimeout(() => iframe.remove(), 2000);
}

export async function downloadPdf(
  container: HTMLElement,
  orientation: Orientation,
  filename: string,
): Promise<boolean> {
  await document.fonts.ready;
  const papers = clonePapers(container);
  if (papers.length === 0) return false;

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-12000px";
  host.style.top = "0";
  host.style.background = "#fff";
  host.style.zIndex = "-1";
  for (const paper of papers) host.appendChild(paper);
  document.body.appendChild(host);

  try {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const pdf = new jsPDF({
      orientation,
      unit: "mm",
      format: "a4",
      compress: true,
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let index = 0; index < papers.length; index += 1) {
      const canvas = await html2canvas(papers[index], {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        windowWidth: papers[index].scrollWidth,
        windowHeight: papers[index].scrollHeight,
      });
      const image = canvas.toDataURL("image/jpeg", 0.95);
      if (index > 0) pdf.addPage();
      pdf.addImage(image, "JPEG", 0, 0, pageWidth, pageHeight);
    }

    const blob = pdf.output("blob");
    return await saveBlob(blob, filename);
  } finally {
    host.remove();
  }
}

export function safeFileStem(input: string): string {
  return input
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}
