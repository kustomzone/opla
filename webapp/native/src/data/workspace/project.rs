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

use chrono::{ DateTime, Utc };
use serde::{ self, Deserialize, Serialize };
use serde_with::serde_as;
use uuid::Uuid;

use crate::data::date_format;

#[serde_as]
#[serde_with::skip_serializing_none]
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    #[serde(with = "date_format", default)]
    pub created_at: DateTime<Utc>,
    #[serde(with = "date_format", default)]
    pub updated_at: DateTime<Utc>,
    pub path: String,
    pub workspace_id: String,
}

impl Project {
    pub fn new(name: String, path: String, workspace_id: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name: name,
            description: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            path: path,
            workspace_id,
        }
    }
    pub fn open() {}
}
