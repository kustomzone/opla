// Copyright 2023 Mik Bry
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

mod local_server;
mod store;
mod downloader;
mod sys;
pub mod utils;
pub mod api;
pub mod data;
pub mod providers;
pub mod error;
pub mod hash;

use tokio::{ spawn, sync::Mutex };
use std::{ path::{ Path, PathBuf }, sync::Arc };

use api::{
    assistants::{ fetch_assistants_collection, AssistantsCollection },
    hf::search_hf_models,
    models,
};
use data::{ asset::Asset, model::{ Model, ModelEntity } };
use downloader::Downloader;
use providers::{
    llm::{
        LlmCompletionOptions,
        LlmQuery,
        LlmQueryCompletion,
        LlmTokenizeResponse,
    },
    ProvidersManager,
};
use models::{ fetch_models_collection, ModelsCollection };
use serde::Serialize;
use store::{ Store, Provider, Settings };
use local_server::*;
use sys::{ Sys, SysInfos };
use tauri::{
    EventLoopMessage,
    Manager,
    Runtime,
    State,
};
use utils::{ get_config_directory, get_data_directory };

pub struct OplaContext {
    pub server: Arc<Mutex<LocalServer>>,
    pub providers_manager: Arc<Mutex<ProvidersManager>>,
    pub store: Mutex<Store>,
    pub downloader: Mutex<Downloader>,
    pub sys: Mutex<Sys>,
}

#[tauri::command]
async fn get_sys<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>
) -> Result<SysInfos, String> {
    let sys = context.sys.lock().await.refresh();
    Ok(sys)
}

#[tauri::command]
async fn get_opla_configuration<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>
) -> Result<Store, String> {
    let store = context.store.lock().await;
    Ok(store.clone())
}

#[tauri::command]
async fn save_settings<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    settings: Settings
) -> Result<Store, String> {
    let mut store = context.store.lock().await;
    store.settings = settings;
    // println!("Save settings: {:?}", store.settings);
    store.save().map_err(|err| err.to_string())?;
    Ok(store.clone())
}

#[tauri::command]
async fn get_config_path<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>
) -> Result<String, String> {
    let config_dir = get_config_directory()?;
    let config_dir = match config_dir.to_str() {
        Some(c) => { c }
        None => {
            return Err(format!("Failed to get config path"));
        }
    };
    println!("Config path: {:?}", config_dir);
    Ok(config_dir.to_string())
}

#[tauri::command]
async fn get_data_path<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>
) -> Result<String, String> {
    let path = get_data_directory()?;
    let path = match path.to_str() {
        Some(d) => { d }
        None => {
            return Err(format!("Failed to get data path"));
        }
    };
    Ok(path.to_string())
}

#[tauri::command]
async fn get_models_path<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>
) -> Result<String, String> {
    let store = context.store.lock().await;
    let path = match store.models.get_models_path() {
        Ok(p) => { p }
        _ => {
            return Err(format!("Failed to get models path"));
        }
    };
    let path = match path.to_str() {
        Some(d) => { d }
        None => {
            return Err(format!("Failed to get models path"));
        }
    };
    Ok(path.to_string())
}

#[tauri::command]
async fn create_dir<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    path: String,
    data_dir: String
) -> Result<(), String> {
    let dir = std::path::Path::new(data_dir.as_str()).join(path);
    if dir.exists() {
        return Ok(());
    } else {
        println!("Create dir: {:?}", dir);
        std::fs::create_dir_all(&dir).map_err(|err| err.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn get_provider_template<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>
) -> Result<Provider, String> {
    let store = context.store.lock().await;
    let server = store.server.clone();
    let template = ProvidersManager::get_opla_provider(server);
    Ok(template.clone())
}

#[tauri::command]
async fn get_opla_server_status<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>
) -> Result<Payload, String> {
    let server = context.server.lock().await;
    server.get_status()
}

#[tauri::command]
async fn start_opla_server<R: Runtime>(
    app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model: Option<String>,
    port: i32,
    host: String,
    context_size: i32,
    threads: i32,
    n_gpu_layers: i32
) -> Result<Payload, String> {
    println!("Opla try to start ");
    let mut store = context.store.lock().await;
    let model_id = match model {
        Some(m) => { m }
        None => {
            match &store.get_local_active_model_id() {
                Some(m) => { m.clone() }
                None => {
                    println!("Opla server not started default model not set");
                    return Err(format!("Opla server not started model not set"));
                }
            }
        }
    };

    let res = store.models.get_model_path(model_id.clone());
    let model_path = match res {
        Ok(m) => { m }
        Err(err) => {
            return Err(format!("Opla server not started model not found: {:?}", err));
        }
    };

    store.server.parameters.port = port;
    store.server.parameters.host = host.clone();
    store.server.parameters.model_id = Some(model_id.clone());
    store.server.parameters.model_path = Some(model_path.clone());
    store.server.parameters.context_size = context_size;
    store.server.parameters.threads = threads;
    store.server.parameters.n_gpu_layers = n_gpu_layers;
    store.save().map_err(|err| err.to_string())?;

    let parameters = store.server.parameters.clone();
    let mut server = context.server.lock().await;
    server.start(app, &parameters).await
}

#[tauri::command]
async fn stop_opla_server<R: Runtime>(
    app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>
) -> Result<Payload, String> {
    let mut server = context.server.lock().await;
    server.stop(&app).await
}

#[tauri::command]
async fn get_assistants_collection<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    _context: State<'_, OplaContext>
) -> Result<AssistantsCollection, String>
    where Result<AssistantsCollection, String>: Serialize
{
    fetch_assistants_collection("https://opla.github.io/assistants/all.json").await.map_err(|err|
        err.to_string()
    )
}

#[tauri::command]
async fn get_models_collection<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    _context: State<'_, OplaContext>
) -> Result<ModelsCollection, String>
    where Result<ModelsCollection, String>: Serialize
{
    fetch_models_collection("https://opla.github.io/models/all.json").await.map_err(|err|
        err.to_string()
    )
}

#[tauri::command]
async fn search_hfhub_models<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    _context: State<'_, OplaContext>,
    query: String
) -> Result<ModelsCollection, String>
    where Result<ModelsCollection, String>: Serialize
{
    search_hf_models(&query).await.map_err(|err| {
        println!("Search HF models error: {:?}", err);
        err.to_string()
    })
}

#[tauri::command]
async fn file_exists<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    file_name: String
) -> Result<bool, String> {
    let mut dir;
    let absolute = Path::new(file_name.as_str()).is_absolute();
    if !absolute {
        dir = get_data_directory()?;
    } else {
        dir = PathBuf::new();
    }
    dir = dir.join(file_name);
    let result = dir.is_file();

    Ok(result)
}

#[tauri::command]
async fn validate_assets<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    assets: Vec<Asset>
) -> Result<Vec<Asset>, String> {
    let assets = assets
        .iter()
        .map(|asset| {
            let mut asset = asset.clone();
            asset.validate();
            asset
        })
        .collect();

    Ok(assets)
}

#[tauri::command]
async fn get_file_asset_extensions<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>
) -> Result<Vec<String>, String> {
    let extensions = Asset::extensions()
        .iter()
        .map(|s| s.to_string())
        .collect();
    Ok(extensions)
}

#[tauri::command]
async fn get_model_full_path<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    path: String,
    filename: String
) -> Result<String, String>
    where Result<ModelsCollection, String>: Serialize
{
    let store = context.store.lock().await;
    let error = format!("Model path not valid: {:?}", filename.clone());
    let result = store.models.get_path(path, Some(filename));
    let path = match result {
        Ok(m) => { m }
        Err(err) => {
            return Err(format!("Model path not found: {:?}", err));
        }
    };
    match path.to_str() {
        Some(str) => {
            return Ok(str.to_string());
        }
        None => {
            return Err(error);
        }
    }
}

#[tauri::command]
async fn install_model<R: Runtime>(
    app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model: Model,
    url: Option<String>,
    path: String,
    file_name: String
) -> Result<String, String> {
    let mut store = context.store.lock().await;
    let was_empty = store.models.items.is_empty();
    let model_name = model.name.clone();
    let file_size = model.get_file_size();
    let sha = model.get_sha();
    let (mut model_entity, model_id) = store.models.create_model(
        model,
        Some("pending".to_string()),
        Some(path.clone()),
        Some(file_name.clone())
    );

    let res = store.models.create_model_path_filename(path, file_name.clone());
    let model_path = match res {
        Ok(m) => { m }
        Err(err) => {
            return Err(format!("Install model error: {:?}", err));
        }
    };
    if was_empty {
        store.set_local_active_model_id(&model_name);
    }

    match url {
        Some(u) => {
            model_entity.state = Some("downloading".to_string());
            store.models.add_model(model_entity);
            store.save().map_err(|err| err.to_string())?;
            drop(store);
            let mut downloader = context.downloader.lock().await;
            downloader.download_file(
                model_id.clone(),
                u,
                model_path,
                file_name.as_str(),
                sha,
                file_size,
                app
            );
        }
        None => {
            model_entity.state = Some("ok".to_string());
            store.models.add_model(model_entity);
            store.save().map_err(|err| err.to_string())?;
            drop(store);
            if was_empty && url.is_none() {
                let res = start_server(app, context).await;
                match res {
                    Ok(_) => {}
                    Err(err) => {
                        return Err(format!("Install model error: {:?}", err));
                    }
                }
            }
        }
    }

    Ok(model_id.clone())
}

#[tauri::command]
async fn cancel_download_model<R: Runtime>(
    app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model_name_or_id: String
) -> Result<(), String> {
    let mut store = context.store.lock().await;
    println!("Cancel download model: {:?}", model_name_or_id);
    let mut downloader = context.downloader.lock().await;
    downloader.cancel_download(&model_name_or_id, &app);

    let model = store.models.get_model(model_name_or_id.as_str());
    println!("Cancel download model: {:?}", model);
    match model {
        Some(m) => {
            store.models.remove_model(model_name_or_id.as_str(), false);
            store.clear_active_service_if_model_equal(m.id.clone());
            store.save().map_err(|err| err.to_string())?;
            drop(store);

            let mut server = context.server.lock().await;
            match &server.parameters {
                Some(p) => {
                    if m.is_some_id_or_name(&p.model_id) {
                        let _res = server.stop(&app).await;
                    }
                }
                None => {}
            };
        }
        None => {
            return Err(format!("Model not found: {:?}", model_name_or_id));
        }
    }

    Ok(())
}

#[tauri::command]
async fn update_model<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model: Model
) -> Result<(), String> {
    let mut store = context.store.lock().await;

    store.models.update_model(model);

    store.save().map_err(|err| err.to_string())?;

    Ok(())
}

#[tauri::command]
async fn update_model_entity<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model: Model,
    entity: ModelEntity
) -> Result<(), String> {
    let mut store = context.store.lock().await;

    store.models.update_model_entity(&entity);
    store.models.update_model(model);
    store.save().map_err(|err| err.to_string())?;

    Ok(())
}

#[tauri::command]
async fn uninstall_model<R: Runtime>(
    app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model_id: String,
    in_use: bool
) -> Result<(), String> {
    let mut store = context.store.lock().await;

    println!("Uninstall model: {:?} {:?}", model_id, in_use);

    match store.models.remove_model(model_id.as_str(), in_use) {
        Some(model) => {
            store.clear_active_service_if_model_equal(model.reference.id.clone());
            let mut server = context.server.lock().await;
            match &server.parameters {
                Some(p) => {
                    if model.reference.is_some_id_or_name(&p.model_id) {
                        let _res = server.stop(&app).await;
                        server.remove_model();
                    }
                }
                None => {}
            };
        }
        None => {
            return Err(format!("Model not found: {:?}", model_id));
        }
    }

    store.save().map_err(|err| err.to_string())?;

    Ok(())
}

#[tauri::command]
async fn set_active_model<R: Runtime>(
    _app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model_id: String,
    provider: Option<String>
) -> Result<(), String> {
    let mut store = context.store.lock().await;
    let result = store.models.get_model(model_id.as_str());
    if result.is_none() && (provider.is_none() || provider.as_deref() == Some("Opla")) {
        return Err(format!("Model not found: {:?}", model_id));
    } else if provider.is_some() {
        store.set_active_service(&model_id, &provider.unwrap_or("Opla".to_string()));
    } else {
        store.set_local_active_model_id(&model_id);
    }
    store.save().map_err(|err| err.to_string())?;
    Ok(())
}

#[tauri::command]
async fn llm_call_completion<R: Runtime>(
    app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model: String,
    llm_provider: Option<Provider>,
    query: LlmQuery<LlmQueryCompletion>,
    completion_options: Option<LlmCompletionOptions>
) -> Result<(), String> {
    let mut manager = context.providers_manager.lock().await;
    manager.llm_call_completion::<R>(app, &model, llm_provider, query, completion_options).await
}

#[tauri::command]
async fn llm_cancel_completion<R: Runtime>(
    app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    llm_provider: Option<Provider>,
    conversation_id: String,
    message_id: String,
) -> Result<(), String> {
    let mut manager = context.providers_manager.lock().await;
    manager.llm_cancel_completion::<R>(app, llm_provider, &conversation_id, &message_id).await
}

#[tauri::command]
async fn llm_call_tokenize<R: Runtime>(
    app: tauri::AppHandle<R>,
    _window: tauri::Window<R>,
    context: State<'_, OplaContext>,
    model: String,
    provider: Provider,
    text: String
) -> Result<LlmTokenizeResponse, String> {
    let mut manager = context.providers_manager.lock().await;
    manager.llm_call_tokenize::<R>(app, model, provider, text).await
}

async fn start_server<R: Runtime>(
    app: tauri::AppHandle<R>,
    context: State<'_, OplaContext>
) -> Result<(), String> {
    println!("Opla try to start server");
    let mut store = context.store.lock().await;

    let local_active_model_id = store.get_local_active_model_id();
    let active_model = match local_active_model_id {
        Some(m) => { m }
        None => {
            return Err(format!("Opla server not started default model not set"));
        }
    };
    let model_path = match store.models.get_model_path(active_model.clone()) {
        Ok(m) => { m }
        Err(err) => {
            return Err(format!("Opla server not started model path not found: {:?}", err));
        }
    };
    let mut parameters = store.server.parameters.clone();
    let mut server = context.server.lock().await;
    parameters.model_id = Some(active_model.clone());
    parameters.model_path = Some(model_path.clone());
    let response = server.start(app, &parameters).await;
    if response.is_err() {
        return Err(format!("Opla server not started: {:?}", response));
    }

    store.server.parameters = parameters;
    store.save().map_err(|err| err.to_string())?;
    println!("Opla server started: {:?}", response);
    Ok(())
}

async fn model_download_event<R: Runtime>(
    app: tauri::AppHandle<R>,
    model_id: String,
    state: String
) -> Result<(), String> {
    let handle = app.app_handle();
    let context = app.state::<OplaContext>();
    let mut store = context.store.lock().await;
    let model = store.models.get_model_entity(model_id.as_str());
    match model {
        Some(mut m) => {
            m.state = Some(state.clone());
            store.models.update_model_entity(&m);
            store.save().map_err(|err| err.to_string())?;
            drop(store);
            // println!("model_download {} {}", state, model_id);
            let server = context.server.lock().await;
            let parameters = match &server.parameters {
                Some(p) => p,
                None => {
                    return Err(format!("Model download no parameters found"));
                }
            };

            if
                state == "ok" &&
                (m.reference.is_some_id_or_name(&parameters.model_id) ||
                    parameters.model_id.is_none())
            {
                drop(server);
                let res = start_server(handle, context).await;
                match res {
                    Ok(_) => {}
                    Err(err) => {
                        return Err(format!("Model download start server error: {:?}", err));
                    }
                }
            }
        }
        None => {
            return Err(format!("Model not found: {:?}", model_id));
        }
    }
    Ok(())
}

async fn window_setup<EventLoopMessage>(app: &mut tauri::AppHandle) -> Result<(), String> {
    let context = app.state::<OplaContext>();
    let window = app.get_window("main").ok_or("Opla failed to get window")?;
    let store = context.store.lock().await;
    // TODO fix window size
    // Instead used https://github.com/tauri-apps/tauri-plugin-window-state
    // but not optimal...
    match &store.settings.window {
        Some(w) => {
            window.set_fullscreen(w.fullscreen).map_err(|err| err.to_string())?;
            println!("Window size: {:?}", w);
            /* window
                .set_size(Size::Physical(PhysicalSize { width: w.width, height: w.height }))
                .map_err(|err| err.to_string())?; */
        }
        None => {}
    }

    /* let window_clone = Arc::new(Mutex::new(window.clone()));
    window.clone().on_window_event(move |event| {
        if let WindowEvent::CloseRequested { .. } | WindowEvent::Destroyed { .. } = event {
            println!("Window closed");
            let win = match window_clone.lock() {
                Ok(w) => { w }
                Err(err) => {
                    println!("{}", err.to_string());
                    return;
                }
            };
            let app = win.app_handle();
            let context = app.state::<OplaContext>(); // Use app_arc instead of app
            let mut store = match context.store.lock() {
                Ok(s) => { s }
                Err(err) => {
                    println!("{}", err.to_string());
                    return;
                }
            };
            let size = win.inner_size().unwrap_or(PhysicalSize { width: 800, height: 600 });
            store.settings.window = Some(WindowSettings {
                fullscreen: window.is_fullscreen().unwrap_or(false),
                width: size.width,
                height: size.height,
            });
            match store.save() {
                Ok(_) => {}
                Err(err) => {
                    println!("{}", err.to_string());
                    return;
                }
            }
        }
    });*/
    Ok(())
}

fn handle_download_event<EventLoopMessage>(app: &tauri::AppHandle, payload: &str) {
    let vec: Vec<&str> = payload.split(':').collect();
    let (state, id) = (vec[0].to_string(), vec[1].to_string());

    let handler = app.app_handle();
    spawn(async move {
        let handler = handler.app_handle();
        match model_download_event(handler, id.to_string(), state.to_string()).await {
            Ok(_) => {}
            Err(err) => {
                println!("Model downloaded error: {:?}", err);
            }
        }
    });
}

async fn opla_setup(app: &mut tauri::AppHandle) -> Result<(), String> {
    println!("Opla setup: ");
    let context = app.state::<OplaContext>();
    let mut store = context.store.lock().await;
    let resource_path = app.path_resolver().resolve_resource("assets");
    let resource_path = match resource_path {
        Some(r) => { r }
        None => {
            return Err(format!("Opla failed to resolve resource path: {:?}", resource_path));
        }
    };
    store.load(resource_path).map_err(|err| err.to_string())?;

    app
        .emit_all("opla-server", Payload {
            message: "Init Opla backend".into(),
            status: ServerStatus::Init.as_str().to_string(),
        })
        .map_err(|err| err.to_string())?;
    let mut server = context.server.lock().await;
    server.init(store.server.clone());
    let launch_at_startup = store.server.launch_at_startup;
    let active_model = String::from("");
    let local_model_id = store.get_local_active_model_id();
    let (has_model, active_model) = match local_model_id {
        Some(m) => { (store.has_model(m.as_str()), m) }
        None => { (false, active_model) }
    };
    if !has_model && active_model != "" {
        println!("Opla server model not found: {:?}", active_model);
        // Remove default model from server
        server.remove_model();
        store.services.active_service = None;
        store.save().map_err(|err| err.to_string())?;
    }
    drop(store);
    if launch_at_startup && has_model {
        drop(server);
        app
            .emit_all("opla-server", Payload {
                message: "Opla server is waiting to start".into(),
                status: ServerStatus::Wait.as_str().to_string(),
            })
            .map_err(|err| err.to_string())?;
        let res = start_server(app.app_handle(), app.state::<OplaContext>()).await;
        match res {
            Ok(_) => {}
            Err(err) => {
                let mut server = context.server.lock().await;
                server.set_status(ServerStatus::Error).map(|_| "Failed to set server status")?;
                app
                    .emit_all("opla-server", Payload {
                        message: err.clone(),
                        status: ServerStatus::Error.as_str().to_string(),
                    })
                    .map_err(|err| err.to_string())?;
            }
        }
    } else {
        server.set_status(ServerStatus::Stopped).map(|_| "Failed to set server status")?;
        app
            .emit_all("opla-server", Payload {
                message: "Not started Opla backend".into(),
                status: ServerStatus::Stopped.as_str().to_string(),
            })
            .map_err(|err| err.to_string())?;
    }

    Ok(())
}

async fn core(app: &mut tauri::AppHandle) {
    let mut error = None;
    match opla_setup(app).await {
        Ok(_) => {}
        Err(err) => {
            println!("Opla setup error: {:?}", err);
            error = Some(err);
        }
    }

    if error.is_none() {
        match window_setup::<EventLoopMessage>(app).await {
            Ok(_) => {}
            Err(err) => {
                println!("Window setup error: {:?}", err);
                error = Some(err);
            }
        }
    }
    if !error.is_some() {
                println!("Opla setup done");
                let handle = app.app_handle();
                let _id = app.listen_global("opla-downloader", move |event| {
                    let payload = match event.payload() {
                        Some(p) => { p }
                        None => {
                            return;
                        }
                    };
                    // println!("download event {}", payload);
                    handle_download_event::<EventLoopMessage>(&handle, payload);
                });
            }

}

fn main() {

    let downloader = Mutex::new(Downloader::new());
    let context: OplaContext = OplaContext {
        server: Arc::new(Mutex::new(LocalServer::new())),
        providers_manager: Arc::new(Mutex::new(ProvidersManager::new())),
        store: Mutex::new(Store::new()),
        downloader: downloader,
        sys: Mutex::new(Sys::new()),
    };
    tauri::Builder
        ::default()
        .manage(context)
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(move |app| {
            // only include this code on debug builds
            #[cfg(debug_assertions)]
            {
                match app.get_window("main") {
                    Some(window) => {
                        window.open_devtools();
                    }
                    None => {
                        return Err("Opla failed to get window".into());
                    }
                }
            }

            let mut handle = app.handle();
            tauri::async_runtime::block_on(async {
                core(&mut handle).await;
            });

            
            Ok(())
        })
        .invoke_handler(
            tauri::generate_handler![
                get_sys,
                get_opla_configuration,
                save_settings,
                get_config_path,
                get_data_path,
                get_models_path,
                create_dir,
                file_exists,
                get_file_asset_extensions,
                validate_assets,
                get_provider_template,
                get_opla_server_status,
                start_opla_server,
                stop_opla_server,
                get_models_collection,
                search_hfhub_models,
                get_model_full_path,
                install_model,
                cancel_download_model,
                uninstall_model,
                update_model,
                update_model_entity,
                set_active_model,
                get_assistants_collection,
                llm_call_completion,
                llm_cancel_completion,
                llm_call_tokenize
            ]
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
