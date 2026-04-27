export function initScrolly() {
    const steps = Array.from(document.querySelectorAll('.step'));
    const dots  = Array.from(document.querySelectorAll('.dot'));

    let indiceSección   = -1; // Forzar activación de la primera sección (0) al arranque
    let estaDesplazando = false;
    let iniciadorTáctil = 0;

    // ─── Marcar sección activa ────────────────────────────────────────────────
    function activarSección(índice, desdeScrollNativo = false) {
        if (índice < 0 || índice >= steps.length) return;
        
        // Evitar duplicidad si ya estamos en esta sección
        if (índice === indiceSección && !desdeScrollNativo) return;

        indiceSección = índice;

        dots.forEach(d => d.classList.remove('active'));
        if (dots[índice]) dots[índice].classList.add('active');

        steps.forEach((step, i) => {
            if (i === índice) step.classList.add('is-visible');
            else              step.classList.remove('is-visible');
        });

        // Solo hacemos scrollIntoView si NO viene de un scroll manual/nativo ya realizado
        if (!desdeScrollNativo) {
            steps[índice].scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        // Avisar al motor GPGPU que cambiamos de sección (Solo si el índice cambió realmente)
        window.dispatchEvent(new CustomEvent('section-change', { detail: { index: índice } }));
    }

    // Exponer función de salto
    window.scrollyIr = activarSección;

    // ─── Throttle — reducido a 550 ms para mayor fluidez ─────────────────────
    function irASiguiente(dirección) {
        if (estaDesplazando) return;
        estaDesplazando = true;
        activarSección(indiceSección + dirección);
        setTimeout(() => { estaDesplazando = false; }, 550);
    }

    window.addEventListener('wheel', (e) => {
        // Bloquear si hay un overlay abierto (el body ya está en position:fixed)
        if (window.bloqueoScroll) return;
        // Si el evento ocurre dentro del panel de controles, lo dejamos pasar
        if (e.target.closest('#panel') || e.target.closest('#panel-vfx')) return;
        e.preventDefault();
        irASiguiente(e.deltaY > 0 ? 1 : -1);
    }, { passive: false });

    // ─── Teclado ──────────────────────────────────────────────────────────────
    window.addEventListener('keydown', (e) => {
        if (window.bloqueoScroll) return;
        if (e.key === 'ArrowDown' || e.key === 'PageDown') irASiguiente(1);
        if (e.key === 'ArrowUp'   || e.key === 'PageUp')   irASiguiente(-1);
    });

    // ─── Touch ───────────────────────────────────────────────────────────────
    window.addEventListener('touchstart', (e) => {
        if (window.bloqueoScroll) return;
        iniciadorTáctil = e.touches[0].clientY;
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
        if (window.bloqueoScroll) return;
        // Si estamos scrolleando dentro de un panel u overlay con scroll propio, no interferimos
        if (e.target.closest('.pb') || e.target.closest('.ui-overlay')) return;
        
        e.preventDefault();
        const delta = iniciadorTáctil - e.touches[0].clientY;
        if (Math.abs(delta) > 50) {
            irASiguiente(delta > 0 ? 1 : -1);
            iniciadorTáctil = e.touches[0].clientY; 
        }
    }, { passive: false });

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
