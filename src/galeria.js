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

        // Inyectar video principal (Hero)
        const videosCine = imagenes.filter(img => img.categoria === 'cine');
        const videoPrincipal = videosCine.find(v => v.nombre_imagen === 'Tráiler de Anuncio Oficial') || videosCine[0];
        
        if (videoPrincipal) {
            const heroCont = document.querySelector('.gal-cine-hero');
            if (heroCont) {
                heroCont.innerHTML = `
                    <span class="gal-cine-play">▶</span>
                    <video src="${videoPrincipal.url_fija}" poster="${videoPrincipal.url_fija}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;"></video>
                    <div class="gal-caption" style="opacity:1;">${videoPrincipal.nombre_imagen}</div>
                `;
                // El Hero no usa hover-to-play, se abre en popup como los demás
                heroCont.onclick = () => {
                    if (window.setGaleriaContexto) window.setGaleriaContexto(heroCont);
                };
            }
        }

        // Distribuir imágenes por contenedor manteniendo placeholders
        renderizarConPlaceholders(imagenes.filter(img => img.categoria === 'ilus'), 'gal-grid-ilus', '&#128444;');
        renderizarConPlaceholders(videosCine, 'gal-grid-cine', '▶', true);
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
            
            const esVideoUrl = item.url_fija && (item.url_fija.endsWith('.mp4') || item.url_fija.endsWith('.webm') || item.url_fija.endsWith('.ogg'));
            const usarVideo = esVideo || esVideoUrl;

            newSlot.innerHTML = `
                ${usarVideo 
                    ? `<video src="${item.url_fija}" muted loop playsinline style="width:100%; height:100%; object-fit:cover; display:block;"></video>`
                    : `<img src="${item.url_fija}" alt="${item.nombre_imagen}" style="width:100%; height:100%; object-fit:cover; display:block;">`
                }
                <div class="gal-caption">${item.nombre_imagen}</div>
            `;

            // Reproducción al hover para videos (estilo YouTube)
            if (usarVideo) {
                const videoEl = newSlot.querySelector('video');
                newSlot.onmouseenter = () => videoEl.play().catch(e => {});
                newSlot.onmouseleave = () => {
                    videoEl.pause();
                    videoEl.currentTime = 0; // Opcional: reiniciar el preview
                };
            }

            // Vincular evento de apertura
            newSlot.onclick = (e) => {
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
