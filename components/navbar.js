class CustomNavbar extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <nav class="site-nav" id="site-nav">
        <div class="nav-inner" id="nav-inner">
          <a href="#home" class="nav-link active">Home<span class="nav-dot"></span></a>
          <a href="#projects" class="nav-link">Projects<span class="nav-dot"></span></a>
          <a href="#tools" class="nav-link">Tools<span class="nav-dot"></span></a>
          <a href="#contact" class="nav-link">Contact<span class="nav-dot"></span></a>
          <button class="nav-auth-btn" id="nav-auth-btn">Sign In</button>
        </div>
      </nav>
    `;

    window.addEventListener('scroll', () => {
      const nav = this.querySelector('.site-nav');
      const inner = this.querySelector('.nav-inner');
      if (window.scrollY > 40) {
        nav.classList.add('scrolled');
        inner.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
        inner.classList.remove('scrolled');
      }
    }, { passive: true });

    const btn = this.querySelector('#nav-auth-btn');
    btn.addEventListener('click', () => {
      if (btn.dataset.signedIn === 'true') {
        document.dispatchEvent(new CustomEvent('nav-signout'));
      } else {
        if (typeof window.openAuthModal === 'function') window.openAuthModal();
      }
    });

    document.addEventListener('auth-state-change', e => {
      const user = e.detail.user;
      if (user) {
        const name = user.displayName || user.email?.split('@')[0] || 'You';
        btn.textContent = name;
        btn.dataset.signedIn = 'true';
        btn.title = 'Click to sign out';
      } else {
        btn.textContent = 'Sign In';
        btn.dataset.signedIn = 'false';
        btn.title = '';
      }
    });
  }
}
customElements.define('custom-navbar', CustomNavbar);
