export class MicroApp extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) {
      return
    }

    const shadowRoot = this.attachShadow({ mode: 'open' });
    const sandbox = {};
    sandbox.shadowRoot = shadowRoot;
  }

  disconnectedCallback() {
    const sandbox = {};
    sandbox?.unmount();
  }
}

export const defineMicroApp = () => {
  if (!customElements.get('redext-micro-app')) {
    customElements.define('redext-micro-app', MicroApp);
  }
}

export default MicroApp
