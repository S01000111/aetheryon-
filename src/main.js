import * as THREE from 'three';

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// ── CONFIG ────────────────────────────────────────────────────────────────────
const cfg = {
    SIM_RES: 128, DYE_RES: 512,
    DISS: 0.99, VEL_DISS: 0.98,
    PRESSURE_ITER: 20, CURL: 16,
    RADIUS: 0.005, FORCE: 6000,
    GLOW: 0.1, CONTRAST: 1.2, SAT: 1.3, NOISE: 0.05,
    SPEED: 1.0,
    MIX: false, BG: false, BORDER: true,
    INFLOW: 0.6, BOX_DIR: 'left', BOX_SPEED: 7.0, BOX_SPREAD: 0.5,
    LAZY: false, LAZY_VAL: 0.10, VISC: 0.0, JELLY: false,
    B_THICK: 31, B_INT: 0.15, B_SPD: 0.4,
    PARTICLES: true, PART_RES: 128, 
    PART_SIZE: isMobile ? 5.0 : 2.0, 
    PART_OP: isMobile ? 0.1 : 0.25, 
    PART_SPEED: 0.35,
    ACTIVE_IDX: 0,
    mainColors: [
        new THREE.Color(0x6600ff),
        new THREE.Color(0x00b3ff),
        new THREE.Color(0xff8800),
        new THREE.Color(0x37ff00),
        new THREE.Color(0x82614f),
    ],
    boxColors: [
        new THREE.Color(0x6600ff),
        new THREE.Color(0x00b3ff),
        new THREE.Color(0xff8800),
        new THREE.Color(0x37ff00),
        new THREE.Color(0x82614f),
    ],
    TOR_ENABLE: true,
    TOR_HORIZ: true,
    TOR_TURB: 0,
    TOR_VEL: 5000,
    TOR_PERS: 0.02,
    TOR_GLOW: 5,
    TOR_INFLOW: 3.2,
    TOR_RADVEL: 0,
    TOR_RADSPR: 0.06,
    TOR_CONT: 0.01,
    torColors: [
        new THREE.Color(0x6600ff),
        new THREE.Color(0x00b3ff),
        new THREE.Color(0xff8800),
        new THREE.Color(0x37ff00),
        new THREE.Color(0x82614f),
        new THREE.Color(0xff0000), // Rojo Intenso para el Footer
    ]
};

// ── SHADERS ───────────────────────────────────────────────────────────────────
const baseVS = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }
`;

const advFS = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uVel, uSrc;
uniform vec2 uTex;
uniform float uDt, uDiss;
void main(){
    vec2 pos = vUv - uDt * texture2D(uVel, vUv).xy * uTex;
    gl_FragColor = uDiss * texture2D(uSrc, pos);
}`;

const splatFS = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTgt;
uniform vec2 uPt;
uniform vec3 uCol;
uniform float uRad, uAsp;
void main(){
    vec2 p = vUv - uPt;
    p.x *= uAsp;
    float d = exp(-dot(p,p) / uRad);
    gl_FragColor = vec4(texture2D(uTgt, vUv).xyz + d * uCol, 1.0);
}`;

const divFS = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uVel;
uniform vec2 uTex;
void main(){
    float L = texture2D(uVel, vUv - vec2(uTex.x, 0.0)).x;
    float R = texture2D(uVel, vUv + vec2(uTex.x, 0.0)).x;
    float T = texture2D(uVel, vUv + vec2(0.0, uTex.y)).y;
    float B = texture2D(uVel, vUv - vec2(0.0, uTex.y)).y;
    gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`;

const pressFS = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uPrs, uDiv;
uniform vec2 uTex;
void main(){
    float L = texture2D(uPrs, vUv - vec2(uTex.x, 0.0)).x;
    float R = texture2D(uPrs, vUv + vec2(uTex.x, 0.0)).x;
    float T = texture2D(uPrs, vUv + vec2(0.0, uTex.y)).x;
    float B = texture2D(uPrs, vUv - vec2(0.0, uTex.y)).x;
    float d = texture2D(uDiv, vUv).x;
    gl_FragColor = vec4((L + R + B + T - d) * 0.25, 0.0, 0.0, 1.0);
}`;

const gradFS = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uPrs, uVel;
uniform vec2 uTex;
void main(){
    float L = texture2D(uPrs, vUv - vec2(uTex.x, 0.0)).x;
    float R = texture2D(uPrs, vUv + vec2(uTex.x, 0.0)).x;
    float T = texture2D(uPrs, vUv + vec2(0.0, uTex.y)).x;
    float B = texture2D(uPrs, vUv - vec2(0.0, uTex.y)).x;
    vec2 v = texture2D(uVel, vUv).xy;
    gl_FragColor = vec4(v - vec2(R - L, T - B) * 0.5, 0.0, 1.0);
}`;

const curlFS = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uVel;
uniform vec2 uTex;
void main(){
    float L = texture2D(uVel, vUv - vec2(uTex.x, 0.0)).y;
    float R = texture2D(uVel, vUv + vec2(uTex.x, 0.0)).y;
    float T = texture2D(uVel, vUv + vec2(0.0, uTex.y)).x;
    float B = texture2D(uVel, vUv - vec2(0.0, uTex.y)).x;
    gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`;

const vortFS = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uVel, uCurl;
uniform float uCurlScale, uDt;
uniform vec2 uTex;
void main(){
    float L = texture2D(uCurl, vUv - vec2(uTex.x, 0.0)).x;
    float R = texture2D(uCurl, vUv + vec2(uTex.x, 0.0)).x;
    float T = texture2D(uCurl, vUv + vec2(0.0, uTex.y)).x;
    float B = texture2D(uCurl, vUv - vec2(0.0, uTex.y)).x;
    float C = texture2D(uCurl, vUv).x;
    vec2 f = vec2(abs(T) - abs(B), abs(R) - abs(L));
    f /= length(f) + 0.00001;
    f *= uCurlScale * C;
    vec2 v = texture2D(uVel, vUv).xy;
    gl_FragColor = vec4(v + f * uDt, 0.0, 1.0);
}`;

const displayFS = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uGlow, uContrast, uSat, uAdvBloom, uNoise, uTime;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main(){
    vec3 c = texture2D(uTex, vUv).rgb * uGlow;
    
    // Evitar branches dinámicos (if) con texture2D para prevenir crashes de WebGL
    vec2 d = vec2(0.003, 0.0);
    float r = texture2D(uTex, vUv - d).r;
    float b = texture2D(uTex, vUv + d).b;
    float bloomOn = step(0.5, uAdvBloom);
    
    c.r = mix(c.r, mix(c.r, r * uGlow, 0.5), bloomOn);
    c.b = mix(c.b, mix(c.b, b * uGlow, 0.5), bloomOn);
    c = mix(c, c * c * 1.5, bloomOn);

    float g = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(vec3(g), c, uSat);
    c = (c - 0.5) * uContrast + 0.5;
    
    // Noise animado tipo Film Grain
    float n = hash(vUv * 100.0 + uTime) - 0.5;
    c += n * uNoise;
    
    gl_FragColor = vec4(c, 1.0);
}`;

const blurFS = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTexSize;
uniform float uAmt;
void main(){
    vec4 c = texture2D(uTex, vUv);
    vec4 l = texture2D(uTex, vUv - vec2(uTexSize.x, 0.0));
    vec4 r = texture2D(uTex, vUv + vec2(uTexSize.x, 0.0));
    vec4 t = texture2D(uTex, vUv + vec2(0.0, uTexSize.y));
    vec4 b = texture2D(uTex, vUv - vec2(0.0, uTexSize.y));
    gl_FragColor = mix(c, (l + r + t + b + c) * 0.2, uAmt);
}`;

const partSimFS = `
precision highp float;
uniform sampler2D uPos, uVel, uInit;
uniform float uDt, uSpeed;
varying vec2 vUv;
void main(){
    vec4 p = texture2D(uPos, vUv);
    vec2 v = texture2D(uVel, p.xy).xy;
    p.xy += v * uDt * uSpeed;
    if(p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) p = texture2D(uInit, vUv);
    gl_FragColor = p;
}`;

const partRenderVS = `
precision highp float;
attribute vec2 aUv;
uniform sampler2D uPos;
uniform float uSize;
void main(){
    vec4 p = texture2D(uPos, aUv);
    gl_Position = vec4(p.xy * 2.0 - 1.0, 0.0, 1.0);
    gl_PointSize = uSize;
}`;

const partRenderFS = `
precision highp float;
uniform vec3 uCol;
uniform float uOp;
void main(){
    float d = length(gl_PointCoord - 0.5);
    if(d > 0.5) discard;
    float a = smoothstep(0.5, 0.1, d) * uOp;
    gl_FragColor = vec4(uCol, a);
}`;

// ── HELPERS ───────────────────────────────────────────────────────────────────
function hexToColor(hex) {
    // Asegurar formato #RRGGBB sin alfa
    const clean = hex.slice(0, 7);
    return new THREE.Color(clean);
}

// ── COLOR PICKER CUSTOM ────────────────────────────────────────────────────────
class ColorPicker {
    constructor() {
        this.modal = document.getElementById('cp-modal');
        this.canvas = document.getElementById('cp-wheel');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.radius = this.width / 2;
        this.tWell = null;
        this.tArr = null;
        this.tIdx = null;
        this.originalColor = new THREE.Color();
        
        this.drawWheel();
        
        this.canvas.addEventListener('click', e => this.pick(e));
        let isDragging = false;
        this.canvas.addEventListener('mousedown', () => isDragging = true);
        window.addEventListener('mouseup', () => isDragging = false);
        this.canvas.addEventListener('mousemove', e => { if(isDragging) this.pick(e); });
        
        document.getElementById('cp-cancel').onclick = () => this.cancel();
        document.getElementById('cp-apply').onclick = () => this.close();
    }
    
    drawWheel() {
        const cx = this.width/2;
        const cy = this.height/2;
        for(let y=0; y<this.height; y++){
            for(let x=0; x<this.width; x++){
                const dx = x - cx;
                const dy = y - cy;
                const d = Math.sqrt(dx*dx + dy*dy);
                if (d <= this.radius) {
                    const angle = Math.atan2(dy, dx);
                    const hue = (angle + Math.PI) / (Math.PI * 2) * 360;
                    const sat = d / this.radius * 100;
                    this.ctx.fillStyle = `hsl(${hue}, ${sat}%, 50%)`;
                    this.ctx.fillRect(x, y, 1, 1);
                }
            }
        }
    }
    
    pick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = this.width/2;
        const cy = this.height/2;
        const dx = x - cx;
        const dy = y - cy;
        const d = Math.sqrt(dx*dx + dy*dy);
        
        if (d <= this.radius && this.tWell) {
            const angle = Math.atan2(dy, dx);
            const hue = (angle + Math.PI) / (Math.PI * 2) * 360;
            const sat = d / this.radius * 100;
            
            const rgb = this.hslToRgb(hue/360, sat/100, 0.5);
            const hex = '#' + rgb.map(v => Math.round(v*255).toString(16).padStart(2,'0')).join('');
            
            this.tWell.style.background = hex;
            if(this.tArr && this.tIdx !== null) {
                this.tArr[this.tIdx] = hexToColor(hex);
            }
        }
    }
    
    open(well, arr, idx) {
        this.tWell = well;
        this.tArr = arr;
        this.tIdx = idx;
        this.originalColor.copy(arr[idx]);
        this.modal.style.display = 'block';
    }

    cancel() {
        if (!this.tArr || this.tIdx === null) return;
        this.modal.style.display = 'none';
        
        const startColor = this.tArr[this.tIdx].clone();
        const targetColor = this.originalColor.clone();
        const startTime = performance.now();
        const duration = 500;
        
        const arr = this.tArr;
        const idx = this.tIdx;
        const well = this.tWell;
        
        const lerpLoop = (now) => {
            const t = Math.min((now - startTime) / duration, 1.0);
            const easeOut = Math.sin(t * Math.PI / 2);
            
            const current = startColor.clone().lerp(targetColor, easeOut);
            arr[idx].copy(current);
            
            if (well) {
                const hex = '#' + current.getHexString();
                well.style.background = hex;
            }

            if (t < 1.0) {
                requestAnimationFrame(lerpLoop);
            }
        };
        requestAnimationFrame(lerpLoop);
        
        this.tArr = null;
        this.tIdx = null;
        this.tWell = null;
    }
    
    close() {
        this.modal.style.display = 'none';
        this.tArr = null;
        this.tIdx = null;
        this.tWell = null;
    }

    hslToRgb(h, s, l){
        let r, g, b;
        if(s === 0){ r = g = b = l; }
        else{
            const hue2rgb = (p, q, t) => {
                if(t < 0) t += 1;
                if(t > 1) t -= 1;
                if(t < 1/6) return p + (q - p) * 6 * t;
                if(t < 1/2) return q;
                if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return [r, g, b];
    }
}

// ── MOTOR ─────────────────────────────────────────────────────────────────────
class FluidEngine {
    constructor() {
        this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        // autoClear true por defecto para pases de simulación
        document.getElementById('app').appendChild(this.renderer.domElement);

        this.camera = new THREE.Camera();
        this.scene  = new THREE.Scene();
        this.quad   = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
        this.scene.add(this.quad);

        this.buildBuffers();
        this.buildMaterials();
        this.buildUI();
        this.buildBorderFX();
        this.buildParticles();

        this.mouse       = new THREE.Vector2(-1, -1);
        this.targetMouse = new THREE.Vector2(-1, -1);
        this.prevMouse   = new THREE.Vector2(-1, -1);
        this.queue       = [];
        this.t           = 0;

        // Eliminamos el listener duplicado de aquí, se gestiona en buildUI()

        // Soporte de captura global para que el fluido responda incluso sobre textos
        // Soporte de interacción simplificado: escuchamos directamente en el canvas
        // Así, cualquier elemento UI con pointer-events: auto bloqueará el fluido de forma nativa.
        const canvas = this.renderer.domElement;
        const handleInteraction = (x, y) => {
            this.targetMouse.set(x, y);
            if (this.mouse.x < 0) {
                this.mouse.set(x, y);
                this.prevMouse.set(x, y);
            }
        };

        canvas.addEventListener('mousemove', e => {
            handleInteraction(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
        });

        canvas.addEventListener('touchstart', e => {
            if (e.touches.length > 0) {
                const touch = e.touches[0];
                handleInteraction(touch.clientX / window.innerWidth, 1 - touch.clientY / window.innerHeight);
            }
        }, { passive: true });

        canvas.addEventListener('touchmove', e => {
            if (e.touches.length > 0) {
                const touch = e.touches[0];
                handleInteraction(touch.clientX / window.innerWidth, 1 - touch.clientY / window.innerHeight);
            }
        }, { passive: true });

        canvas.addEventListener('touchend', () => this.targetMouse.set(-1, -1));
        window.addEventListener('mouseup', () => this.targetMouse.set(-1, -1));

        window.addEventListener('resize', () => {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            if (this.mSplat) this.mSplat.uniforms.uAsp.value = window.innerWidth / window.innerHeight;
            if (this.bfx) {
                this.bfx.width = window.innerWidth;
                this.bfx.height = window.innerHeight;
            }
        });

        this.animate();
    }

    dblBuf(w, h, filter = THREE.LinearFilter) {
        const p = { type: THREE.FloatType, format: THREE.RGBAFormat, minFilter: filter, magFilter: filter };
        return {
            read:  new THREE.WebGLRenderTarget(w, h, p),
            write: new THREE.WebGLRenderTarget(w, h, p),
            swap() { const t = this.read; this.read = this.write; this.write = t; }
        };
    }

    buildBuffers() {
        const p = { type: THREE.FloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter };
        this.bDens = this.dblBuf(cfg.DYE_RES, cfg.DYE_RES);
        this.bVel  = this.dblBuf(cfg.SIM_RES, cfg.SIM_RES);
        this.bPrs  = this.dblBuf(cfg.SIM_RES, cfg.SIM_RES);
        this.bDiv  = new THREE.WebGLRenderTarget(cfg.SIM_RES, cfg.SIM_RES, p);
        this.bCurl = new THREE.WebGLRenderTarget(cfg.SIM_RES, cfg.SIM_RES, p);
    }

    rebuildBuffers() {
        [this.bDens, this.bVel, this.bPrs].forEach(b => { b.read.dispose(); b.write.dispose(); });
        [this.bDiv, this.bCurl].forEach(b => b.dispose());
        this.buildBuffers();
        this.buildMaterials();
        this.buildParticles();
    }

    buildParticles() {
        const res = cfg.PART_RES;
        const data = new Float32Array(res * res * 4);
        for(let i=0; i<res*res; i++) {
            data[i*4]   = Math.random();
            data[i*4+1] = Math.random();
            data[i*4+2] = Math.random(); // Variación individual
            data[i*4+3] = 1.0;
        }
        const tex = new THREE.DataTexture(data, res, res, THREE.RGBAFormat, THREE.FloatType);
        tex.minFilter = tex.magFilter = THREE.NearestFilter;
        tex.needsUpdate = true;

        this.bPart = this.dblBuf(res, res, THREE.NearestFilter);
        
        // Material de simulación
        this.mPartSim = new THREE.ShaderMaterial({
            vertexShader: baseVS, fragmentShader: partSimFS,
            uniforms: { uPos:{value:null}, uVel:{value:null}, uInit:{value:tex}, uDt:{value:0.016}, uSpeed:{value:cfg.SPEED} }
        });

        // Material de renderizado
        const geo = new THREE.BufferGeometry();
        const uvs = new Float32Array(res * res * 2);
        for(let i=0; i<res*res; i++) {
            uvs[i*2]   = (i % res) / res;
            uvs[i*2+1] = Math.floor(i / res) / res;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(res*res*3), 3));
        geo.setAttribute('aUv', new THREE.BufferAttribute(uvs, 2));
        
        this.mPartRender = new THREE.ShaderMaterial({
            vertexShader: partRenderVS, fragmentShader: partRenderFS,
            transparent: true, blending: THREE.AdditiveBlending, depthTest: false,
            uniforms: { uPos:{value:null}, uCol:{value:new THREE.Color(0xffffff)}, uSize:{value:cfg.PART_SIZE}, uOp:{value:cfg.PART_OP} }
        });
        this.partPoints = new THREE.Points(geo, this.mPartRender);
        this.partPoints.frustumCulled = false;
    }

    buildMaterials() {
        const tex = new THREE.Vector2(1 / cfg.SIM_RES, 1 / cfg.SIM_RES);
        const asp = window.innerWidth / window.innerHeight;

        this.mAdv = new THREE.ShaderMaterial({ vertexShader: baseVS, fragmentShader: advFS,
            uniforms: { uVel:{value:null}, uSrc:{value:null}, uTex:{value:tex}, uDt:{value:0.016}, uDiss:{value:cfg.DISS} }
        });
        this.mSplat = new THREE.ShaderMaterial({ vertexShader: baseVS, fragmentShader: splatFS,
            uniforms: { uTgt:{value:null}, uPt:{value:new THREE.Vector2()}, uCol:{value:new THREE.Vector3()}, uRad:{value:cfg.RADIUS}, uAsp:{value:asp} }
        });
        this.mDiv = new THREE.ShaderMaterial({ vertexShader: baseVS, fragmentShader: divFS,
            uniforms: { uVel:{value:null}, uTex:{value:tex} }
        });
        this.mPrs = new THREE.ShaderMaterial({ vertexShader: baseVS, fragmentShader: pressFS,
            uniforms: { uPrs:{value:null}, uDiv:{value:null}, uTex:{value:tex} }
        });
        this.mGrad = new THREE.ShaderMaterial({ vertexShader: baseVS, fragmentShader: gradFS,
            uniforms: { uPrs:{value:null}, uVel:{value:null}, uTex:{value:tex} }
        });
        this.mCurl = new THREE.ShaderMaterial({ vertexShader: baseVS, fragmentShader: curlFS,
            uniforms: { uVel:{value:null}, uTex:{value:tex} }
        });
        this.mVort = new THREE.ShaderMaterial({ vertexShader: baseVS, fragmentShader: vortFS,
            uniforms: { uVel:{value:null}, uCurl:{value:null}, uTex:{value:tex}, uCurlScale:{value:cfg.CURL}, uDt:{value:0.016} }
        });
        this.mDisp = new THREE.ShaderMaterial({ vertexShader: baseVS, fragmentShader: displayFS,
            uniforms: { uTex:{value:null}, uGlow:{value:cfg.GLOW}, uContrast:{value:cfg.CONTRAST}, uSat:{value:cfg.SAT}, uAdvBloom:{value:0.0}, uNoise:{value:cfg.NOISE}, uTime:{value:0.0} }
        });
        this.mBlur = new THREE.ShaderMaterial({ vertexShader: baseVS, fragmentShader: blurFS,
            uniforms: { uTex:{value:null}, uTexSize:{value:tex}, uAmt:{value:0.0} }
        });
    }

    // ── UI ────────────────────────────────────────────────────────────────────
    buildUI() {
        // Fidelity
        document.querySelectorAll('.fid-btn[data-sim]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.fid-btn[data-sim]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                cfg.SIM_RES = parseInt(btn.dataset.sim);
                cfg.DYE_RES = parseInt(btn.dataset.dye);
                this.rebuildBuffers();
            });
        });

        // Sliders
        this.sl('p-glow',     v => { cfg.GLOW      = v; this.mDisp.uniforms.uGlow.value = v; });
        this.sl('p-contrast', v => { cfg.CONTRAST  = v; this.mDisp.uniforms.uContrast.value = v; });
        this.sl('p-sat',      v => { cfg.SAT       = v; this.mDisp.uniforms.uSat.value = v; });
        this.sl('p-noise',    v => { cfg.NOISE     = v; this.mDisp.uniforms.uNoise.value = v; });
        this.sl('p-vort',     v => { cfg.CURL      = v; this.mVort.uniforms.uCurlScale.value = v; });
        this.sl('p-diss',     v => { cfg.DISS      = v; });
        this.sl('p-speed',    v => { cfg.SPEED     = v; });
        this.sl('p-inflow',   v => { cfg.INFLOW    = v; });
        this.sl('p-bthick',   v => { cfg.B_THICK   = v; });
        this.sl('p-bint',     v => { cfg.B_INT     = v; });
        this.sl('p-bspd',     v => { cfg.B_SPD     = v; });
        this.sl('p-lazy',     v => { cfg.LAZY_VAL  = v; });
        this.sl('p-visc',     v => { cfg.VISC      = v; });
        this.sl('p-bspeed',   v => { cfg.BOX_SPEED = v; });
        this.sl('p-bspread',  v => { cfg.BOX_SPREAD= v; });

        this.sl('p-torturb',  v => { cfg.TOR_TURB = v; });
        this.sl('p-torvel',   v => { cfg.TOR_VEL = v; });
        this.sl('p-torpers',  v => { cfg.TOR_PERS = v; });
        this.sl('p-torglow',  v => { cfg.TOR_GLOW = v; });
        this.sl('p-torinflow',v => { cfg.TOR_INFLOW = v; });
        this.sl('p-torradvel',v => { cfg.TOR_RADVEL = v; });
        this.sl('p-torradspr',v => { cfg.TOR_RADSPR = v; });
        this.sl('p-torcont',  v => { cfg.TOR_CONT = v; });

        // Toggles
        this.tog('tog-mix',       v => { cfg.MIX    = v; });
        this.tog('tog-bg',        v => { cfg.BG     = v; });
        this.tog('tog-jelly',     v => { cfg.JELLY  = v; });
        this.tog('tog-lazy',      v => { cfg.LAZY   = v; });
        this.tog('tog-torenable', v => { cfg.TOR_ENABLE = v; });
        this.tog('tog-torhoriz',  v => { cfg.TOR_HORIZ = v; });
        this.tog('tog-bloom',     v => { this.mDisp.uniforms.uAdvBloom.value = v ? 1.0 : 0.0; });
        this.tog('tog-border',    v => {
            cfg.BORDER = v;
            document.getElementById('border-fx').style.display = v ? 'block' : 'none';
        });

        // Box dir buttons
        ['l','r','t','b'].forEach(d => {
            const btn = document.getElementById('btn-dir-' + d);
            if(btn) {
                btn.onclick = (e) => {
                    console.log("Clic en boton:", d);
                    try {
                        document.querySelectorAll('[id^="btn-dir-"]').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        cfg.BOX_DIR = d === 'l' ? 'left' : d === 'r' ? 'right' : d === 't' ? 'top' : 'bot';
                    } catch (err) {
                        console.error("Error al pulsar boton de direccion:", err);
                    }
                };
            }
        });

        // Paletas custom Color Picker
        this.colorPicker = new ColorPicker();
        
        this.initPalette('main-palette', cfg.mainColors, true);
        this.initPalette('box-palette', cfg.boxColors, false);
        document.getElementById('add-main').addEventListener('click', () => this.addWell('main-palette', cfg.mainColors, 'cw'));
        document.getElementById('rem-main').addEventListener('click', () => this.remWell('main-palette', cfg.mainColors, 'cw'));
        document.getElementById('add-box').addEventListener('click', () => this.addWell('box-palette', cfg.boxColors, 'bcw'));
        document.getElementById('rem-box').addEventListener('click', () => this.remWell('box-palette', cfg.boxColors, 'bcw'));
        
        document.querySelectorAll('.tcw').forEach((el, i) => this.attachWell(el, i, cfg.torColors, false));
        document.getElementById('add-tor').addEventListener('click', () => this.addWell('tor-palette', cfg.torColors, 'tcw'));
        document.getElementById('rem-tor').addEventListener('click', () => this.remWell('tor-palette', cfg.torColors, 'tcw'));

        window.addEventListener('section-change', e => {
            const idx = e.detail.index;
            // Si llegamos al footer (index 5), forzamos una explosión roja
            if (idx === 5) {
                this.triggerSectionSplash(5);
            } else {
                this.triggerSectionSplash(idx);
            }
        });

        window.addEventListener('vfx-update', e => {
            const { id, state } = e.detail;
            if (id === 'tog-vfx-particles') {
                cfg.PARTICLES = state;
                // No ocultamos el subpanel aquí, ya que ahora es un acordeón manual
            }
        });

        window.addEventListener('color-change', e => {
            cfg.ACTIVE_IDX = e.detail.index;
        });

        // Acordeón Particles
        const headPart = document.getElementById('head-particles');
        const subPart  = document.getElementById('sub-particles');
        if (headPart && subPart) {
            headPart.addEventListener('click', e => {
                // Si hizo clic en el toggle, no colapsar/expandir
                if (e.target.classList.contains('tog')) return;
                const isHidden = subPart.style.display === 'none';
                subPart.style.display = isHidden ? 'block' : 'none';
            });
        }

        // Sliders Partículas
        this.sl('p-psize',    v => { cfg.PART_SIZE = v; this.mPartRender.uniforms.uSize.value = v; });
        this.sl('p-pop',      v => { cfg.PART_OP = v;   this.mPartRender.uniforms.uOp.value = v; });
        this.sl('p-pspeed',   v => { cfg.PART_SPEED = v; });
        this.sl('p-pcurl',    v => { cfg.CURL = v; });
        this.sl('p-pveldiss', v => { cfg.VEL_DISS = v; });
    }

    sl(id, cb) {
        const el   = document.getElementById(id);
        const valId = 'v-' + id.split('-')[1];
        const disp = document.getElementById(valId);
        if (!el) return;
        el.addEventListener('input', e => {
            const v = parseFloat(e.target.value);
            if (disp) disp.textContent = id === 'p-vort' ? Math.round(v) : v.toFixed(2);
            cb(v);
        });
    }

    tog(id, cb) {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('click', () => {
            console.log("Toggle clic:", id);
            try {
                el.classList.toggle('on');
                cb(el.classList.contains('on'));
            } catch (err) {
                console.error("Error en toggle", id, err);
            }
        });
    }

    initPalette(containerId, arr, isMain) {
        const wells = document.querySelectorAll(`#${containerId} .${isMain ? 'cw' : 'bcw'}`);
        wells.forEach((well, i) => this.attachWell(well, i, arr, isMain));
    }

    attachWell(well, i, arr, isMain) {
        // Doble click → abre el color picker CUSTOM
        well.addEventListener('dblclick', e => {
            e.preventDefault();
            e.stopPropagation();
            this.colorPicker.open(well, arr, i);
        });

        // Click simple → solo para paleta principal: seleccionar color
        if (isMain) {
            well.addEventListener('click', e => {
                if (e.detail >= 2) return; // ignorar el click del dblclick
                document.querySelectorAll('#main-palette .cw').forEach(w => w.classList.remove('sel'));
                well.classList.add('sel');
                cfg.ACTIVE_IDX = i;
            });
        }
    }

    addWell(containerId, arr, typeClass) {
        const wrap = document.getElementById(containerId);
        const hex  = '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
        const well = document.createElement('div');
        well.className = typeClass === true ? 'cw' : (typeClass === false ? 'bcw' : typeClass);
        well.style.background = hex;
        wrap.appendChild(well);
        arr.push(hexToColor(hex));
        this.attachWell(well, arr.length - 1, arr, well.className === 'cw');
    }

    remWell(containerId, arr, typeClass) {
        const wrap  = document.getElementById(containerId);
        const qClass = typeClass ? '.' + typeClass : '.cw, .bcw, .tcw';
        const nodes = wrap.querySelectorAll(qClass);
        if (nodes.length <= 1) return;
        nodes[nodes.length - 1].remove();
        arr.pop();
    }

    // ── Border FX ─────────────────────────────────────────────────────────────
    buildBorderFX() {
        this.bfx  = document.getElementById('border-fx');
        this.bctx = this.bfx.getContext('2d');
        this.bfx.width  = window.innerWidth;
        this.bfx.height = window.innerHeight;
        // Mostrar el canvas de borde si está activo por defecto
        if (cfg.BORDER) this.bfx.style.display = 'block';
    }

    drawBorder(t) {
        const ctx = this.bctx;
        const W   = this.bfx.width;
        const H   = this.bfx.height;
        const th  = cfg.B_THICK;
        const pulse = (Math.sin(t * cfg.B_SPD * 2.5) * 0.5 + 0.5) * cfg.B_INT;
        ctx.clearRect(0, 0, W, H);

        const draw = (x0, y0, x1, y1, rx0, ry0, rx1, ry1, hex) => {
            const r = parseInt(hex.slice(1,3),16);
            const g = parseInt(hex.slice(3,5),16);
            const b = parseInt(hex.slice(5,7),16);
            const grad = ctx.createLinearGradient(rx0, ry0, rx1, ry1);
            grad.addColorStop(0, `rgba(${r},${g},${b},${pulse})`);
            grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
            ctx.fillStyle = grad;
            ctx.fillRect(x0, y0, x1, y1);
        };

        draw(0,    0,    W,  th,     0, 0,    0, th,      '#00f2ff'); // top
        draw(0,    H-th, W,  th,     0, H,    0, H-th,    '#00f2ff'); // bottom
        draw(0,    0,    th, H,      0, 0,    th, 0,       '#7000ff'); // left
        draw(W-th, 0,    th, H,      W, 0,    W-th, 0,    '#7000ff'); // right
    }

    // ── Render ────────────────────────────────────────────────────────────────
    pass(mat, target) {
        this.quad.material = mat;
        this.renderer.setRenderTarget(target);
        this.renderer.render(this.scene, this.camera);
    }

    splat(x, y, dx, dy, col, rad) {
        const r = rad ?? cfg.RADIUS;

        this.mSplat.uniforms.uTgt.value = this.bVel.read.texture;
        this.mSplat.uniforms.uPt.value.set(x, y);
        this.mSplat.uniforms.uCol.value.set(dx, dy, 0);
        this.mSplat.uniforms.uRad.value = r;
        this.pass(this.mSplat, this.bVel.write);
        this.bVel.swap();

        if (col !== null) {
            this.mSplat.uniforms.uTgt.value = this.bDens.read.texture;
            this.mSplat.uniforms.uCol.value.set(col.r, col.g, col.b);
            this.pass(this.mSplat, this.bDens.write);
            this.bDens.swap();
        }
    }

    triggerSectionSplash(idx) {
        if (cfg.BG) {
            for (let i = 0; i < 5; i++) {
                const px = Math.random();
                const py = Math.random();
                const vx = (Math.random() - 0.5) * 20000;
                const vy = (Math.random() - 0.5) * 20000;
                this.splat(px, py, vx, vy, new THREE.Color(0), 0.02);
            }
            return;
        }

        if (!cfg.TOR_ENABLE) return;
        
        // Sincronizar aspect ratio para asegurar centrado horizontal perfecto (0.5) en móviles
        if (this.mSplat) this.mSplat.uniforms.uAsp.value = window.innerWidth / window.innerHeight;

        const cIdx = idx % cfg.torColors.length;
        const baseC = cfg.torColors[cIdx];
        
        // Centro de explosión ajustado a 0.52 para compensar el peso visual de los textos principales
        const cx = 0.5;
        const cy = 0.52; 
        
        // Multiplicador de intensidad usando el parámetro local TOR_GLOW
        const col = { r: baseC.r * cfg.TOR_GLOW, g: baseC.g * cfg.TOR_GLOW, b: baseC.b * cfg.TOR_GLOW };

        // 1. Efecto Expansivo Radial Suave (Smoke Speed y Smoke Spread locales)
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const dx = Math.cos(angle) * cfg.TOR_RADVEL;
            const dy = Math.sin(angle) * cfg.TOR_RADVEL;
            this.splat(cx, cy, dx, dy, null, cfg.TOR_RADSPR * cfg.TOR_INFLOW);
        }

        // 2. Doble Chorro Dipolo
        const turb = cfg.TOR_TURB;
        if (cfg.TOR_HORIZ) {
            this.splat(cx + cfg.TOR_CONT, cy,  cfg.TOR_VEL, (Math.random()-0.5)*turb, col, cfg.TOR_PERS * cfg.TOR_INFLOW);
            this.splat(cx - cfg.TOR_CONT, cy, -cfg.TOR_VEL, (Math.random()-0.5)*turb, col, cfg.TOR_PERS * cfg.TOR_INFLOW);
        } else {
            this.splat(cx, cy + cfg.TOR_CONT, (Math.random()-0.5)*turb,  cfg.TOR_VEL, col, cfg.TOR_PERS * cfg.TOR_INFLOW);
            this.splat(cx, cy - cfg.TOR_CONT, (Math.random()-0.5)*turb, -cfg.TOR_VEL, col, cfg.TOR_PERS * cfg.TOR_INFLOW);
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.t += 0.016;

        // LAZY MOUSE INTERPOLATION
        if (this.targetMouse.x >= 0) {
            if (cfg.LAZY) {
                this.mouse.x += (this.targetMouse.x - this.mouse.x) * cfg.LAZY_VAL;
                this.mouse.y += (this.targetMouse.y - this.mouse.y) * cfg.LAZY_VAL;
            } else {
                this.mouse.copy(this.targetMouse);
            }

            const dx = (this.mouse.x - this.prevMouse.x) * cfg.FORCE * (cfg.SPEED / 5);
            const dy = (this.mouse.y - this.prevMouse.y) * cfg.FORCE * (cfg.SPEED / 5);
            if (Math.abs(dx) + Math.abs(dy) > 0.0001) {
                this.queue.push({ x: this.mouse.x, y: this.mouse.y, dx, dy });
            }
            this.prevMouse.copy(this.mouse);
        }

        // BOX SMOKE: flujo denso custom
        if (cfg.BG) {
            const n = Math.max(1, Math.round(Number(cfg.INFLOW) * 2));
            for (let i = 0; i < n; i++) {
                const pos = (i + Math.random()) / n;
                const offset = (pos - 0.5) * Number(cfg.BOX_SPREAD) + 0.5;
                const col = cfg.boxColors[Math.floor(Math.random() * cfg.boxColors.length)];
                
                let px = 0.5, py = 0.5, vx = 0, vy = 0;
                const speed = Number(cfg.BOX_SPEED) * Number(cfg.INFLOW);

                if (cfg.BOX_DIR === 'left') {
                    px = 0.05; py = offset;
                    vx = speed; vy = (Math.random() - 0.5) * 1.5;
                } else if (cfg.BOX_DIR === 'right') {
                    px = 0.95; py = offset;
                    vx = -speed; vy = (Math.random() - 0.5) * 1.5;
                } else if (cfg.BOX_DIR === 'top') {
                    px = offset; py = 0.95;
                    vx = (Math.random() - 0.5) * 1.5; vy = -speed;
                } else if (cfg.BOX_DIR === 'bot') { // bot
                    px = offset; py = 0.05;
                    vx = (Math.random() - 0.5) * 1.5; vy = speed;
                }
                
                if (Number.isFinite(px) && Number.isFinite(py) && Number.isFinite(vx) && Number.isFinite(vy)) {
                    this.splat(px, py, vx, vy, col, 0.003);
                }
            }
        }

        // ADVECCIÓN
        this.mAdv.uniforms.uVel.value  = this.bVel.read.texture;
        this.mAdv.uniforms.uSrc.value  = this.bVel.read.texture;
        this.mAdv.uniforms.uDiss.value = cfg.VEL_DISS;
        this.pass(this.mAdv, this.bVel.write); this.bVel.swap();

        this.mAdv.uniforms.uSrc.value  = this.bDens.read.texture;
        this.mAdv.uniforms.uDiss.value = cfg.DISS;
        this.pass(this.mAdv, this.bDens.write); this.bDens.swap();

        // VISCOSIDAD (BLUR VELOCITY)
        if (cfg.VISC > 0) {
            this.mBlur.uniforms.uTex.value = this.bVel.read.texture;
            this.mBlur.uniforms.uAmt.value = cfg.VISC * 0.2; // Escalar a un rango razonable
            this.pass(this.mBlur, this.bVel.write); this.bVel.swap();
        }

        // VORTICIDAD
        this.mCurl.uniforms.uVel.value  = this.bVel.read.texture;
        this.pass(this.mCurl, this.bCurl);
        this.mVort.uniforms.uVel.value  = this.bVel.read.texture;
        this.mVort.uniforms.uCurl.value = this.bCurl.texture;
        this.pass(this.mVort, this.bVel.write); this.bVel.swap();

        // SPLATS RATÓN
        this.queue.forEach(s => {
            let col;
            if (cfg.BG) {
                col = new THREE.Color(0, 0, 0); // solo empuja, no pinta
            } else {
                col = cfg.MIX
                    ? cfg.mainColors[Math.floor(Math.random() * cfg.mainColors.length)]
                    : (cfg.mainColors[cfg.ACTIVE_IDX] ?? cfg.mainColors[0]);
            }
            this.splat(s.x, s.y, s.dx, s.dy, col);
        });
        this.queue = [];

        // PROYECCIÓN DE PRESIÓN
        this.mDiv.uniforms.uVel.value = this.bVel.read.texture;
        this.pass(this.mDiv, this.bDiv);

        // JELLY PHYSICS: Reduce iteraciones de presión drásticamente si está apagado
        const pIter = cfg.JELLY ? cfg.PRESSURE_ITER : 4;
        for (let i = 0; i < pIter; i++) {
            this.mPrs.uniforms.uPrs.value = this.bPrs.read.texture;
            this.mPrs.uniforms.uDiv.value = this.bDiv.texture;
            this.pass(this.mPrs, this.bPrs.write); this.bPrs.swap();
        }

        this.mGrad.uniforms.uPrs.value = this.bPrs.read.texture;
        this.mGrad.uniforms.uVel.value = this.bVel.read.texture;
        this.pass(this.mGrad, this.bVel.write); this.bVel.swap();

        // Simulación de Partículas
        if (cfg.PARTICLES) {
            this.mPartSim.uniforms.uPos.value = this.bPart.read.texture;
            this.mPartSim.uniforms.uVel.value = this.bVel.read.texture;
            this.mPartSim.uniforms.uSpeed.value = cfg.SPEED * cfg.PART_SPEED;
            this.mPartSim.uniforms.uDt.value = 0.016;
            this.pass(this.mPartSim, this.bPart.write);
            this.bPart.swap();
        }

        // DISPLAY
        this.mDisp.uniforms.uTex.value = this.bDens.read.texture;
        this.mDisp.uniforms.uTime.value = performance.now() / 1000.0;
        this.pass(this.mDisp, null);

        // Renderizado de Partículas (encima del fluido)
        if (cfg.PARTICLES) {
            const activeCol = cfg.mainColors[cfg.ACTIVE_IDX] || new THREE.Color(0xffffff);
            this.mPartRender.uniforms.uPos.value = this.bPart.read.texture;
            this.mPartRender.uniforms.uCol.value.copy(activeCol).lerp(new THREE.Color(0xffffff), 0.3);
            this.renderer.autoClear = false; // No borrar el fluido
            this.renderer.render(this.partPoints, this.camera);
            this.renderer.autoClear = true;  // Restaurar para el siguiente frame
        }

        // BORDER
        if (cfg.BORDER) this.drawBorder(this.t);
    }
}

new FluidEngine();
