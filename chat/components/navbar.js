export function renderNavbar() {
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
                <h1>A N I <img src="https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg" class="verified-badge"></h1>
                <div class="status" id="status-text">Connecting...</div>
            </div>
        </div>
    </header>
    `;
}
