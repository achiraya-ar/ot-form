use base64::{engine::general_purpose::STANDARD, Engine as _};

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![save_export, save_export_folder])
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
