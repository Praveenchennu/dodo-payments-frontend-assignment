# Dodo Payments - Embedded Checkout

This is a complete implementation of the Dodo Payments Tiny Embeddable Checkout assignment.

## How to run

1. Ensure you have Node.js installed.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open the provided local URL (usually `http://localhost:5173`) in your browser to see the Demo Store.

## Architecture: How the pieces talk to each other

The solution consists of three main parts communicating securely:

1. **The SDK (`sdk.ts`)**: This is the script the merchant includes. When `DodoCheckout.open()` is called, it injects a full-screen, transparent `<iframe>` into the host page. The `src` of this iframe points to our secure checkout application.
2. **The Checkout App (`CheckoutApp.tsx`)**: This runs entirely *inside* the iframe. It is a separate secure origin. When the user types their credit card, the host page (the merchant) has zero access to the DOM of the iframe, meaning the card details never touch the host page.
3. **The Communication Layer (`postMessage`)**: The Checkout App and the SDK communicate via the browser's `window.postMessage` API. 
   - When the payment succeeds, the React app calls `window.parent.postMessage({ type: 'SUCCESS', ... })`.
   - The SDK listens for `message` events on the `window` object, intercepts our specific messages, and fires the appropriate callbacks (`onSuccess`, `onError`, `onClose`) before cleaning up the iframe.

## Decisions I went back and forth on

**1. Iframe injection method vs. Popup Window**
I debated whether to open the checkout in a new popup window (`window.open`) or inject an iframe over the current page. I chose the iframe approach because the prompt specifically stated "The customer never leaves the page they were on". A popup technically leaves the context and can be blocked by aggressive ad-blockers. An overlay iframe provides a vastly superior, seamless UX while maintaining strict security boundaries.

**2. Form state management (Controlled vs Uncontrolled)**
For a form this small, using uncontrolled inputs (refs) can be slightly more performant. However, I chose controlled React state (`useState`) because real-time formatting (like adding spaces to the card number as the user types) and complex validation logic are much easier and cleaner to implement with controlled components. The performance overhead is negligible here.

## What I'd explore next

If I had more time, I would focus on:
1. **Security Hardening**: Implement strict origin checking in the `postMessage` listener. Currently, it accepts messages locally, but in production, we MUST verify `event.origin` to prevent malicious iframes from spoofing success messages.
2. **Accessibility (a11y)**: Focus trapping inside the modal so keyboard users don't tab out of the iframe accidentally. Enhance screen reader announcements for the dynamic payment states (loading, error, success).
3. **Advanced Input Formatting**: Use a dedicated library like `cleave.js` or `react-number-format` for foolproof credit card, expiry, and CVC formatting that handles all edge cases (Amex 15 digits vs Visa 16 digits).
