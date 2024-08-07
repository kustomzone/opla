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

use std::str::FromStr;

use chrono::{ DateTime, Utc };
use serde::{ Deserialize, Serialize };
use void::Void;

use super::{
    date_format,
    option_string_or_struct,
    is_false,
    asset::Asset,
    message::Message,
    service::Service,
    Metadata,
    Preset,
};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub enum PromptTokenType {
    #[serde(rename = "text")]
    Text,
    #[serde(rename = "newline")]
    Newline,
    #[serde(rename = "mention")]
    Mention,
    #[serde(rename = "hashtag")]
    Hashtag,
    #[serde(rename = "action")]
    Action,
    #[serde(rename = "parameterValue")]
    ParameterValue,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub enum PromptTokenState {
    #[serde(rename = "ok")]
    Ok,
    #[serde(rename = "error")]
    Error,
    #[serde(rename = "editing")]
    Editing,
    #[serde(rename = "disabled")]
    Disabled,
    #[serde(rename = "duplicate")]
    Duplicate,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct PromptToken {
    r#type: PromptTokenType,
    value: String,
    index: u32,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    state: Option<PromptTokenState>,
    #[serde(skip_serializing_if = "is_false", alias = "blockOtherCommands", default)]
    block_other_commands: bool,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ParsedPrompt {
    pub raw: String,
    pub text: String,
    #[serde(alias = "caretPosition", default)]
    pub caret_position: u32,
    #[serde(alias = "currentTokenIndex", default)]
    pub current_token_index: u32,
    pub tokens: Vec<PromptToken>,
    #[serde(skip_serializing_if = "is_false", default)]
    pub locked: bool,
    #[serde(skip_serializing_if = "Option::is_none", alias = "tokenCount", default)]
    pub token_count: Option<u32>,
}

impl FromStr for ParsedPrompt {
    type Err = Void;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(Self {
            raw: s.to_string(),
            text: s.to_string(),
            caret_position: 0,
            current_token_index: 0,
            tokens: Vec::new(),
            locked: false,
            token_count: None,
        })
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ConversationUsage {
    #[serde(skip_serializing_if = "Option::is_none", alias = "promptTokens", default)]
    prompt_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none", alias = "completionTokens", default)]
    completion_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none", alias = "totalTokens", default)]
    total_tokens: Option<u32>,

    #[serde(skip_serializing_if = "Option::is_none", alias = "completionMs", default)]
    completion_ms: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none", alias = "promptMs", default)]
    prompt_ms: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none", alias = "totalMs", default)]
    total_ms: Option<u32>,

    #[serde(skip_serializing_if = "Option::is_none", alias = "promptPerSecond", default)]
    prompt_per_second: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none", alias = "completionPerSecond", default)]
    completion_per_second: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none", alias = "totalPerSecond", default)]
    total_per_second: Option<f32>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Conversation {
    pub id: String,
    #[serde(with = "date_format", alias = "createdAt", default)]
    pub created_at: DateTime<Utc>,
    #[serde(with = "date_format", alias = "updatedAt", default)]
    pub updated_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    metadata: Option<Metadata>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub name: Option<String>,

    #[serde(flatten)]
    preset: Option<Preset>,

    #[serde(skip_serializing_if = "Option::is_none", default)]
    messages: Option<Vec<Message>>,

    #[serde(deserialize_with = "option_string_or_struct", skip_serializing_if = "Option::is_none", alias = "currentPrompt", default)]
    current_prompt: Option<ParsedPrompt>,

    #[serde(skip_serializing_if = "Option::is_none", alias = "importedFrom", default)]
    imported_from: Option<String>,

    #[serde(skip_serializing_if = "is_false", default)]
    temp: bool,

    #[serde(skip_serializing_if = "Option::is_none", default)]
    usage: Option<ConversationUsage>,

    #[serde(skip_serializing_if = "Option::is_none", default)]
    assets: Option<Vec<Asset>>,

    #[serde(skip_serializing_if = "Option::is_none", default)]
    services: Option<Vec<Service>>,
}
