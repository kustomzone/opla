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

use std::{ fs::File, io::{ BufReader, Read } };

#[derive(Debug)]
pub enum GGUfMetadataValueType {
    // The value is a 8-bit unsigned integer.
    UInt8 = 0,
    // The value is a 8-bit signed integer.
    Int8 = 1,
    // The value is a 16-bit unsigned little-endian integer.
    UInt16 = 2,
    // The value is a 16-bit signed little-endian integer.
    Int16 = 3,
    // The value is a 32-bit unsigned little-endian integer.
    UInt32 = 4,
    // The value is a 32-bit signed little-endian integer.
    Int32 = 5,
    // The value is a 32-bit IEEE754 floating point number.
    Float32 = 6,
    // The value is a boolean.
    // 1-byte value where 0 is false and 1 is true.
    // Anything else is invalid, and should be treated as either the model being invalid or the reader being buggy.
    Bool = 7,
    // The value is a UTF-8 non-null-terminated string, with length prepended.
    String = 8,
    // The value is an array of other values, with the length and type prepended.
    ///
    // Arrays can be nested, and the length of the array is the number of elements in the array, not the number of bytes.
    Array = 9,
    // The value is a 64-bit unsigned little-endian integer.
    UInt64 = 10,
    // The value is a 64-bit signed little-endian integer.
    Int64 = 11,
    // The value is a 64-bit IEEE754 floating point number.
    Float64 = 12,
}

impl TryFrom<u32> for GGUfMetadataValueType {
    type Error = String;

    fn try_from(item: u32) -> Result<Self, Self::Error> {
        Ok(match item {
            0 => GGUfMetadataValueType::UInt8,
            1 => GGUfMetadataValueType::Int8,
            2 => GGUfMetadataValueType::UInt16,
            3 => GGUfMetadataValueType::Int16,
            4 => GGUfMetadataValueType::UInt32,
            5 => GGUfMetadataValueType::Int32,
            6 => GGUfMetadataValueType::Float32,
            7 => GGUfMetadataValueType::Bool,
            8 => GGUfMetadataValueType::String,
            9 => GGUfMetadataValueType::Array,
            10 => GGUfMetadataValueType::UInt64,
            11 => GGUfMetadataValueType::Int64,
            12 => GGUfMetadataValueType::Float64,
            _ => {
                return Err(format!("invalid gguf metadata type 0x{:x}", item));
            }
        })
    }
}

#[derive(Debug)]
pub enum GGUFMetadataValue {
    Uint8(u8),
    Int8(i8),
    Uint16(u16),
    Int16(i16),
    Uint32(u32),
    Int32(i32),
    Float32(f32),
    Uint64(u64),
    Int64(i64),
    Float64(f64),
    Bool(bool),
    String(String),
    Array(GGUFMetadataArrayValue),
}

#[derive(Debug)]
pub struct GGUFMetadataArrayValue {
    pub value_type: GGUfMetadataValueType,
    pub len: u64,
    pub value: Vec<GGUFMetadataValue>,
}

pub struct GGUFMetadata {
    pub key: String,
    pub value_type: GGUfMetadataValueType,
    pub value: GGUFMetadataValue,
}

pub struct GGUF {
    pub version: u32,
    pub tensor_count: u64,
    pub metadata_kv_count: u64,
    pub metadata_kv: Vec<GGUFMetadata>,
}

impl GGUF {
    pub fn new() -> GGUF {
        GGUF {
            version: 0,
            tensor_count: 0,
            metadata_kv_count: 0,
            metadata_kv: Vec::new(),
        }
    }

    fn parse_metadata_value(
        &mut self,
        reader: &mut BufReader<File>,
        value_type: &GGUfMetadataValueType
    ) -> Result<GGUFMetadataValue, anyhow::Error> {
        match value_type {
            GGUfMetadataValueType::UInt8 => {
                let mut value = [0; 1];
                reader.read_exact(&mut value)?;
                Ok(GGUFMetadataValue::Uint8(value[0]))
            }
            GGUfMetadataValueType::Int8 => {
                let mut value = [0; 1];
                reader.read_exact(&mut value)?;
                Ok(GGUFMetadataValue::Int8(value[0] as i8))
            }
            GGUfMetadataValueType::UInt16 => {
                let mut value = [0; 2];
                reader.read_exact(&mut value)?;
                Ok(GGUFMetadataValue::Uint16(u16::from_le_bytes(value)))
            }
            GGUfMetadataValueType::Int16 => {
                let mut value = [0; 2];
                reader.read_exact(&mut value)?;
                Ok(GGUFMetadataValue::Int16(i16::from_le_bytes(value)))
            }
            GGUfMetadataValueType::UInt32 => {
                let mut value = [0; 4];
                reader.read_exact(&mut value)?;
                Ok(GGUFMetadataValue::Uint32(u32::from_le_bytes(value)))
            }
            GGUfMetadataValueType::Int32 => {
                let mut value = [0; 4];
                reader.read_exact(&mut value)?;
                Ok(GGUFMetadataValue::Int32(i32::from_le_bytes(value)))
            }
            GGUfMetadataValueType::Float32 => {
                let mut value = [0; 4];
                reader.read_exact(&mut value)?;
                Ok(GGUFMetadataValue::Float32(f32::from_le_bytes(value)))
            }
            GGUfMetadataValueType::Bool => {
                let mut value = [0; 1];
                reader.read_exact(&mut value)?;
                Ok(GGUFMetadataValue::Bool(value[0] != 0))
            }
            GGUfMetadataValueType::String => {
                let mut value_length = [0; 8];
                reader.read_exact(&mut value_length)?;
                let length = u64::from_le_bytes(value_length) as usize;

                let mut value = vec![0; length];
                reader.read_exact(&mut value)?;
                let value = String::from_utf8(value)?;
                // println!("String length: {} value: {}", length, value);
                Ok(GGUFMetadataValue::String(value))
            }
            GGUfMetadataValueType::Array => {
                let mut value_type = [0; 4];
                reader.read_exact(&mut value_type)?;
                let value_type = u32::from_le_bytes(value_type);
                let value_type = GGUfMetadataValueType::try_from(value_type).map_err(|err|
                    anyhow::Error::msg(err.to_string())
                )?;

                let mut value_length = [0; 8];
                reader.read_exact(&mut value_length)?;
                let length = u64::from_le_bytes(value_length) as usize;
                // println!("Array length: {} type: {:?}", length, value_type);
                let mut value = Vec::new();
                for _ in 0..length {
                    value.push(self.parse_metadata_value(reader, &value_type)?);
                }

                Ok(
                    GGUFMetadataValue::Array(GGUFMetadataArrayValue {
                        value_type,
                        len: length as u64,
                        value,
                    })
                )
            }
            GGUfMetadataValueType::UInt64 => {
                let mut value = [0; 8];
                reader.read_exact(&mut value)?;
                Ok(GGUFMetadataValue::Uint64(u64::from_le_bytes(value)))
            }
            GGUfMetadataValueType::Int64 => {
                let mut value = [0; 8];
                reader.read_exact(&mut value)?;
                Ok(GGUFMetadataValue::Int64(i64::from_le_bytes(value)))
            }
            GGUfMetadataValueType::Float64 => {
                let mut value = [0; 8];
                reader.read_exact(&mut value)?;
                Ok(GGUFMetadataValue::Float64(f64::from_le_bytes(value)))
            }
        }
    }

    fn parse_metadata_kv(&mut self, reader: &mut BufReader<File>) -> Result<(), anyhow::Error> {
        let mut key_length = [0; 8];
        let mut value_type = [0; 4];
        for _ in 0..self.metadata_kv_count {
            reader.read_exact(&mut key_length)?;
            let length = u64::from_le_bytes(key_length) as usize;

            let mut key = vec![0; length];
            reader.read_exact(&mut key)?;
            let key = String::from_utf8(key)?;

            reader.read_exact(&mut value_type)?;
            let value_type = u32::from_le_bytes(value_type);
            let value_type = GGUfMetadataValueType::try_from(value_type).map_err(|err|
                anyhow::Error::msg(err.to_string())
            )?;

            let value = self.parse_metadata_value(reader, &value_type)?;

            // println!("key: {}, value_type: {:?}, value: {:?}", key, value_type, value);

            self.metadata_kv.push(GGUFMetadata {
                key,
                value,
                value_type,
            });
        }
        Ok(())
    }

    pub fn read(&mut self, path: &str) -> Result<(), String> {
        println!("Reading GGUF file: {}", path);

        let input = File::open(path).map_err(|err| err.to_string())?;
        let mut reader = BufReader::new(input);

        let mut header = [0; 8];
        reader.read_exact(&mut header).map_err(|err| err.to_string())?;

        if header[0] != 0x47 && header[1] != 0x47 && header[2] != 0x55 && header[3] != 0x46 {
            return Err("Not valid GGUF".to_string());
        }

        // Models are little-endian by default.
        self.version = u32::from_le_bytes([header[4], header[5], header[6], header[7]]);
        println!("Version: {}", self.version);

        reader.read_exact(&mut header).map_err(|err| err.to_string())?;

        self.tensor_count = u64::from_le_bytes(header);
        println!("Tensor_count: {}", self.tensor_count);

        reader.read_exact(&mut header).map_err(|err| err.to_string())?;

        self.metadata_kv_count = u64::from_le_bytes(header);
        println!("Metadata_kv_count: {}", self.metadata_kv_count);

        self.parse_metadata_kv(&mut reader).map_err(|err| err.to_string())?;

        Ok(())
    }
}
