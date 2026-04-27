export function initScrolly() {
    const steps = Array.from(document.querySelectorAll('.step'));
    const dots  = Array.from(document.querySelectorAll('.dot'));

    let indiceSección   = 0;
    let estaDesplazando = false;
    let iniciadorTáctil = 0;

    // ─── Marcar sección activa ────────────────────────────────────────────────
    function activarSección(índice) {
        if (índice < 0 || índice >= steps.length) return;
        indiceSección = índice;

        dots.forEach(d => d.classList.remove('active'));
        if (dots[índice]) dots[índice].classList.add('active');

        steps.forEach((step, i) => {
            if (i === índice) step.classList.add('is-visible');
            else              step.classList.remove('is-visible');
        });

        steps[índice].scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Avisar al motor GPGPU que cambiamos de sección
        window.dispatchEvent(new CustomEvent('section-change', { detail: { index: índice } }));
    }

    // ─── Throttle — reducido a 550 ms para mayor fluidez ─────────────────────
    function irASiguiente(dirección) {
        if (estaDesplazando) return;
        estaDesplazando = true;
        activarSección(indiceSección + dirección);
        setTimeout(() => { estaDesplazando = false; }, 550);
    }

    // ─── Wheel (cualquier posición, excepto dentro del panel) ────────────────
    window.addEventListener('wheel', (e) => {
        // Si el evento ocurre dentro del panel de controles, lo dejamos pasar
        if (e.target.closest('#panel')) return;
        e.preventDefault();
        irASiguiente(e.deltaY > 0 ? 1 : -1);
    }, { passive: false });

    // ─── Teclado ──────────────────────────────────────────────────────────────
    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'PageDown') irASiguiente(1);
        if (e.key === 'ArrowUp'   || e.key === 'PageUp')   irASiguiente(-1);
    });

    // ─── Touch ───────────────────────────────────────────────────────────────
    window.addEventListener('touchstart', (e) => {
        iniciadorTáctil = e.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
        const delta = iniciadorTáctil - e.changedTouches[0].clientY;
        if (Math.abs(delta) > 50) irASiguiente(delta > 0 ? 1 : -1);
    }, { passive: true });

    // ─── Evento global: links del menú pueden disparar navegación ────────────
    window.addEventListener('scrolly-goto', (e) => {
        const i = e.detail?.index ?? 0;
        if (estaDesplazando) return;
        estaDesplazando = true;
        activarSección(i);
        setTimeout(() => { estaDesplazando = false; }, 550);
    });

    // ─── Exponer función globalmente para llamadas inline ─────────────────────
    window.scrollyIr = (índice) => {
        window.dispatchEvent(new CustomEvent('scrolly-goto', { detail: { index: índice } }));
    };

    // ─── Dragging dot-nav ──────────────────────────────────────────────────
    const dotNav = document.getElementById('dot-nav');
    let isDragging = false;

    const handleDrag = (e) => {
        const rect = dotNav.getBoundingClientRect();
        const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
        const h = rect.height;
        const percent = Math.max(0, Math.min(1, y / h));
        const targetIdx = Math.round(percent * (steps.length - 1));
        
        if (targetIdx !== indiceSección && !estaDesplazando) {
            estaDesplazando = true;
            activarSección(targetIdx);
            setTimeout(() => { estaDesplazando = false; }, 450);
        }
    };

    dotNav.addEventListener('mousedown', (e) => { isDragging = true; handleDrag(e); });
    window.addEventListener('mousemove', (e) => { if (isDragging) handleDrag(e); });
    window.addEventListener('mouseup', () => { isDragging = false; });

    dotNav.addEventListener('touchstart', (e) => { isDragging = true; handleDrag(e); }, { passive: false });
    window.addEventListener('touchmove', (e) => { if (isDragging) { e.preventDefault(); handleDrag(e); } }, { passive: false });
    window.addEventListener('touchend', () => { isDragging = false; });

    // ─── Arrancar en sección 0 ────────────────────────────────────────────────
    activarSección(0);
}
