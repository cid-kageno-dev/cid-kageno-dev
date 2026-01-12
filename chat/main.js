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
// Note: If running locally, you might need to change this to 'http://127.0.0.1:5000/chat'
const API_URL = "https://hybrid-ani.onrender.com/chat";
const BASE_URL = "https://hybrid-ani.onrender.com/"; 

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
function addMessage(text, type) {
  const div = document.createElement("div");
  div.className = `msg ${type}`;

  if (type === 'bot') {
      // 1. PARSE LINKS: [Text](URL) -> <a ...>Text</a>
      let formatted = text.replace(
          /\[(.*?)\]\((.*?)\)/g, 
          '<a href="$2" target="_blank" class="clean-link">$1</a>'
      );
      
      // 2. PARSE BOLD: **Text** -> <b>Text</b>
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
      
      // 3. PARSE NEWLINES -> <br>
      formatted = formatted.replace(/\n/g, '<br>');
      
      // 4. PARSE BULLETS: * Item -> • Item
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

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });
    if (!res.ok) throw new Error("API Error");
    const data = await res.json();
    loader.remove();
    // Use data.response or data.reply depending on your backend
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
  try { await fetch(`${BASE_URL}?ping=${Date.now()}`, { mode: 'no-cors' }); setStatus(true); } 
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
setTimeout(() => { addMessage("Hello. I am Ani..👋\nHow Can I Assist You Today?🤖", "bot"); }, 400);
