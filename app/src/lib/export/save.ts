import { saveAs } from "file-saver";

export function isTauri(): boolean {
  return (
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("อ่านไฟล์ไม่สำเร็จ"));
    reader.readAsDataURL(blob);
  });
}

export async function saveBlob(blob: Blob, filename: string): Promise<boolean> {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const savedPath = await invoke<string | null>("save_export", {
        defaultName: filename,
        base64Data: await blobToBase64(blob),
      });
      return Boolean(savedPath);
    } catch (error) {
      console.error("Tauri save failed", error);
      throw error;
    }
  }
  saveAs(blob, filename);
  return true;
}
