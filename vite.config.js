const { loadEnv } = require('vite');
const path = require('path');

module.exports = ({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd()));

  return {
    resolve: {
      alias: {
        'src': path.resolve(__dirname, './src')
      }
    },
    base: './',
    build: {
      minify: true,
      rollupOptions: {
        input: './src',
        output: {
          format: 'cjs',
          entryFileNames: 'index.js',
          assetFileNames: 'assets/[name].[ext]'
        },
        preserveEntrySignatures: true,
        external: ['single-spa', 'load-script']
      }
    },
    optimizeDeps: {
      esbuildOptions: {
        keepNames: true
      }
    },
    define: {
      'process.env': process.env
    }
  }
};
