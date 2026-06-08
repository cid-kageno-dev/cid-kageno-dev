class CustomFooter extends HTMLElement {
  connectedCallback() {
    const year = new Date().getFullYear();
    this.innerHTML = `
      <footer class="site-footer">
        <div class="footer-inner">
          <p class="footer-copy">© ${year} Cid Kageno — All Rights Reserved.</p>
          <p class="footer-sub">Built with 💜 and Atomic Energy</p>
        </div>
      </footer>
    `;
  }
}
customElements.define('custom-footer', CustomFooter);
