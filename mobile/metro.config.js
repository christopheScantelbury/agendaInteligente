// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Resolver para react-native-worklets/plugin
const defaultResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-worklets/plugin') {
    const workletsPluginPath = path.resolve(
      __dirname,
      'node_modules',
      'react-native-worklets-core',
      'plugin.js'
    );
    return {
      filePath: workletsPluginPath,
      type: 'sourceFile',
    };
  }
  // Fallback para o resolver padrão
  if (defaultResolver) {
    return defaultResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
