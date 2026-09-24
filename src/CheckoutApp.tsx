import React, { useState, useRef } from 'react';
import { CreditCard, X, ShieldCheck, Check } from 'lucide-react';

const sendToHost = (type: string, payload: any) => {
  window.parent.postMessage({ source: 'dodo-checkout', type, payload }, '*');
};

type PaymentState = 'idle' | 'processing' | 'success' | 'error';

interface FieldErrors {
  email?: string;
  card?: string;
  expiry?: string;
  cvc?: string;
}

export const CheckoutApp: React.FC = () => {
  const [email, setEmail] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [paymentState, setPaymentState] = useState<PaymentState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const retryCount = useRef(0);
  const [isClosing, setIsClosing] = useState(false);

  // Refs for auto-focus
  const expiryRef = useRef<HTMLInputElement>(null);
  const cvcRef = useRef<HTMLInputElement>(null);

  const handleClose = (reason = 'user_closed') => {
    setIsClosing(true);
    setTimeout(() => sendToHost('CLOSE', { reason }), 300);
  };

  //Email validation
  const validateEmail = (value: string): string => {
    if (!value) return 'Email is required.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(value)) return 'Please enter a valid email address (e.g. you@example.com).';
    return '';
  };

  //Card number: digits only, max 16, auto-space
  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(' ') ?? raw;
    setCardNumber(formatted);
    if (raw.length === 16) {
      setFieldErrors(prev => ({ ...prev, card: '' }));
      expiryRef.current?.focus();
    } else if (raw.length > 0) {
      setFieldErrors(prev => ({ ...prev, card: '' }));
    }
  };

  const validateCard = (value: string): string => {
    const raw = value.replace(/\s/g, '');
    if (!raw) return 'Card number is required.';
    if (raw.length < 16) return `Card number must be 16 digits. (${raw.length}/16 entered)`;
    return '';
  };
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '');

    if (raw.length >= 2) {
      const month = parseInt(raw.slice(0, 2), 10);
      if (month < 1) raw = '01' + raw.slice(2);
      if (month > 12) raw = '12' + raw.slice(2);
    }

    let formatted = raw.slice(0, 2);
    if (raw.length > 2) formatted += '/' + raw.slice(2, 4);

    setExpiry(formatted);
    setFieldErrors(prev => ({ ...prev, expiry: '' }));

    if (raw.length === 4) {
      const month = parseInt(raw.slice(0, 2), 10);
      const year = parseInt('20' + raw.slice(2, 4), 10);
      const now = new Date();
      const isExpired = year < now.getFullYear() ||
        (year === now.getFullYear() && month < now.getMonth() + 1);
      if (isExpired) {
        setFieldErrors(prev => ({ ...prev, expiry: 'Your card has expired. Please use a valid card.' }));
      } else {
        cvcRef.current?.focus();
      }
    }
  };

  const validateExpiryAndSet = (value: string): string => {
    const parts = value.split('/');
    if (!value || parts.length < 2 || value.replace('/', '').length < 4) {
      const msg = 'Enter a valid expiry date (MM/YY).';
      setFieldErrors(prev => ({ ...prev, expiry: msg }));
      return msg;
    }
    const month = parseInt(parts[0], 10);
    const year = parseInt('20' + parts[1], 10);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (month < 1 || month > 12) {
      const msg = 'Invalid month. Must be between 01 and 12.';
      setFieldErrors(prev => ({ ...prev, expiry: msg }));
      return msg;
    }
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      const msg = 'Your card has expired. Please use a valid card.';
      setFieldErrors(prev => ({ ...prev, expiry: msg }));
      return msg;
    }
    setFieldErrors(prev => ({ ...prev, expiry: '' }));
    return '';
  };

  const validateExpiry = (value: string): string => {
    return validateExpiryAndSet(value);
  };
  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 3);
    setCvc(raw);
    setFieldErrors(prev => ({ ...prev, cvc: '' }));
  };

  const validateCvc = (value: string): string => {
    if (!value) return 'CVC is required.';
    if (value.length < 3) return 'CVC must be exactly 3 digits.';
    return '';
  };

  //Submit
  const processPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields first
    const errors: FieldErrors = {
      email: validateEmail(email),
      card: validateCard(cardNumber),
      expiry: validateExpiry(expiry),
      cvc: validateCvc(cvc),
    };
    setFieldErrors(errors);

    // If any error exists, stop
    if (Object.values(errors).some(err => err !== '')) return;

    setPaymentState('processing');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const cleanCard = cardNumber.replace(/\s/g, '');
    if (cleanCard === '4242424242424242') {
      handleSuccess();
    } else if (cleanCard === '4000000000000002') {
      handleError('Your payment could not be processed. Please try again or use a different card.');
    } else if (cleanCard === '4000000000000341') {
      if (retryCount.current === 0) { retryCount.current += 1; handleError('Network error. Please try again.'); }
      else { handleSuccess(); retryCount.current = 0; }
    } else {
      handleError('Your payment could not be processed. Please try again or use a different method.');
    }
  };

  const handleSuccess = () => {
    setPaymentState('success');
    setTimeout(() => sendToHost('SUCCESS', { sessionId: 'sess_' + Math.random().toString(36).substring(2, 9) }), 2500);
  };

  const handleError = (msg: string) => {
    setPaymentState('error');
    setErrorMessage(msg);
    sendToHost('ERROR', { code: 'payment_failed', message: msg });
  };

  const handleTryAgain = () => { setPaymentState('idle'); setErrorMessage(''); };

  const useEscape = () => {
    React.useEffect(() => {
      const fn = (e: KeyboardEvent) => { if (e.key === 'Escape' && paymentState !== 'processing') handleClose('user_cancelled'); };
      window.addEventListener('keydown', fn);
      return () => window.removeEventListener('keydown', fn);
    }, [paymentState]);
  };
  useEscape();

  return (
    <div className={`checkout-overlay ${isClosing ? 'closing' : ''}`}>
      <div className="checkout-backdrop" onClick={() => paymentState !== 'processing' && handleClose('backdrop_click')} />

      <div className={`checkout-modal ${isClosing ? 'closing' : ''}`} role="dialog" aria-modal="true">

        {/*form*/}
        {paymentState === 'idle' && <>
          <div className="checkout-header">
            <div className="checkout-header-title"><ShieldCheck size={20} /><span>Secure Checkout</span></div>
            <button className="close-button" onClick={() => handleClose('close_button')} aria-label="Close"><X size={20} /></button>
          </div>

          <div className="checkout-content">
            <div className="order-summary">
              <h3>Super Widget</h3>
              <div className="order-price">$99.00</div>
            </div>

            <form onSubmit={processPayment} className="checkout-form" noValidate>

              {/*Email*/}
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email" id="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: '' })); }}
                  onBlur={() => setFieldErrors(prev => ({ ...prev, email: validateEmail(email) }))}
                  className={fieldErrors.email ? 'input-error' : ''}
                />
                {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
              </div>

              {/*Card*/}
              <div className="form-group">
                <label htmlFor="card">Card Information</label>
                <div className="card-input-wrapper">
                  <CreditCard size={18} className="input-icon" />
                  <input
                    type="text" id="card" inputMode="numeric"
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={handleCardChange}
                    onBlur={(e) => {
                      const raw = e.target.value.replace(/\s/g, '');
                      if (raw.length > 0 && raw.length < 16) {
                        setFieldErrors(prev => ({ ...prev, card: `Card number must be 16 digits. (${raw.length}/16 entered)` }));
                      }
                    }}
                    className={`card-number-input ${fieldErrors.card ? 'input-error' : ''}`}
                  />
                </div>
                {fieldErrors.card && <span className="field-error">{fieldErrors.card}</span>}

                {/* Expiry + CVC row */}
                <div className="card-details-row">
                  <div className="card-detail-col">
                    <input
                      type="text" placeholder="MM / YY" inputMode="numeric"
                      ref={expiryRef}
                      value={expiry}
                      onChange={handleExpiryChange}
                      onBlur={(e) => {
                        const val = e.target.value;
                        const raw = val.replace(/\D/g, '');
                        if (raw.length > 0 && raw.length < 4) {
                          setFieldErrors(prev => ({ ...prev, expiry: 'Enter a valid expiry date (MM/YY).' }));
                        }
                      }}
                      className={fieldErrors.expiry ? 'input-error' : ''}
                    />
                    {fieldErrors.expiry && <span className="field-error">{fieldErrors.expiry}</span>}
                  </div>
                  <div className="card-detail-col">
                    <input
                      type="text" placeholder="CVC" inputMode="numeric"
                      ref={cvcRef}
                      value={cvc}
                      onChange={handleCvcChange}
                      onBlur={() => setFieldErrors(prev => ({ ...prev, cvc: validateCvc(cvc) }))}
                      className={fieldErrors.cvc ? 'input-error' : ''}
                    />
                    {fieldErrors.cvc && <span className="field-error">{fieldErrors.cvc}</span>}
                  </div>
                </div>
              </div>

              <button type="submit" className="pay-button">Pay $99.00</button>
            </form>
          </div>

          <div className="checkout-footer">Powered by <strong>Dodo Payments</strong></div>
        </>}

        {/*PROCESSING*/}
        {paymentState === 'processing' && (
          <div className="result-body">
            <div className="loading-circle-wrapper">
              <svg className="progress-ring" width="110" height="110">
                <circle className="progress-ring__bg" strokeWidth="8" fill="transparent" r="46" cx="55" cy="55" />
                <circle className="progress-ring__circle" strokeWidth="8" fill="transparent" r="46" cx="55" cy="55" />
              </svg>
            </div>
            <div className="loading-text">Processing payment...</div>
          </div>
        )}

        {/*SUCCESS*/}
        {paymentState === 'success' && (
          <div className="result-body">
            <div className="result-icon success-icon">
              <Check size={48} color="white" strokeWidth={3} />
            </div>
            <h2 className="result-title">Payment Successful!</h2>
            <p className="result-subtitle">Your payment has been processed successfully. Thank you for your purchase!</p>
            <button className="result-btn success-btn" onClick={() => handleClose('completed')}>Done</button>
          </div>
        )}

        {/*ERROR*/}
        {paymentState === 'error' && (
          <div className="result-body">
            <div className="result-icon error-icon">
              <X size={48} color="white" strokeWidth={3} />
            </div>
            <h2 className="result-title">Payment Failed</h2>
            <p className="result-subtitle">{errorMessage}</p>
            <button className="result-btn error-btn" onClick={handleTryAgain}>Try Again</button>
          </div>
        )}

      </div>
    </div>
  );
};
