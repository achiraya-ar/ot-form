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

export async function saveFilesToFolder(
  files: Array<{ blob: Blob; filename: string }>,
  folderName: string,
): Promise<string | null> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    const payload = await Promise.all(
      files.map(async (file) => ({
        name: file.filename,
        base64Data: await blobToBase64(file.blob),
      })),
    );
    const savedPath = await invoke<string | null>("save_export_folder", {
      folderName,
      files: payload,
    });
    return savedPath;
  }

  for (const file of files) {
    saveAs(file.blob, file.filename);
  }
  return "ไฟล์ทั้ง 5 ถูกดาวน์โหลดแล้ว";
}
