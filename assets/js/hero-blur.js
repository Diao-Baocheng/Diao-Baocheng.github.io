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
