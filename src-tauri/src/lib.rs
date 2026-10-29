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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![save_export])
        .run(tauri::generate_context!())
        .expect("error while running OT-Form");
}
