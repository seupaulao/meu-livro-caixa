// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Adiciona .wasm às extensões de assets
config.resolver.assetExts.push('wasm');

module.exports = config;