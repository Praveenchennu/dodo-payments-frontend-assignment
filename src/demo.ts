import DodoCheckout from './sdk';

const layout = document.getElementById('layout')!;
const logPanel = document.getElementById('log-panel')!;
const logList = document.getElementById('log-list')!;
const toggleBtn = document.getElementById('log-toggle')!;
const closeBtn = document.getElementById('close-log')!;
const clearBtn = document.getElementById('clear-btn')!;

let isOpen = false;
let hasLogs = false;

function openPanel() {
  isOpen = true;
  logPanel.classList.add('open');
  layout.classList.add('logs-open');
}
function closePanel() {
  isOpen = false;
  logPanel.classList.remove('open');
  layout.classList.remove('logs-open');
}

toggleBtn.addEventListener('click', () => isOpen ? closePanel() : openPanel());
closeBtn.addEventListener('click', closePanel);
clearBtn.addEventListener('click', () => {
  logList.innerHTML = '<div class="log-empty"><strong>📋</strong>Logs cleared.<br/>Click "Buy with Dodo" to start.</div>';
  hasLogs = false;
});

function scrollToBottom() {
  requestAnimationFrame(() => { logList.scrollTop = logList.scrollHeight; });
}

function log(type: 'open' | 'success' | 'error' | 'closed', message: string) {
  if (!hasLogs) { logList.innerHTML = ''; hasLogs = true; }

  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const tags = {
    open: { cls: 't-open', label: '⚡ OPEN' },
    success: { cls: 't-success', label: '✅ SUCCESS' },
    error: { cls: 't-error', label: '❌ ERROR' },
    closed: { cls: 't-closed', label: '🚪 CLOSED' },
  };
  const { cls, label } = tags[type];

  const row = document.createElement('div');
  row.className = `log-row type-${type}`;

  const main = document.createElement('div');
  main.className = 'log-main';
  main.innerHTML = `
    <span class="ts">${time}</span>
    <span class="msg"><span class="${cls}">${label}</span> — ${message}</span>
    <button class="log-expand-btn">View flow ▾</button>
  `;

  const details = document.createElement('div');
  details.className = 'log-details';
  
  if (type === 'success') {
    details.innerHTML = `
      <div class="flow-step"><span class="step-icon" style="color:#10b981">✓</span> Product selection complete</div>
      <div class="flow-step"><span class="step-icon" style="color:#10b981">✓</span> Payment method verified</div>
      <div class="flow-step"><span class="step-icon" style="color:#10b981">✓</span> Payment status is success</div>
      <div class="flow-step"><span class="step-icon" style="color:#10b981">✓</span> Callback executed</div>
    `;
  } else if (type === 'open') {
    details.innerHTML = `
      <div class="flow-step"><span class="step-icon" style="color:#fbbf24">→</span> Initializing checkout SDK</div>
      <div class="flow-step"><span class="step-icon" style="color:#fbbf24">→</span> Opening secure iframe overlay</div>
      <div class="flow-step"><span class="step-icon" style="color:#fbbf24">→</span> Waiting for user input...</div>
    `;
  } else if (type === 'closed') {
    details.innerHTML = `
      <div class="flow-step"><span class="step-icon" style="color:#6366f1">→</span> User action completed</div>
      <div class="flow-step"><span class="step-icon" style="color:#6366f1">→</span> Destroying iframe securely</div>
      <div class="flow-step"><span class="step-icon" style="color:#6366f1">→</span> Returning control to host page</div>
    `;
  } else if (type === 'error') {
    details.innerHTML = `
      <div class="flow-step"><span class="step-icon" style="color:#ef4444">✗</span> Transaction attempted</div>
      <div class="flow-step"><span class="step-icon" style="color:#ef4444">✗</span> Network or card failure detected</div>
      <div class="flow-step"><span class="step-icon" style="color:#ef4444">✗</span> Error callback executed</div>
    `;
  }

  main.querySelector('.log-expand-btn')?.addEventListener('click', () => {
    row.classList.toggle('expanded');
    const btn = main.querySelector('.log-expand-btn')!;
    btn.textContent = row.classList.contains('expanded') ? 'Hide flow ▴' : 'View flow ▾';
  });

  row.appendChild(main);
  row.appendChild(details);
  
  logList.appendChild(row);
  scrollToBottom();

  // Auto-open panel when first event fires
  if (!isOpen) openPanel();
}

// Buy button
const productView = document.getElementById('product-view')!;
const successView = document.getElementById('success-view')!;
const shopMoreBtn = document.getElementById('shop-more-button')!;

document.getElementById('buy-button')?.addEventListener('click', () => {
  log('open', 'Opening Dodo Checkout...');

  DodoCheckout.open({
    productId: 'prod_super_widget_123',
    onSuccess: ({ sessionId }) => {
      log('success', `Payment completed — Session: <strong>${sessionId}</strong>`);
      productView.style.display = 'none';
      successView.style.display = 'flex';
    },
    onClose: ({ reason }) => {
      log('closed', `Checkout closed — Reason: <strong>${reason}</strong>`);
      if (reason === 'completed') {
        productView.style.display = 'none';
        successView.style.display = 'flex';
      }
    },
    onError: ({ code, message }) => log('error', `${code} — ${message}`),
  });
});

shopMoreBtn?.addEventListener('click', () => {
  successView.style.display = 'none';
  productView.style.display = 'block';
});
