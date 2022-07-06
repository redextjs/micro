import {
  registerApplication,
  unregisterApplication,
  start as startSingleSpa,
  getMountedApps,
  getAppStatus
} from 'single-spa';
import loadScript from './loadScript';
import packageJson from '../package';

const getContainerElement = (container) => {
  if (!container) {
    throw 'registerMicroApp config container required'
  }

  return typeof container === 'string' ? document.querySelector(container) : container
};

export const start = (config) => {
  startSingleSpa(config)
};

export const registerMicroApp = (config = {}) => {
  const {
    name,
    activePath,
    props = {},
    componentProps = {},
    orgName = '@redext-micro',
    isComponent,
    isProduction,
    microWorker,
    ...appConfig
  } = config;

  const appName = orgName ? `${orgName}/${name}` : name;

  let isHash = config.isHash;
  let activeWhen = activePath;

  if (isHash && !activePath.startsWith('/#/')) {
    if (activePath.startsWith('/')) {
      activeWhen = `/#${activePath}`
    } else {
      activeWhen = `/#/${activePath}`
    }
  }

  if (activePath.startsWith('/#/')) {
    isHash = true
  }

  const activePathFull = activeWhen.replace('/#', '');

  const microState = {
    name: appName,
    isHash,
    version: packageJson.version,
    activePath: activePathFull
  };

  const mountedApps = getMountedApps();

  const appStatus = getAppStatus(appName);

  // console.log('appStatus', appStatus);
  // console.log('getMountedApps', getMountedApps());

  const hasRegisterApp = !mountedApps.includes(appName) && !appStatus;

  // console.log('hasRegisterApp', hasRegisterApp);

  const customProps = {
    ...props,
    ...microState
  };

  if (microWorker) {
    customProps.microWorker = microWorker
  }

  if (hasRegisterApp) {
    registerApplication({
      name: appName,
      activeWhen,
      customProps,
      app: async () => {
        const { container } = appConfig;
        let entry = appConfig.entry;
        let loadScriptPath = appConfig.loadScriptPath;

        if (entry.endsWith('/')) {
          const lastIndex = entry.lastIndexOf('/');

          entry = entry.substring(0, lastIndex)
        }

        let template;

        if (isComponent) {
          const rootId = appName.replace('@', '')

          template = `<div id="${rootId}">Loading</div>`
        } else {
          const response = await fetch(entry);

          template = await response.text();
        }

        const containerElement = getContainerElement(container);

        if (!containerElement) {
          throw 'containerElement not exist'
        }

        containerElement.setAttribute('data-name', appName);
        containerElement.setAttribute('data-version', packageJson.version);
        containerElement.setAttribute('data-active-path', activePathFull);

        let scriptState;

        if (!isComponent) {
          scriptState = `<script id="__REDEXT_MICRO_STATE__" data-name=${appName} type="application/json">${JSON.stringify(microState)}</script>`;
        }

        if (scriptState) {
          template += `\n${scriptState}`
        }

        containerElement.innerHTML = template;

        // console.log('containerElement', containerElement);

        let lifeCycles;

        if (!loadScriptPath) {
          loadScriptPath = isProduction ? '/root-config.js' : '/root-config.jsx'
        }

        if (loadScriptPath) {
          if (typeof loadScriptPath === 'string' && !loadScriptPath.startsWith('/')) {
            loadScriptPath = `/${loadScriptPath}`;
          }

          lifeCycles = await loadScript({
            isModule: true,
            url: `${entry}${loadScriptPath === true ? '/root-config.js' : loadScriptPath}`,
            sdkGlobal: appName
          });
        }

        // console.log('lifeCycles', lifeCycles);

        if (typeof lifeCycles === 'function') {
          const rootId = appName.replace('@', '')

          lifeCycles = lifeCycles({
            ...customProps,
            componentProps,
            rootId
          })
        }

        if (!lifeCycles) {
          const globalConfig = `(global => { global[__APP_NAME__] = { bootstrap, mount, unmount }; })(window)`;

          throw `Check root-config file code: ${globalConfig}`
        }

        return {
          ...lifeCycles,
          unmount: [
            async () => {
              await unregisterApplication(appName);

              containerElement.remove();
            },
            lifeCycles?.unmount
          ]
        }
      }
    });
  }

  start({ prefetch: true })
};

export const registerMicroComponent = (config = {}) => {
  registerMicroApp({
    ...config,
    isComponent: true
  })
}

export const registerMicroApps = (apps) => {
  apps.forEach(config => registerMicroApp(config))
};
