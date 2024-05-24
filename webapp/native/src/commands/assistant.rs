// Copyright 2024 Mik Bry
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

use tokio::sync::Mutex;
use std::sync::Arc;
use crate::api::assistants::{ fetch_assistants_collection, AssistantsCollection };
use crate::downloader::Downloader;
use crate::providers::ProvidersManager;
use serde::Serialize;
use crate::store::Store;
use crate::local_server::*;
use crate::sys::Sys;
use tauri::{ Runtime, State };


pub struct OplaContext {
    pub server: Arc<Mutex<LocalServer>>,
    pub providers_manager: Arc<Mutex<ProvidersManager>>,
    pub store: Mutex<Store>,
    pub downloader: Mutex<Downloader>,
    pub sys: Mutex<Sys>,
}

#[tauri::command]
pub async fn get_assistants_collection<R: Runtime>(
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