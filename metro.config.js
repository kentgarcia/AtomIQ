// Metro configuration for Expo.
// expo-sqlite's web implementation loads a WebAssembly build of SQLite, so
// `.wasm` files must be treated as assets by the bundler.
// https://docs.expo.dev/versions/latest/sdk/sqlite/#web-setup
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

if (!config.resolver.assetExts.includes("wasm")) {
  config.resolver.assetExts.push("wasm");
}

// dotLottie animations (assets/lottie/*.lottie) are bundled as assets and played by lottie-react-native
if (!config.resolver.assetExts.includes("lottie")) {
  config.resolver.assetExts.push("lottie");
}

module.exports = config;
