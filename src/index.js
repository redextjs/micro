import {
  registerApplication,
  unregisterApplication,
  start as startSingleSpa,
  getMountedApps,
  getAppStatus
} from 'single-spa';
import loadScript from './loadScript';
import packageJson from '../package';

const noop = () => {
};

const removeAllChildNodes = (parent) => {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
};

const getContainerElement = (container) => {
  if (!container) {
    throw 'registerMicroApp config container required'
  }

  return typeof container === 'string' ? document.querySelector(container) : container
};

export const start = (config) => {
  startSingleSpa(config)
};

export const getRootId = (appName) => {
  return appName.replace('@', '')
};

export const getElementApp = (documentTarget, rootId) => {
  return documentTarget.getElementById ? documentTarget.getElementById(rootId) : documentTarget.querySelector(`[id="${rootId}"]`)
};

// const lifeCyclesProxy = new Proxy({}, {
//   get: (a, prop) => {
//     return a[prop]
//   },
//   set: (a, prop, value) => {
//     a[prop] = value;
//   }
// });

const lifeCyclesProxy = {};

export const registerMicroApp = (config = {}) => {
  const {
    name,
    activePath,
    container,
    props = {},
    componentProps = {},
    orgName = '@redext-micro',
    isComponent,
    isProduction,
    isSplash = true,
    isDebug,
    isDebugSplash,
    microWorker,
    redirectTo,
    staticPath,
    splashConfig = {},
    rootConfigScriptId = 'micro-root-config',
    isUnRegister,
    isAlive,
    isCustomElements,
    isShadowRoot,
    fetch = window.fetch,
    plugins = [],
    ...appConfig
  } = config;

  const appName = orgName ? `${orgName}/${name}` : name;

  const mountedApps = getMountedApps();

  const appStatus = getAppStatus(appName);

  // console.log('appStatus', appStatus);
  // console.log('getMountedApps', getMountedApps());

  const hasRegisterApp = !mountedApps.includes(appName) && !appStatus;

  let isHash = config.isHash;
  let activeWhen;

  if (typeof activePath === 'function') {
    activeWhen = (location) => activePath({ location, isHash, isProduction })
  } else {
    activeWhen = activePath;

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
  }

  const activePathFull = typeof activeWhen === 'function' ? activeWhen(window.location) : activeWhen.replace('/#', '');

  const microState = {
    name: appName,
    isHash,
    version: packageJson.version,
    activePath: activePathFull,
    redirectTo,
    staticPath,
    container,
    isShadowRoot
  };

  // console.log('hasRegisterApp', hasRegisterApp);

  const customProps = {
    ...props,
    ...microState
  };

  if (microWorker) {
    customProps.microWorker = microWorker
  }

  const insertTemplateToElement = ({ containerElement, template, config = {} }) => {
    const { isShadowRoot } = config;

    containerElement.setAttribute('data-name', `${appName}:container`);
    containerElement.setAttribute('data-version', packageJson.version);
    containerElement.setAttribute('data-active-path', activePathFull);

    // console.log('containerElement', containerElement);

    let scriptState;

    if (!isComponent) {
      scriptState = `<script id="__REDEXT_MICRO_STATE__" data-name=${appName}:state type="application/json">${JSON.stringify(microState)}</script>`;
    }

    if (scriptState && !isShadowRoot) {
      template += `\n${scriptState}`
    }

    let portalId;

    if (isShadowRoot) {
      portalId = `${getRootId(appName)}:portal`;

      template += `<div id="${portalId}"></div>`;
    }

    const tmpl = document.createElement('template');

    tmpl.innerHTML = template;

    const templateContent = tmpl.content.cloneNode(true);

    if (isShadowRoot) {
      const shadowRoot = containerElement.attachShadow({ mode: 'open' });

      shadowRoot.appendChild(templateContent);

      if (portalId) {
        const script = document.createElement('script');

        script.type = 'text/javascript';

        const getPortalElement = () => {
          const containerElement = document.querySelector(`[data-name="${appName}:container"]`);

          return containerElement.shadowRoot.querySelector(`[id="${portalId}"]`);
        }

        const observerCallback = (mutationList, observer) => {
          const mutationRecord = mutationList.find(mutation => mutation.attributeName === 'style');

          if (mutationRecord) {
            const style = mutationRecord.target.style;

            document.body.style.overflow = style.overflow;
          }
        }

        const observerConnect = `observer.observe(element, { attributes: true });`

        const code = `const appName = ${JSON.stringify(appName)}; \n const portalId = ${JSON.stringify(portalId)}; \n const observer = new MutationObserver(${observerCallback.toString()}); \n const getPortalElement = ${getPortalElement.toString()}; \n const element = getPortalElement(); \n ${observerConnect}`;

        script.appendChild(document.createTextNode(code));

        shadowRoot.appendChild(script);
      }

      containerElement.innerHTML = scriptState;
    } else {
      containerElement.innerHTML = '';
      containerElement.appendChild(templateContent);
    }
  }

  const containerElement = getContainerElement(container);

  if (!containerElement) {
    throw 'containerElement not exist'
  }

  if (hasRegisterApp) {
    registerApplication({
      name: appName,
      activeWhen,
      customProps,
      app: async () => {
        let { entry, loadScriptPath, splashElement } = appConfig;

        if (entry.endsWith('/')) {
          const lastIndex = entry.lastIndexOf('/');

          entry = entry.substring(0, lastIndex)
        }

        if (!loadScriptPath) {
          loadScriptPath = isProduction ? '/root-config.js' : '/root-config.jsx'
        }

        let loadScriptUrl;
        let template;
        let appVersion;
        lifeCyclesProxy[appName] = {};

        if (isComponent) {
          const rootId = getRootId(appName);

          template = `<div id="${rootId}">Loading</div>`
        } else {
          if (isSplash) {
            if (!splashElement) {
              const { splashStyle = {}, logoUrl, logoStyle = {} } = splashConfig;

              splashElement = document.createElement('div');

              splashElement.style.position = 'absolute';
              splashElement.style.width = '100%';
              splashElement.style.height = '100%';
              splashElement.style.zIndex = '9999';
              splashElement.style.display = 'flex';
              splashElement.style.alignItems = 'center';
              splashElement.style.justifyContent = 'center';

              Object.keys(splashStyle).forEach((key) => {
                splashElement.style[key] = splashStyle[key];
              });

              splashElement.id = splashConfig?.id || 'redext-micro-splash';

              if (logoUrl) {
                const logoElement = document.createElement('img');

                logoElement.src = logoUrl;
                logoElement.alt = 'logo-splash';

                Object.keys(logoStyle).forEach((key) => {
                  logoElement.style[key] = logoStyle[key];
                });

                if (!logoStyle.height) {
                  logoElement.style.height = '64px';
                }

                splashElement.appendChild(logoElement);
              } else {
                splashElement.innerHTML = 'Loading';
              }
            }

            containerElement.append(splashElement);

            if (isDebugSplash) {
              throw 'Debug splash'
            }
          }

          const response = await fetch(entry);

          template = await response.text();

          const domparser = new DOMParser();
          const doc = domparser.parseFromString(template, 'text/html');

          let rootConfigScript;

          if (rootConfigScriptId) {
            rootConfigScript = doc.querySelector(`script[id="${rootConfigScriptId}"]`)
          }

          if (rootConfigScript) {
            const scriptSrc = rootConfigScript.getAttribute('src');
            const regexUrl = /^((http|https):\/\/)([A-z0-9]+)/;

            if (scriptSrc && regexUrl.test(scriptSrc)) {
              loadScriptUrl = rootConfigScript.src;
            }
          }

          if (!rootConfigScript) {
            rootConfigScript = doc.querySelector(`script[src*="${loadScriptPath}"]`);
          }

          if (rootConfigScript) {
            appVersion = rootConfigScript.getAttribute('data-app-version');

            if (!appVersion) {
              const metaAppVersion = doc.querySelector(`meta[name="redext-micro-app-version"]`);

              appVersion = metaAppVersion && metaAppVersion.content;
            }

            if (!appVersion) {
              console.warn('registerMicroApp warning: Please add attribute data-app-version in script tag avoid browser cache');
            }
          }

          if (isSplash) {
            const rootId = getRootId(appName);
            const rootElement = doc.querySelector(`div[id="${rootId}"]`);
            rootElement.innerHTML = splashElement.outerHTML;

            if (rootConfigScript) {
              rootConfigScript.remove();
            }

            template = `${doc.head.outerHTML}\n${doc.body.innerHTML}`;
          }
        }

        lifeCyclesProxy[appName].template = template;

        insertTemplateToElement({ containerElement, template, config });

        let lifeCycles;

        if (loadScriptPath && !loadScriptUrl) {
          if (typeof loadScriptPath === 'string' && !loadScriptPath.startsWith('/')) {
            loadScriptPath = `/${loadScriptPath}`;
          }

          loadScriptUrl = `${entry}${loadScriptPath === true ? '/root-config.js' : loadScriptPath}`
        }

        if (loadScriptUrl) {
          if (appVersion) {
            loadScriptUrl += `?v=${appVersion}`
          }

          // console.log('loadScriptUrl', loadScriptUrl)

          lifeCycles = await loadScript({
            isModule: true,
            url: loadScriptUrl,
            sdkGlobal: appName
          });
        }

        // console.log('lifeCycles', lifeCycles);

        if (typeof lifeCycles === 'function') {
          const rootId = getRootId(appName)

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

        if (isDebug) {
          throw 'Debug MicroApp'
        }

        const newLifeCycles = {
          ...lifeCycles
        }

        if (isUnRegister) {
          newLifeCycles.unmount = [
            async () => {
              await unregisterApplication(appName);

              containerElement.remove();
            },
            lifeCycles?.unmount
          ]
        }

        lifeCyclesProxy[appName] = {
          ...lifeCyclesProxy[appName],
          ...newLifeCycles
        };

        return newLifeCycles
      }
    });
  } else {
    const rootId = getRootId(appName);

    let rootElement;

    if (isShadowRoot) {
      const shadowRoot = containerElement.shadowRoot;

      if (shadowRoot) {
        rootElement = getElementApp(shadowRoot, rootId);
      }
    } else {
      rootElement = getElementApp(containerElement, rootId);
    }

    const hasReMount = !(rootElement && rootElement.hasChildNodes());

    if (hasReMount) {
      const lifeCycles = lifeCyclesProxy[appName];

      if (lifeCycles) {
        // console.log('lifeCycles', appName, lifeCycles);

        insertTemplateToElement({ containerElement, template: lifeCycles.template, config });

        const reMount = lifeCycles?.update || lifeCycles?.mount;

        reMount({
          name: appName,
          ...customProps
        })
      }
    }
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
