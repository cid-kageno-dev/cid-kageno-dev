/* ====================================
   COMPONENTS
   ==================================== */
function renderNavbar() {
    return `
    <header class="offline" id="header-status">
        <div class="profile-group">
            <button class="back-btn" id="back-btn">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <div class="avatar-wrapper">
                <img src="https://i.postimg.cc/PrNFhBn3/Ani.jpg" alt="Ani" class="avatar">
            </div>
            <div class="info">
                <h1>A N I︵<img src="https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg" class="verified-badge"></h1>
                <div class="status" id="status-text">Connecting...</div>
            </div>
        </div>
        <div id="ani-user-slot" class="ani-user-slot"></div>
    </header>
    `;
}

function renderFooter() {
    return `
    <div id="input-area">
        <textarea id="msg-input" placeholder="Message..." rows="1"></textarea>
        <button id="send-btn" disabled>
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
    </div>
    `;
}

/* ====================================
   CODE BLOCK REGISTRY & TOGGLE
   ==================================== */
const codeRegistry = {};

// Listen for output messages from sandboxed JS execution iframes
window.addEventListener('message', (e) => {
    const { blockId, type, lines } = e.data || {};
    if (!blockId || !type) return;
    const outputPane = document.querySelector(`#${blockId} .code-pane-output`);
    if (!outputPane) return;

    if (type === 'output') {
        outputPane.innerHTML = lines.map(l =>
            `<div class="output-line">${l.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`
        ).join('');
    } else if (type === 'done') {
        if (!lines || lines.length === 0) {
            outputPane.innerHTML = '<div class="output-empty">No output</div>';
        }
    }
});

window.switchCodeTab = function(btn, blockId, tab) {
    const block = document.getElementById(blockId);
    if (!block) return;

    block.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const codePane    = block.querySelector('.code-pane-code');
    const previewPane = block.querySelector('.code-pane-preview');
    const outputPane  = block.querySelector('.code-pane-output');

    // Hide all panes first
    codePane.style.display = 'none';
    if (previewPane) previewPane.style.display = 'none';
    if (outputPane)  outputPane.style.display  = 'none';

    if (tab === 'code') {
        codePane.style.display = '';

    } else if (tab === 'preview') {
        previewPane.style.display = '';
        if (!previewPane.querySelector('iframe')) {
            const iframe = document.createElement('iframe');
            iframe.className = 'preview-frame';
            iframe.setAttribute('sandbox', 'allow-scripts');
            iframe.srcdoc = codeRegistry[blockId] || '';
            previewPane.appendChild(iframe);
        }

    } else if (tab === 'output') {
        outputPane.style.display = '';
        outputPane.innerHTML = '<div class="output-running"><span class="run-dot"></span>Running…</div>';

        const rawCode = codeRegistry[blockId] || '';
        const safeId  = blockId.replace(/[^a-z0-9-]/gi, '');

        const execSrc = `<!DOCTYPE html><html><body><script>
(function(){
  var _o=[];
  var _s=function(l){window.parent.postMessage({blockId:'${safeId}',type:'output',lines:l},'*');};
  var _fmt=function(a){return a.map(function(x){return typeof x==='object'?JSON.stringify(x,null,2):String(x);}).join(' ');};
  console.log=function(){_o.push(_fmt(Array.prototype.slice.call(arguments)));_s(_o.slice());};
  console.warn=function(){_o.push('\u26a0 '+_fmt(Array.prototype.slice.call(arguments)));_s(_o.slice());};
  console.error=function(){_o.push('\u274c '+_fmt(Array.prototype.slice.call(arguments)));_s(_o.slice());};
  try{${rawCode}}catch(e){_o.push('\u274c '+e.message);_s(_o.slice());}
  window.parent.postMessage({blockId:'${safeId}',type:'done',lines:_o},'*');
})();
<\/script></body></html>`;

        const execFrame = document.createElement('iframe');
        execFrame.setAttribute('sandbox', 'allow-scripts');
        execFrame.style.display = 'none';
        execFrame.srcdoc = execSrc;
        document.body.appendChild(execFrame);
        setTimeout(() => execFrame.remove(), 5000);
    }
};

/* ====================================
   MAIN LOGIC
   ==================================== */

// 1. Render Components
document.getElementById('navbar-container').innerHTML = renderNavbar();
document.getElementById('footer-container').innerHTML = renderFooter();

// 2. Select Elements
const app = document.getElementById("app");
const chatBox = document.getElementById("chat-box");
const input = document.getElementById("msg-input");
const sendBtn = document.getElementById("send-btn");
const header = document.getElementById("header-status");
const statusText = document.getElementById("status-text");
const backBtn = document.getElementById("back-btn");

// 3. Configuration
const URL  = "/api/chat";
const BURL = "https://ani-jms7.onrender.com/";

/* ====================================
   VIEWPORT & RESIZE LOGIC
   ==================================== */
const viewport = window.visualViewport;

function handleResize() {
  if (!viewport) return;
  app.style.height = `${viewport.height}px`;
  app.style.top = `${viewport.offsetTop}px`;
  window.scrollTo(0, 0); 
  if (chatBox) setTimeout(() => chatBox.scrollTop = chatBox.scrollHeight, 10);
}

if (viewport) {
  viewport.addEventListener("resize", handleResize);
  viewport.addEventListener("scroll", handleResize);
  handleResize();
}

/* ====================================
   CHAT HISTORY (Supabase)
   ==================================== */
const _SB_URL = 'https://uclgpxitnhzuftqulmrn.supabase.co';
const _SB_KEY = 'sb_publishable_FxHFy0geZAUmZi-0yJ8AcA_-1hX4h1m';

let _sbClient = null;

function getSupabase() {
  if (!_sbClient) {
    _sbClient = window._supabase || window.supabase.createClient(_SB_URL, _SB_KEY);
  }
  return Promise.resolve(_sbClient);
}

// Called by the auth module (index.html) when a user signs in
window.loadChatHistory = async function () {
  try {
    const sb = await getSupabase();
    const { data, error } = await sb
      .from('chat_messages')
      .select('role, content')
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) throw error;

    // Clear existing messages
    chatBox.querySelectorAll('.msg').forEach(el => el.remove());

    if (!data || data.length === 0) {
      addMessage("Hello. I am Ani..👋\nHow Can I Assist You Today?🤖", "bot", false);
    } else {
      for (const row of data) {
        addMessage(row.content, row.role, false);
      }
    }
  } catch (err) {
    console.error('[history] load failed:', err.message);
  }
};

async function saveAniMessage(role, content) {
  try {
    const sb = await getSupabase();
    await sb.from('chat_messages').insert({ role, content });
  } catch (err) {
    console.error('[history] save failed:', err.message);
  }
}

/* ====================================
   CHAT LOGIC
   ==================================== */
const autoResize = () => {
  input.style.height = 'auto'; 
  const newHeight = input.scrollHeight;
  input.style.height = newHeight + 'px'; 
  input.style.overflowY = newHeight > 120 ? "auto" : "hidden";
};

input.addEventListener('input', () => {
  autoResize();
  sendBtn.disabled = input.value.trim().length === 0;
});

// --- UPDATED MESSAGE FUNCTION WITH MARKDOWN PARSER ---
// save=true (default) persists to Supabase; pass false when replaying history
function addMessage(text, type, save = true) {
  if (save) saveAniMessage(type, text);
  const div = document.createElement("div");
  div.className = `msg ${type}`;

  if (type === 'bot') {
      // 1. PARSE FENCED CODE BLOCKS: ```lang\ncode\n``` -> toggleable code/preview block
      let blockCounter = 0;
      let formatted = text.replace(
          /```(\w+)?\n?([\s\S]*?)```/g,
          (_, lang, code) => {
              const rawCode = code.trim();
              const blockId = `cb-${Date.now()}-${blockCounter++}`;
              codeRegistry[blockId] = rawCode;

              const escapedCode = rawCode
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;');

              const langKey = (lang || '').toLowerCase();
              const previewable = ['html', 'htm', 'svg'].includes(langKey);
              const runnable   = ['js', 'javascript'].includes(langKey);
              const langLabel  = lang ? `<span class="code-lang">${lang}</span>` : '<span class="code-lang">code</span>';

              const toggleBtns = `
                  <div class="code-tabs">
                      <button class="toggle-btn active" onclick="switchCodeTab(this,'${blockId}','code')">Code</button>
                      ${previewable ? `<button class="toggle-btn" onclick="switchCodeTab(this,'${blockId}','preview')">Preview</button>` : ''}
                      ${runnable   ? `<button class="toggle-btn run-tab" onclick="switchCodeTab(this,'${blockId}','output')">&#9654; Run</button>` : ''}
                  </div>`;

              return `<div class="code-block" id="${blockId}">
                  <div class="code-header">${langLabel}${toggleBtns}</div>
                  <div class="code-pane code-pane-code"><pre><code>${escapedCode}</code></pre></div>
                  ${previewable ? `<div class="code-pane code-pane-preview" style="display:none"></div>` : ''}
                  ${runnable    ? `<div class="code-pane code-pane-output" style="display:none"></div>`  : ''}
              </div>`;
          }
      );

      // 2. PARSE INLINE CODE: `code` -> <code>code</code>
      formatted = formatted.replace(
          /`([^`]+)`/g,
          (_, code) => {
              const escapedCode = code
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;');
              return `<code class="inline-code">${escapedCode}</code>`;
          }
      );

      // 3. PARSE LINKS: [Text](URL) -> <a ...>Text</a>
      formatted = formatted.replace(
          /\[(.*?)\]\((.*?)\)/g, 
          '<a href="$2" target="_blank" class="clean-link">$1</a>'
      );
      
      // 4. PARSE BOLD: **Text** -> <b>Text</b>
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
      
      // 5. PARSE NEWLINES -> <br> (skip inside code blocks)
      formatted = formatted.replace(/\n/g, '<br>');
      
      // 6. PARSE BULLETS: * Item -> • Item
      formatted = formatted.replace(/^\* /gm, '• ');

      div.innerHTML = formatted;
  } else {
      // User messages remain plain text for security
      div.textContent = text;
  }

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function showTyping() {
  const div = document.createElement("div");
  div.className = "msg bot typing-indicator";
  div.innerHTML = `<div class="dot"></div><div class="dot"></div><div class="dot"></div>`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
  return div;
}

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;
  addMessage(text, "user");

  input.value = "";
  input.style.height = '48px'; 
  input.style.overflowY = "hidden";
  input.focus(); 
  sendBtn.disabled = true;

  const loader = showTyping();

  const userName = window._aniUser ? (window._aniUser.name || 'Guest') : 'Guest';

  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, userName })
    });
    if (!res.ok) throw new Error("API Error");
    const data = await res.json();
    loader.remove();
    addMessage(data.reply || data.response, "bot");
    setStatus(true);
  } catch (err) {
    loader.remove();
    addMessage("Error: Could not reach Ani.", "bot");
    setStatus(false);
  }
}

input.onkeydown = (e) => { if(e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }};
sendBtn.onclick = sendMessage;

function setStatus(isOnline) {
  if (isOnline) {
    header.classList.add("active");
    statusText.textContent = "Online";
  } else {
    header.classList.remove("active");
    statusText.textContent = "Offline";
  }
}

async function checkHealth() {
  try { await fetch(`${BURL}?ping=${Date.now()}`, { mode: 'no-cors' }); setStatus(true); } 
  catch { setStatus(false); }
}

if(backBtn) {
  backBtn.onclick = (e) => {
    e.preventDefault();
    if (window.parent && window.parent !== window) { 
        window.parent.postMessage('close-chat', '*'); 
    } 
    else { 
        window.history.back(); 
    }
  };
}

/* ====================================
   KEYBOARD FOCUS FIX
   ==================================== */
input.addEventListener('focus', () => {
  setTimeout(() => {
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    if (window.visualViewport) {
      handleResize();
    }
  }, 300);
});

// Initial Calls
checkHealth();
setInterval(checkHealth, 15000);
// Greeting is shown by loadChatHistory once the user is authenticated
