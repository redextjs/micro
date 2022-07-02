import loadScript from 'load-script';

const resolves = {};

const loadScriptSDK = ({
  url,
  sdkGlobal,
  sdkReady = null,
  isLoaded = () => true,
  fetchScript = loadScript,
  handleFail = () => {
  },
  isReload,
  isModule,
  fetchOptions = {}
}) => {
  if (!isReload && window[sdkGlobal] && isLoaded(window[sdkGlobal])) {
    return Promise.resolve(window[sdkGlobal])
  }

  return new Promise((resolve, reject) => {
    if (resolves[url]) {
      resolves[url].push(resolve);
      // return
    }

    resolves[url] = [resolve];

    const onLoaded = sdk => {
      resolves[url].forEach(resolve => resolve(sdk))
    };

    if (sdkReady) {
      const previousOnReady = window[sdkReady];

      window[sdkReady] = function () {
        if (previousOnReady) {
          previousOnReady()
        }

        onLoaded(window[sdkGlobal])
      }
    }

    if (isModule) {
      fetchOptions.type = 'module';
    }

    fetchScript(url, fetchOptions, (err, script) => {
      if (err) {
        // console.log('err getSDK', err);

        handleFail();

        reject(err)
      }

      if (!sdkReady) {
        onLoaded(window[sdkGlobal])
      }
    })
  })
};

export default loadScriptSDK
