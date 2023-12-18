// Copyright 2023 mik
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

use std::{ path::{ Path, PathBuf }, fs };

pub struct Utils {}

impl Utils {
    pub fn get_home_directory() -> Result<PathBuf, String> {
        let home_dir = dirs::home_dir().ok_or("Failed to get home directory")?;
        Ok(home_dir)
    }

    pub fn get_config_directory() -> Result<PathBuf, String> {
        let config_dir = dirs::home_dir().ok_or("Failed to get conf directory")?;
        println!("conf_dir: {}", config_dir.to_str().unwrap());
        let config_dir = config_dir.join("opla");
        if !Path::exists(&config_dir) {
            fs::create_dir(&config_dir).expect("Failed to create conf directory");
        }
        Ok(config_dir)
    }
}
