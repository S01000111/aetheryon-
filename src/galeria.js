import { supabase } from './lib/supabaseCliente.js';

/**
 * Inicializa la carga de la galería desde Supabase
 */
export async function inicializarGaleria() {
    if (!supabase) {
        console.warn('Supabase no está configurado. La galería usará placeholders.');
        return;
    }
    try {
        const { data: imagenes, error } = await supabase
            .from('galeria_imagenes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Distribuir imágenes por contenedor manteniendo placeholders
        renderizarConPlaceholders(imagenes.filter(img => img.categoria === 'ilus'), 'gal-grid-ilus', '&#128444;');
        renderizarConPlaceholders(imagenes.filter(img => img.categoria === 'cine'), 'gal-grid-cine', '▶', true);
        renderizarConPlaceholders(imagenes.filter(img => img.categoria === 'arte'), 'gal-grid-arte', '&#128396;');
        renderizarConPlaceholders(imagenes.filter(img => img.categoria === 'captura'), 'gal-grid-captura', '&#128247;');

    } catch (err) {
        console.error('Error al cargar la galería de Supabase:', err.message);
    }
}

function renderizarConPlaceholders(items, containerId, iconoPlaceholder, esVideo = false) {
    const contenedor = document.getElementById(containerId);
    if (!contenedor) return;

    // Obtener los slots existentes
    let slots = Array.from(contenedor.querySelectorAll('.gal-item'));
    const minSlots = slots.length;

    if (items.length > minSlots) {
        for (let i = minSlots; i < items.length; i++) {
            const nuevoSlot = document.createElement('div');
            nuevoSlot.className = 'gal-item';
            contenedor.appendChild(nuevoSlot);
            slots.push(nuevoSlot);
        }
    }

    slots.forEach((slot, index) => {
        const item = items[index];

        // Limpiar eventos previos para evitar duplicados
        const newSlot = slot.cloneNode(false);
        slot.parentNode.replaceChild(newSlot, slot);
        
        if (item) {
            if (containerId === 'gal-grid-arte') {
                const randomHeight = Math.floor(Math.random() * (500 - 250 + 1)) + 250;
                newSlot.style.height = `${randomHeight}px`;
                newSlot.style.aspectRatio = 'auto';
            }
            
            newSlot.innerHTML = `
                ${esVideo ? '<span class="gal-cine-play">▶</span>' : ''}
                <img src="${item.url_fija}" alt="${item.nombre_imagen}" style="width:100%; height:100%; object-fit:cover; display:block;">
                <div class="gal-caption">${item.nombre_imagen}</div>
            `;

            // Vincular evento de apertura
            newSlot.onclick = (e) => {
                if (e.target.classList.contains('gal-cine-play')) return;
                if (window.setGaleriaContexto) window.setGaleriaContexto(newSlot);
            };
        } else {
            newSlot.innerHTML = `
                <span class="gal-placeholder">${iconoPlaceholder}</span>
                <div class="gal-caption">Próximamente...</div>
            `;
            newSlot.onclick = null;
            newSlot.style.cursor = 'default';
        }
    });
}
