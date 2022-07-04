# @redext/micro

Blazing fast, simple and complete solution for micro frontends

##  Installation

```bash
npm install -s @redext/micro
or
yarn add @redext/micro
```

## Use It

```js
import { registerMicroApp } from '@redext/micro';

registerMicroApp({
      name: 'demo',
      activePath: 'micro',
      container: '#microfrontend',
      entry: 'http://localhost:5000',
      // loadScriptPath: '/root-config.jsx',
      isHash: true,
      // isProduction: true
});
```
