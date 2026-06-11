class CustomNavbar extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <nav class="site-nav" id="site-nav">
        <div class="nav-inner" id="nav-inner">
          <a href="#home" class="nav-link active">Home<span class="nav-dot"></span></a>
          <a href="#projects" class="nav-link">Projects<span class="nav-dot"></span></a>
          <a href="#tools" class="nav-link">Tools<span class="nav-dot"></span></a>
          <a href="#contact" class="nav-link">Contact<span class="nav-dot"></span></a>
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
  }
}
customElements.define('custom-navbar', CustomNavbar);
