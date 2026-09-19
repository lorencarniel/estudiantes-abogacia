"use client";

import { useState, useRef } from "react";

interface Props {
  contentRef: React.RefObject<HTMLDivElement | null>;
  fileName?: string;
}

export default function ExportPDF({ contentRef, fileName = "documento" }: Props) {
  const [exporting, setExporting] = useState(false);
  const scriptLoaded = useRef(false);

  async function loadHtml2Pdf(): Promise<typeof window.html2pdf> {
    if (scriptLoaded.current && window.html2pdf) return window.html2pdf;

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js";
      script.onload = () => {
        scriptLoaded.current = true;
        resolve(window.html2pdf);
      };
      script.onerror = () => reject(new Error("No se pudo cargar html2pdf"));
      document.head.appendChild(script);
    });
  }

  async function handleExport() {
    if (!contentRef.current) return;
    setExporting(true);

    try {
      const html2pdf = await loadHtml2Pdf();
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `${fileName}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
      };

      await html2pdf().set(opt).from(contentRef.current).save();
    } catch (err) {
      console.error("PDF export error:", err);
    } finally {
      setExporting(false);
    }
  }

  return (
    <button onClick={handleExport} disabled={exporting}
      className="flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 transition-colors disabled:opacity-50">
      {exporting ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600" />
      ) : (
        <span>📥</span>
      )}
      {exporting ? "Exportando..." : "Exportar PDF"}
    </button>
  );
}

declare global {
  interface Window {
    html2pdf: ReturnType<typeof Function>;
  }
}
