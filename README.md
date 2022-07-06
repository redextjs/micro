# @redext/micro

Blazing fast, simple and complete solution for micro frontends

## Installation

```bash
npm install -s @redext/micro
or
yarn add @redext/micro
```

## Use It

```js
import { registerMicroApp, registerMicroComponent } from '@redext/micro';

registerMicroApp({
  orgName: '@redext-micro', // option
  name: 'demo',
  activePath: 'micro',
  container: '#microfrontend',
  entry: 'http://localhost:5000',
  // loadScriptPath: '/root-config.jsx',
  isHash: true,
  // isProduction: true
});

registerMicroComponent({
  orgName: '@redext-micro', // option
  name: 'component',
  activePath: 'micro',
  container: '#microfrontend',
  entry: 'http://localhost:5000',
  // loadScriptPath: '/root-config.jsx',
  isHash: true,
  // isProduction: true
});
```
