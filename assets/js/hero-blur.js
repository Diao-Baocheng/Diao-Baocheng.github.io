// Hero background blur on scroll
(function () {
    let ticking = false;

    function updateBlur() {
        const scrollY = window.scrollY || window.pageYOffset;

        if (scrollY > 50) {
            document.body.classList.add('scrolled');
        } else {
            document.body.classList.remove('scrolled');
        }

        ticking = false;
    }

    function requestTick() {
        if (!ticking) {
            window.requestAnimationFrame(updateBlur);
            ticking = true;
        }
    }

    window.addEventListener('scroll', requestTick, { passive: true });

    // Initial check
    updateBlur();
})();

// Scroll to top button functionality
(function () {
    const scrollToTopBtn = document.querySelector('.scroll-to-top');

    if (!scrollToTopBtn) return;

    // Show/hide button based on scroll position
    function toggleScrollToTopButton() {
        if (window.scrollY > 300) {
            scrollToTopBtn.classList.remove('hide');
            scrollToTopBtn.classList.add('show');
        } else {
            scrollToTopBtn.classList.remove('show');
            scrollToTopBtn.classList.add('hide');
        }
    }

    // Smooth scroll to top
    function scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    // Event listeners
    window.addEventListener('scroll', toggleScrollToTopButton, { passive: true });
    scrollToTopBtn.addEventListener('click', scrollToTop);

    // Initial state
    toggleScrollToTopButton();
})();

