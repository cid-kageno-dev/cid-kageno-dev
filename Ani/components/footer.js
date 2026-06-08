export function renderFooter() {
    return `
    <div id="input-area">
        <textarea id="msg-input" placeholder="Message..." rows="1"></textarea>
        <button id="send-btn" disabled>
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
    </div>
    `;
}
