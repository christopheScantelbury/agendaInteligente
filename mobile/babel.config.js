module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Desabilita reanimated para evitar erro com worklets
          reanimated: false,
        },
      ],
    ],
    plugins: [
      'expo-router/babel',
      // Reanimated desabilitado - se precisar, configure manualmente depois
    ],
  };
};
