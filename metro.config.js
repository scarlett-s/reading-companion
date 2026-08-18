const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite 的 Web 实现（wa-sqlite）需要加载 .wasm 文件
config.resolver.assetExts.push('wasm');

module.exports = config;
