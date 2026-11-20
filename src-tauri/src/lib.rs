use base64::{engine::general_purpose::STANDARD, Engine as _};
use percent_encoding::percent_decode_str;

fn header_utf8(headers: &tauri::http::HeaderMap, name: &str) -> Result<String, String> {
    let raw = headers
        .get(name)
        .ok_or_else(|| format!("missing header: {name}"))?;
    let raw = raw
        .to_str()
        .map_err(|_| format!("invalid header encoding: {name}"))?;
    percent_decode_str(raw)
        .decode_utf8()
        .map(|value| value.into_owned())
        .map_err(|_| format!("invalid percent-encoding in header: {name}"))
}

fn safe_file_name(name: &str) -> Result<String, String> {
    let file_name = std::path::Path::new(name)
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| format!("invalid file name: {name}"))?;
    if file_name.is_empty() || file_name == "." || file_name == ".." {
        return Err(format!("invalid file name: {name}"));
    }
    Ok(file_name.to_string())
}

fn read_u32_le(bytes: &[u8], cursor: &mut usize) -> Result<u32, String> {
    if *cursor + 4 > bytes.len() {
        return Err("invalid folder payload: truncated u32".into());
    }
    let value = u32::from_le_bytes(bytes[*cursor..*cursor + 4].try_into().unwrap());
    *cursor += 4;
    Ok(value)
}

fn parse_folder_payload(bytes: &[u8]) -> Result<Vec<(String, Vec<u8>)>, String> {
    let mut cursor = 0usize;
    let count = read_u32_le(bytes, &mut cursor)?;
    if count == 0 || count > 32 {
        return Err("invalid folder payload: unexpected file count".into());
    }

    let mut files = Vec::with_capacity(count as usize);
    for _ in 0..count {
        let name_len = read_u32_le(bytes, &mut cursor)? as usize;
        if name_len == 0 || name_len > 512 || cursor + name_len > bytes.len() {
            return Err("invalid folder payload: invalid file name".into());
        }
        let name = std::str::from_utf8(&bytes[cursor..cursor + name_len])
            .map_err(|_| "invalid folder payload: file name is not UTF-8")?
            .to_string();
        cursor += name_len;

        let data_len = read_u32_le(bytes, &mut cursor)? as usize;
        if cursor + data_len > bytes.len() {
            return Err("invalid folder payload: truncated file data".into());
        }
        let data = bytes[cursor..cursor + data_len].to_vec();
        cursor += data_len;
        files.push((name, data));
    }

    if cursor != bytes.len() {
        return Err("invalid folder payload: trailing bytes".into());
    }

    Ok(files)
}

#[tauri::command]
async fn save_export_raw(request: tauri::ipc::Request<'_>) -> Result<Option<String>, String> {
    let default_name = header_utf8(request.headers(), "x-file-name")?;
    let bytes = match request.body() {
        tauri::ipc::InvokeBody::Raw(bytes) => bytes.clone(),
        _ => return Err("expected raw binary payload".into()),
    };
    let default_name = safe_file_name(&default_name)?;

    let file = rfd::AsyncFileDialog::new()
        .set_title("บันทึกไฟล์")
        .set_file_name(&default_name)
        .save_file()
        .await;

    if let Some(file) = file {
        std::fs::write(file.path(), bytes).map_err(|error| error.to_string())?;
        Ok(Some(file.path().to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
async fn save_export_folder_raw(
    request: tauri::ipc::Request<'_>,
) -> Result<Option<String>, String> {
    let folder_name = header_utf8(request.headers(), "x-folder-name")?;
    let bytes = match request.body() {
        tauri::ipc::InvokeBody::Raw(bytes) => bytes.clone(),
        _ => return Err("expected raw binary payload".into()),
    };
    let files = parse_folder_payload(&bytes)?;

    let parent = rfd::AsyncFileDialog::new()
        .set_title("เลือกโฟลเดอร์สำหรับบันทึก")
        .pick_folder()
        .await;

    let Some(parent) = parent else {
        return Ok(None);
    };

    let safe_name: String = folder_name
        .chars()
        .map(|character| {
            if "/\\:*?\"<>|".contains(character) {
                '-'
            } else {
                character
            }
        })
        .collect();
    let safe_name = safe_name.trim();
    let safe_name = if safe_name.is_empty() {
        "ชุดเอกสาร"
    } else {
        safe_name
    };

    let mut target = parent.path().join(safe_name);
    let mut counter = 2;
    while target.exists() {
        target = parent.path().join(format!("{safe_name} ({counter})"));
        counter += 1;
    }

    std::fs::create_dir_all(&target).map_err(|error| error.to_string())?;

    let mut tasks: Vec<(std::path::PathBuf, &[u8])> = Vec::with_capacity(files.len());
    for (name, data) in &files {
        let safe_name = safe_file_name(name)?;
        tasks.push((target.join(safe_name), data.as_slice()));
    }

    let mut write_errors: Vec<String> = Vec::new();
    std::thread::scope(|scope| {
        let mut handles = Vec::with_capacity(tasks.len());
        for (path, data) in tasks {
            handles.push(scope.spawn(move || {
                std::fs::write(&path, data).map_err(|error| format!("{}: {error}", path.display()))
            }));
        }
        for handle in handles {
            match handle.join() {
                Ok(Ok(())) => {}
                Ok(Err(error)) => write_errors.push(error),
                Err(_) => write_errors.push("a file writer panicked".into()),
            }
        }
    });

    if !write_errors.is_empty() {
        return Err(write_errors.join("; "));
    }

    Ok(Some(target.to_string_lossy().to_string()))
}

#[tauri::command]
async fn save_export(default_name: String, base64_data: String) -> Result<Option<String>, String> {
    let bytes = STANDARD
        .decode(base64_data)
        .map_err(|error| format!("decode error: {error}"))?;

    let file = rfd::AsyncFileDialog::new()
        .set_title("บันทึกไฟล์")
        .set_file_name(&default_name)
        .save_file()
        .await;

    if let Some(file) = file {
        std::fs::write(file.path(), bytes).map_err(|error| error.to_string())?;
        Ok(Some(file.path().to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct FolderFile {
    name: String,
    base64_data: String,
}

#[tauri::command]
async fn save_export_folder(
    folder_name: String,
    files: Vec<FolderFile>,
) -> Result<Option<String>, String> {
    let parent = rfd::AsyncFileDialog::new()
        .set_title("เลือกโฟลเดอร์สำหรับบันทึก")
        .pick_folder()
        .await;

    let Some(parent) = parent else {
        return Ok(None);
    };

    let safe_name: String = folder_name
        .chars()
        .map(|character| {
            if "/\\:*?\"<>|".contains(character) {
                '-'
            } else {
                character
            }
        })
        .collect();
    let safe_name = safe_name.trim();
    let safe_name = if safe_name.is_empty() {
        "ชุดเอกสาร"
    } else {
        safe_name
    };

    let mut target = parent.path().join(safe_name);
    let mut counter = 2;
    while target.exists() {
        target = parent.path().join(format!("{safe_name} ({counter})"));
        counter += 1;
    }

    std::fs::create_dir_all(&target).map_err(|error| error.to_string())?;

    for file in files {
        let file_name = std::path::Path::new(&file.name)
            .file_name()
            .and_then(|name| name.to_str())
            .ok_or_else(|| format!("invalid file name: {}", file.name))?;
        let bytes = STANDARD
            .decode(file.base64_data)
            .map_err(|error| format!("decode error: {error}"))?;
        std::fs::write(target.join(file_name), bytes).map_err(|error| error.to_string())?;
    }

    Ok(Some(target.to_string_lossy().to_string()))
}

// Keep webview storage in a stable data store so app updates and reinstalls
// do not lose settings or document sets on macOS.
// UUID: af7f2498-ccc4-4446-8073-88047454de00
const DATA_STORE_IDENTIFIER: [u8; 16] = [
    175, 127, 36, 152, 204, 196, 68, 70, 128, 115, 136, 4, 116, 84, 222, 0,
];

#[cfg(test)]
mod tests {
    use super::*;

    fn push_file(payload: &mut Vec<u8>, name: &str, data: &[u8]) {
        payload.extend_from_slice(&(name.len() as u32).to_le_bytes());
        payload.extend_from_slice(name.as_bytes());
        payload.extend_from_slice(&(data.len() as u32).to_le_bytes());
        payload.extend_from_slice(data);
    }

    #[test]
    fn parses_folder_payload_in_order() {
        let mut payload = Vec::new();
        payload.extend_from_slice(&2u32.to_le_bytes());
        push_file(&mut payload, "1.docx", b"word");
        push_file(&mut payload, "2.xlsx", b"sheet");

        let files = parse_folder_payload(&payload).expect("payload should parse");
        assert_eq!(files.len(), 2);
        assert_eq!(files[0].0, "1.docx");
        assert_eq!(files[0].1, b"word");
        assert_eq!(files[1].0, "2.xlsx");
        assert_eq!(files[1].1, b"sheet");
    }

    #[test]
    fn rejects_trailing_bytes() {
        let mut payload = Vec::new();
        payload.extend_from_slice(&1u32.to_le_bytes());
        push_file(&mut payload, "a.txt", b"a");
        payload.push(0);

        assert!(parse_folder_payload(&payload).is_err());
    }

    #[test]
    fn sanitizes_file_names() {
        assert_eq!(safe_file_name("../../report.docx").unwrap(), "report.docx");
        assert!(safe_file_name("..").is_err());
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            save_export,
            save_export_folder,
            save_export_raw,
            save_export_folder_raw
        ])
        .setup(|app| {
            let window_config = app
                .config()
                .app
                .windows
                .first()
                .cloned()
                .expect("main window config is required");
            tauri::WebviewWindowBuilder::from_config(app.handle(), &window_config)?
                .data_store_identifier(DATA_STORE_IDENTIFIER)
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running OT-Form");
}
