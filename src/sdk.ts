export interface CheckoutConfig {
  productId: string;
  onSuccess: (data: { sessionId: string }) => void;
  onClose: (data: { reason: string }) => void;
  onError: (data: { code: string; message: string }) => void;
}

class DodoCheckoutSDK {
  private iframe: HTMLIFrameElement | null = null;
  private config: CheckoutConfig | null = null;
  private messageListener: ((event: MessageEvent) => void) | null = null;

  open(config: CheckoutConfig) {
    if (this.iframe) {
      console.warn('DodoCheckout is already open');
      return;
    }

    this.config = config;

    // Create the iframe
    const iframe = document.createElement('iframe');
    // In production, here the exact URL will be used.
    const checkoutUrl = new URL('/checkout.html', window.location.href);
    checkoutUrl.searchParams.set('productId', config.productId);

    iframe.src = checkoutUrl.toString();
    iframe.style.position = 'fixed';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '100vw';
    iframe.style.height = '100vh';
    iframe.style.border = 'none';
    iframe.style.zIndex = '999999';
    iframe.style.backgroundColor = 'transparent';
    iframe.allow = 'payment'; // Required for some payment APIs if used in future

    this.iframe = iframe;
    document.body.appendChild(iframe);

    // Set up message listener
    this.messageListener = this.handleMessage.bind(this);
    window.addEventListener('message', this.messageListener);
  }

  private close(reason: string) {
    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
    }
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = null;
    }
    if (this.config) {
      this.config.onClose({ reason });
      this.config = null;
    }
  }

  private handleMessage(event: MessageEvent) {
    const data = event.data;
    if (!data || data.source !== 'dodo-checkout') return;

    if (!this.config) return;

    switch (data.type) {
      case 'SUCCESS':
        this.config.onSuccess({ sessionId: data.payload.sessionId });
        this.close('completed'); // Automatically close on success
        break;
      case 'ERROR':
        this.config.onError({ code: data.payload.code, message: data.payload.message });
        break;
      case 'CLOSE':
        this.close(data.payload.reason || 'user_closed');
        break;
    }
  }
}

// Expose globally
const DodoCheckout = new DodoCheckoutSDK();
(window as any).DodoCheckout = DodoCheckout;

export default DodoCheckout;
