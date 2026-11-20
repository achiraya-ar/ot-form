import { saveAs } from "file-saver";

export function isTauri(): boolean {
  return (
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  );
}

const textEncoder = new TextEncoder();

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

async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Packs multiple files into one raw binary payload for Tauri IPC.
 *
 * Layout (little-endian):
 *   u32 fileCount
 *   for each file:
 *     u32 nameByteLength
 *     name bytes (UTF-8)
 *     u32 dataByteLength
 *     data bytes
 */
function packFiles(files: Array<{ filename: string; bytes: Uint8Array }>): Uint8Array {
  let total = 4;
  const entries = files.map((file) => {
    const name = textEncoder.encode(file.filename);
    total += 4 + name.length + 4 + file.bytes.length;
    return { name, bytes: file.bytes };
  });

  const payload = new Uint8Array(total);
  const view = new DataView(payload.buffer);
  let offset = 0;

  view.setUint32(offset, entries.length, true);
  offset += 4;

  for (const entry of entries) {
    view.setUint32(offset, entry.name.length, true);
    offset += 4;
    payload.set(entry.name, offset);
    offset += entry.name.length;

    view.setUint32(offset, entry.bytes.length, true);
    offset += 4;
    payload.set(entry.bytes, offset);
    offset += entry.bytes.length;
  }

  return payload;
}

export async function saveBlob(blob: Blob, filename: string): Promise<boolean> {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      // Raw IPC avoids base64 encoding/decoding and is much faster for
      // large Excel/Word/PDF exports.
      const savedPath = await invoke<string | null>(
        "save_export_raw",
        await blobToBytes(blob),
        { headers: { "x-file-name": encodeURIComponent(filename) } },
      );
      return Boolean(savedPath);
    } catch (error) {
      console.warn("Raw save failed, falling back to base64 IPC", error);
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const savedPath = await invoke<string | null>("save_export", {
          defaultName: filename,
          base64Data: await blobToBase64(blob),
        });
        return Boolean(savedPath);
      } catch (fallbackError) {
        console.error("Tauri save failed", fallbackError);
        throw fallbackError;
      }
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
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const entries = await Promise.all(
        files.map(async (file) => ({
          filename: file.filename,
          bytes: await blobToBytes(file.blob),
        })),
      );
      const savedPath = await invoke<string | null>(
        "save_export_folder_raw",
        packFiles(entries),
        { headers: { "x-folder-name": encodeURIComponent(folderName) } },
      );
      return savedPath;
    } catch (error) {
      console.warn("Raw folder save failed, falling back to base64 IPC", error);
      try {
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
      } catch (fallbackError) {
        console.error("Tauri folder save failed", fallbackError);
        throw fallbackError;
      }
    }
  }

  for (const file of files) {
    saveAs(file.blob, file.filename);
  }
  return "ไฟล์ทั้ง 5 ถูกดาวน์โหลดแล้ว";
}
