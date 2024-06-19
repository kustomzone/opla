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

use std::{ fs, path::PathBuf, fmt, collections::HashMap };
use conversation_storage::ConversationStorage;
use serde::{ Deserialize, Serialize };
use tauri::{ AppHandle, Manager };
use crate::{
    data::service::{ Service, ServiceType },
    downloader::Download,
    utils::get_config_directory,
};

use self::model_storage::ModelStorage;
use self::service_storage::ServiceStorage;
use self::workspace_storage::WorkspaceStorage;
use self::server_storage::ServerStorage;

pub mod conversation_storage;
pub mod model_storage;
pub mod service_storage;
pub mod workspace_storage;
pub mod server_storage;
pub mod app_state;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ProviderType {
    #[serde(rename = "opla")]
    Opla,
    #[serde(rename = "server")]
    Server,
    #[serde(rename = "api")]
    Api,
    #[serde(rename = "proxy")]
    Proxy,
}

impl fmt::Display for ProviderType {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            ProviderType::Opla => write!(f, "opla"),
            ProviderType::Server => write!(f, "server"),
            ProviderType::Api => write!(f, "api"),
            ProviderType::Proxy => write!(f, "proxy"),
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ProviderMetadata {
    pub server: Option<ServerStorage>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Provider {
    pub name: String,
    pub r#type: String,
    pub url: String,
    pub description: Option<String>,
    pub doc_url: Option<String>,
    pub key: Option<String>,
    pub disabled: Option<bool>,
    pub metadata: Option<ProviderMetadata>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WindowSettings {
    pub width: u32,
    pub height: u32,
    pub fullscreen: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ExplorerGroup {
    pub title: String,
    pub hidden: bool,
    pub height: f64,
    pub closed: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ViewSettings {
    pub selected_id: Option<String>,
    pub explorer_hidden: bool,
    pub settings_hidden: bool,
    pub explorer_width: f64,
    pub settings_width: f64,
    pub explorer_groups: Option<Vec<ExplorerGroup>>,
    pub scroll_position: Option<u32>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PageSettings {
    #[serde(flatten)]
    pub settings: ViewSettings,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub views: Option<Vec<ViewSettings>>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Settings {
    pub start_app: bool,
    pub welcome_splash: bool,
    pub window: Option<WindowSettings>,
    pub selected_page: Option<String>,
    pub pages: Option<HashMap<String, PageSettings>>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Store {
    pub settings: Settings,
    pub server: ServerStorage,
    pub models: ModelStorage,
    pub downloads: Vec<Download>,
    #[serde(default = "service_default")]
    pub services: ServiceStorage,
    #[serde(default = "workspace_default")]
    pub workspaces: WorkspaceStorage,
    #[serde(skip_serializing, default = "conversation_default")]
    pub conversations: ConversationStorage,
}

fn service_default() -> ServiceStorage {
    ServiceStorage::new()
}

fn workspace_default() -> WorkspaceStorage {
    WorkspaceStorage::new()
}

fn conversation_default() -> ConversationStorage {
    ConversationStorage::new()
}

impl Store {
    pub fn new() -> Self {
        Store {
            settings: Settings {
                start_app: true,
                welcome_splash: true,
                window: None,
                selected_page: None,
                pages: None,
            },
            server: ServerStorage::default(),
            models: ModelStorage {
                path: None,
                items: vec![],
            },
            downloads: vec![],
            services: service_default(),
            workspaces: workspace_default(),
            conversations: conversation_default(),
        }
    }

    pub fn get_selected_project_path(&mut self) -> Result<PathBuf, String> {
        let project = match self.workspaces.get_selected_project() {
            Ok(p) => p,
            Err(error) => {
                println!("Error getting project: {:?}", error);
                return Err(error);
            }
        };
        let project_path = match self.workspaces.get_project_directory(Some(project.path)) {
            Ok(p) => p,
            Err(error) => {
                println!("Error getting project path: {:?}", error);
                return Err(error);
            }
        };
        Ok(project_path)
    }

    pub async fn init(&mut self, app_handle: AppHandle) {
        self.workspaces.init(app_handle.app_handle());
        let project_path = match self.get_selected_project_path() {
            Ok(p) => p,
            Err(_) => {
                return;
            }
        };
        self.conversations.init(app_handle, project_path).await;
    }

    pub fn set(&mut self, new_config: Store) {
        self.settings = new_config.settings.clone();
        self.server = new_config.server.clone();
        self.models = new_config.models.clone();
        self.services = new_config.services.clone();
        self.workspaces = new_config.workspaces.clone();
        self.conversations = new_config.conversations.clone();
    }

    pub fn load(&mut self, asset_dir: PathBuf) -> Result<(), Box<dyn std::error::Error>> {
        let home_dir = get_config_directory()?;
        let config_path = home_dir.join("config.json");

        if config_path.exists() {
            let config_data = fs::read_to_string(config_path)?;
            let config: Store = serde_json::from_str(&config_data)?;
            self.set(config);
        } else {
            let default_config_path = asset_dir.join("opla_default_config.json");
            if default_config_path.exists() {
                let default_config_data = fs::read_to_string(default_config_path)?;
                let default_config: Store = serde_json::from_str(&default_config_data)?;
                println!("default_config: {:?}", default_config);
                self.set(default_config);
            }
        }
        Ok(())
    }

    pub fn save(&self) -> Result<(), Box<dyn std::error::Error>> {
        let home_dir = get_config_directory()?;
        let config_path = home_dir.join("config.json");

        let config_data = serde_json::to_string_pretty(self)?;
        fs::write(config_path, config_data)?;

        Ok(())
    }

    pub fn has_model(&self, model_id_or_name: &str) -> bool {
        self.models.items.iter().any(
            |m|
                m.reference.name == model_id_or_name ||
                (match &m.reference.id {
                    Some(id) => id == model_id_or_name,
                    None => false,
                })
        )
    }

    pub fn set_active_service(&mut self, model_id: &str, provider: &str) {
        let mut service = Service::new(ServiceType::Model);
        service.model_id = Some(model_id.to_owned());
        service.provider_id_or_name = Some(provider.to_owned());
        self.services.active_service = Some(service);
    }

    pub fn set_local_active_model_id(&mut self, model_id: &str) {
        if self.has_model(model_id) {
            self.set_active_service(model_id, "Opla");
        } else {
            println!("Local model not found: {}", model_id);
        }
    }

    pub fn get_local_active_model_id(&mut self) -> Option<String> {
        let model_id = self.services.get_active_model_id();
        let provider = self.services.get_active_provider_id();
        println!(
            "get_local_active_model_id model_id: {:?}, provider: {:?} services: {:?}",
            model_id,
            provider,
            self.services
        );
        if model_id.is_none() && provider.is_none() {
            if self.models.items.len() > 0 {
                let id = match self.models.items[0].reference.id {
                    Some(ref id) => id.clone(),
                    None => {
                        return None;
                    }
                };
                self.set_local_active_model_id(&id);
                return Some(id);
            }
            return None;
        }
        if
            provider == Some("Opla".to_owned()) &&
            model_id.is_some() &&
            self.has_model(model_id.as_ref().unwrap())
        {
            return model_id;
        }
        return None;
    }

    pub fn clear_active_service_if_model_equal(&mut self, model_id: Option<String>) {
        let local_model_id = self.services.get_active_model_id();
        if model_id == local_model_id {
            self.services.active_service = None;
        }
    }

    pub fn save_conversations(&mut self) {
        if let Ok(project_path) = self.get_selected_project_path() {
            if let Err(error) = self.conversations.save_conversations(&project_path) {
                println!("Error saving conversations: {}", error);
            }
        }
    }
}
