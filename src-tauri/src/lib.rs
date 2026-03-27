use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

/// Tracks how many files have been opened via file-association / double-click.
/// First file → main window; subsequent files → new windows.
static OPEN_COUNT: AtomicUsize = AtomicUsize::new(0);

/// Stores files waiting to be loaded by a window's frontend on mount.
struct PendingFiles(Mutex<HashMap<String, FileResult>>);

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileResult {
    pub file_path: String,
    pub file_name: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveResult {
    pub file_path: String,
    pub file_name: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WriteResult {
    pub success: bool,
    pub error: Option<String>,
}

/// Open a file dialog and return the file path + content.
#[tauri::command]
async fn open_file(app: AppHandle) -> Result<Option<FileResult>, String> {
    use tauri_plugin_dialog::DialogExt;

    let file = app
        .dialog()
        .file()
        .add_filter("Markdown", &["md", "markdown", "txt"])
        .blocking_pick_file();

    match file {
        Some(fp) => {
            let path_buf: PathBuf = fp.into_path().map_err(|e| e.to_string())?;
            let file_name = path_buf
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            let content = std::fs::read_to_string(&path_buf)
                .map_err(|e| format!("Failed to read file: {e}"))?;
            Ok(Some(FileResult {
                file_path: path_buf.to_string_lossy().to_string(),
                file_name,
                content,
            }))
        }
        None => Ok(None),
    }
}

/// Write content to an existing file path.
#[tauri::command]
async fn write_file(path: String, content: String) -> WriteResult {
    match std::fs::write(&path, &content) {
        Ok(_) => WriteResult {
            success: true,
            error: None,
        },
        Err(e) => WriteResult {
            success: false,
            error: Some(e.to_string()),
        },
    }
}

/// Open a save-as dialog and write content to the chosen path.
#[tauri::command]
async fn save_file_as(
    app: AppHandle,
    default_name: String,
    content: String,
) -> Result<Option<SaveResult>, String> {
    use tauri_plugin_dialog::DialogExt;

    let path = app
        .dialog()
        .file()
        .set_file_name(&default_name)
        .add_filter("Markdown", &["md", "markdown"])
        .add_filter("Text", &["txt"])
        .blocking_save_file();

    match path {
        Some(fp) => {
            let path_buf: PathBuf = fp.into_path().map_err(|e| e.to_string())?;
            std::fs::write(&path_buf, &content)
                .map_err(|e| format!("Failed to write file: {e}"))?;
            let file_name = path_buf
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            Ok(Some(SaveResult {
                file_path: path_buf.to_string_lossy().to_string(),
                file_name,
            }))
        }
        None => Ok(None),
    }
}

/// Return a pending file for the calling window (set by file-association open).
#[tauri::command]
async fn get_pending_file(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, PendingFiles>,
) -> Result<Option<FileResult>, String> {
    let mut map = state.0.lock().map_err(|e| e.to_string())?;
    Ok(map.remove(window.label()))
}

/// Build the native application menu with File/Edit/View/Window items.
fn build_menu(app: &AppHandle) -> tauri::Result<()> {
    use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};

    // ── File ──
    let open_item = MenuItemBuilder::with_id("open", "Open…")
        .accelerator("CmdOrCtrl+O")
        .build(app)?;
    let save_item = MenuItemBuilder::with_id("save", "Save")
        .accelerator("CmdOrCtrl+S")
        .build(app)?;
    let save_as_item = MenuItemBuilder::with_id("save_as", "Save As…")
        .accelerator("CmdOrCtrl+Shift+S")
        .build(app)?;
    let export_image_item = MenuItemBuilder::with_id("export_image", "Export Image…")
        .build(app)?;
    let print_item = MenuItemBuilder::with_id("print", "Export PDF / Print…")
        .accelerator("CmdOrCtrl+P")
        .build(app)?;

    let file_menu = SubmenuBuilder::new(app, "File")
        .item(&open_item)
        .separator()
        .item(&save_item)
        .item(&save_as_item)
        .separator()
        .item(&export_image_item)
        .item(&print_item)
        .build()?;

    // ── Edit ──
    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .item(&PredefinedMenuItem::undo(app, None)?)
        .item(&PredefinedMenuItem::redo(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::cut(app, None)?)
        .item(&PredefinedMenuItem::copy(app, None)?)
        .item(&PredefinedMenuItem::paste(app, None)?)
        .item(&PredefinedMenuItem::select_all(app, None)?)
        .build()?;

    // ── View ──
    let view_editor = MenuItemBuilder::with_id("view_editor", "Editor Only")
        .accelerator("CmdOrCtrl+1")
        .build(app)?;
    let view_split = MenuItemBuilder::with_id("view_split", "Split View")
        .accelerator("CmdOrCtrl+2")
        .build(app)?;
    let view_preview = MenuItemBuilder::with_id("view_preview", "Preview Only")
        .accelerator("CmdOrCtrl+3")
        .build(app)?;
    let toggle_toc = MenuItemBuilder::with_id("toggle_toc", "Toggle Table of Contents")
        .accelerator("CmdOrCtrl+Shift+T")
        .build(app)?;
    let toggle_locale = MenuItemBuilder::with_id("toggle_locale", "Switch Language / 切换语言")
        .accelerator("CmdOrCtrl+Shift+L")
        .build(app)?;

    // Font submenu
    let font_source_serif = MenuItemBuilder::with_id("font_serif", "Source Serif 4").build(app)?;
    let font_lora = MenuItemBuilder::with_id("font_lora", "Lora").build(app)?;
    let font_dm_sans = MenuItemBuilder::with_id("font_sans", "DM Sans").build(app)?;
    let font_inter = MenuItemBuilder::with_id("font_inter", "Inter").build(app)?;
    let font_jetbrains = MenuItemBuilder::with_id("font_mono", "JetBrains Mono").build(app)?;
    let font_noto_serif_sc = MenuItemBuilder::with_id("font_noto-serif-sc", "思源宋体").build(app)?;
    let font_noto_sans_sc = MenuItemBuilder::with_id("font_noto-sans-sc", "思源黑体").build(app)?;
    let font_zcool = MenuItemBuilder::with_id("font_zcool", "站酷小薇体").build(app)?;

    let font_menu = SubmenuBuilder::new(app, "Font")
        .item(&font_source_serif)
        .item(&font_lora)
        .item(&font_dm_sans)
        .item(&font_inter)
        .item(&font_jetbrains)
        .separator()
        .item(&font_noto_serif_sc)
        .item(&font_noto_sans_sc)
        .item(&font_zcool)
        .build()?;

    let view_menu = SubmenuBuilder::new(app, "View")
        .item(&view_editor)
        .item(&view_split)
        .item(&view_preview)
        .separator()
        .item(&toggle_toc)
        .separator()
        .item(&toggle_locale)
        .item(&font_menu)
        .build()?;

    // ── Window ──
    let window_menu = SubmenuBuilder::new(app, "Window")
        .item(&PredefinedMenuItem::minimize(app, None)?)
        .item(&PredefinedMenuItem::maximize(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::close_window(app, None)?)
        .build()?;

    let mut builder = MenuBuilder::new(app);

    #[cfg(target_os = "macos")]
    {
        let app_menu = SubmenuBuilder::new(app, "Markdown Editor")
            .item(&PredefinedMenuItem::about(app, None, None)?)
            .separator()
            .item(&PredefinedMenuItem::services(app, None)?)
            .separator()
            .item(&PredefinedMenuItem::hide(app, None)?)
            .item(&PredefinedMenuItem::hide_others(app, None)?)
            .item(&PredefinedMenuItem::show_all(app, None)?)
            .separator()
            .item(&PredefinedMenuItem::quit(app, None)?)
            .build()?;
        builder = builder.item(&app_menu);
    }

    let menu = builder
        .item(&file_menu)
        .item(&edit_menu)
        .item(&view_menu)
        .item(&window_menu)
        .build()?;

    app.set_menu(menu)?;

    // Handle menu events
    app.on_menu_event(|app, event| {
        let id = event.id();
        let id_str = id.as_ref();
        let _ = match id_str {
            "open"          => app.emit("menu:open", ()),
            "save"          => app.emit("menu:save", ()),
            "save_as"       => app.emit("menu:saveAs", ()),
            "print"         => app.emit("menu:print", ()),
            "export_image"  => app.emit("menu:exportImage", ()),
            "view_editor"   => app.emit("menu:viewMode", "editor"),
            "view_split"    => app.emit("menu:viewMode", "split"),
            "view_preview"  => app.emit("menu:viewMode", "preview"),
            "toggle_toc"    => app.emit("menu:toggleToc", ()),
            "toggle_locale" => app.emit("menu:toggleLocale", ()),
            _ if id_str.starts_with("font_") => {
                let font_id = &id_str[5..]; // strip "font_" prefix
                app.emit("menu:fontChange", font_id)
            }
            _ => Ok(()),
        };
    });

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .manage(PendingFiles(Mutex::new(HashMap::new())))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            build_menu(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            open_file,
            write_file,
            save_file_as,
            get_pending_file
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            #[cfg(desktop)]
            if let tauri::RunEvent::Opened { urls } = event {
                for url in urls {
                    if let Ok(path) = url.to_file_path() {
                        if path.exists() {
                            if let Ok(content) = std::fs::read_to_string(&path) {
                                let file_name = path
                                    .file_name()
                                    .unwrap_or_default()
                                    .to_string_lossy()
                                    .to_string();
                                let file_result = FileResult {
                                    file_path: path.to_string_lossy().to_string(),
                                    file_name: file_name.clone(),
                                    content,
                                };

                                let count = OPEN_COUNT.fetch_add(1, Ordering::SeqCst);

                                if count == 0 {
                                    // First file → load into main window
                                    let state = app_handle.state::<PendingFiles>();
                                    if let Ok(mut map) = state.0.lock() {
                                        map.insert("main".to_string(), file_result.clone());
                                    }
                                    if let Some(window) = app_handle.get_webview_window("main") {
                                        let _ = window.set_title(&file_name);
                                        let _ = window.emit("file:opened", &file_result);
                                    }
                                } else {
                                    // Subsequent files → new window
                                    let label = format!("editor-{}", count);
                                    let state = app_handle.state::<PendingFiles>();
                                    if let Ok(mut map) = state.0.lock() {
                                        map.insert(label.clone(), file_result);
                                    }
                                    let _ = tauri::WebviewWindowBuilder::new(
                                        app_handle,
                                        &label,
                                        tauri::WebviewUrl::App("index.html".into()),
                                    )
                                    .title(&file_name)
                                    .inner_size(1280.0, 800.0)
                                    .min_inner_size(800.0, 600.0)
                                    .build();
                                }
                            }
                        }
                    }
                }
            }
        });
}


