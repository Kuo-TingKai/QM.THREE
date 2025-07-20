import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Quantum mechanics constants and parameters
const PLANCK_CONSTANT = 6.626e-34;
const MASS = 9.109e-31; // electron mass
const BOX_LENGTH = 1e-9; // 1 nm box
const ENERGY_SCALE = 1e-19; // Energy scale for visualization

class QuantumVisualizer {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Add WebGL error handling and fallback
        let renderer;
        try {
            // Try different WebGL contexts for better compatibility
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || 
                      canvas.getContext('experimental-webgl') || 
                      canvas.getContext('webgl2');
            
            if (!gl) {
                throw new Error('WebGL not supported');
            }
            
            // Test WebGL capabilities
            const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
            const maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
            
            console.log('WebGL capabilities:', {
                maxTextureSize,
                maxViewportDims,
                userAgent: navigator.userAgent
            });
            
            renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: false,
                powerPreference: "default",
                failIfMajorPerformanceCaveat: false
            });
            
        } catch (error) {
            console.error('WebGL initialization failed:', error);
            this.showWebGLError();
            return;
        }
        
        this.renderer = renderer;
        this.clock = new THREE.Clock();
        this.controls = null;
        
        this.time = 0;
        this.timeSpeed = 1.0;
        this.isPaused = false;
        this.quantumNumberX = 3;
        this.quantumNumberY = 4;
        this.displayMode = 'all';
        
        this.points = [];
        this.lines = {
            real: null,
            imaginary: null,
            probability: null
        };
        // Removed particles array
        
        this.init();
        this.setupControls();
        this.animate();
    }
    
    showWebGLError() {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            z-index: 1000;
            font-family: 'Orbitron', monospace;
        `;
        errorDiv.innerHTML = `
            <h3>WebGL Error</h3>
            <p>Your browser or environment doesn't support WebGL.</p>
            <p>Try using a different browser or device.</p>
        `;
        document.body.appendChild(errorDiv);
    }
    
    init() {
        // Setup renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x111111); // Slightly lighter background
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);
        
        // Setup orbit controls for manual camera adjustment
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.maxPolarAngle = Math.PI;
        
        // Setup camera with responsive positioning (after controls are initialized)
        this.setupCamera();
        
        // Detect browser environment
        this.detectBrowserEnvironment();
        
        // Setup scene
        this.setupScene();
        this.createWaveFunction();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Add console log for debugging
        console.log('QuantumVisualizer initialized successfully');
    }
    
    setupCamera() {
        // Check if mobile device
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // Mobile: further back and higher up to avoid UI panels
            this.camera.position.set(3, 3, 4);
            this.camera.lookAt(0, 0, 0);
            
            // Adjust orbit controls for mobile
            this.controls.minDistance = 2;
            this.controls.maxDistance = 15;
        } else {
            // Desktop: closer view for better detail
            this.camera.position.set(2, 2, 2);
            this.camera.lookAt(0, 0, 0);
            
            // Standard orbit controls
            this.controls.minDistance = 1;
            this.controls.maxDistance = 10;
        }
    }
    
    detectBrowserEnvironment() {
        const userAgent = navigator.userAgent.toLowerCase();
        const isInAppBrowser = 
            userAgent.includes('messenger') || 
            userAgent.includes('facebook') || 
            userAgent.includes('instagram') || 
            userAgent.includes('whatsapp') ||
            userAgent.includes('line') ||
            userAgent.includes('telegram');
        
        if (isInAppBrowser) {
            console.log('Detected in-app browser, applying compatibility mode');
            this.showInAppBrowserWarning();
        }
        
        return isInAppBrowser;
    }
    
    showInAppBrowserWarning() {
        const warningDiv = document.createElement('div');
        warningDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 165, 0, 0.95);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            z-index: 1000;
            font-family: 'Orbitron', monospace;
            max-width: 300px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        `;
        warningDiv.innerHTML = `
            <h3>⚠️ 瀏覽器相容性</h3>
            <p>檢測到您正在使用應用內瀏覽器。</p>
            <p>建議使用系統瀏覽器以獲得最佳體驗。</p>
            <button onclick="this.parentElement.remove()" style="
                background: #0080ff;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                margin-top: 10px;
                cursor: pointer;
                font-family: 'Orbitron', monospace;
            ">知道了</button>
        `;
        document.body.appendChild(warningDiv);
    }
    
    setupScene() {
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
        this.scene.add(ambientLight);
        
        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);
        
        // Removed coordinate axes for cleaner visualization
        
        // Create 2D potential well boundaries
        const boundaryMaterial = new THREE.LineBasicMaterial({ 
            color: 0x888888, 
            linewidth: 3 
        });
        
        // Left boundary
        const leftBoundaryGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-1, -1, 0),
            new THREE.Vector3(-1, 1, 0)
        ]);
        const leftBoundary = new THREE.Line(leftBoundaryGeometry, boundaryMaterial);
        this.scene.add(leftBoundary);
        
        // Right boundary
        const rightBoundaryGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(1, -1, 0),
            new THREE.Vector3(1, 1, 0)
        ]);
        const rightBoundary = new THREE.Line(rightBoundaryGeometry, boundaryMaterial);
        this.scene.add(rightBoundary);
        
        // Top boundary
        const topBoundaryGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-1, 1, 0),
            new THREE.Vector3(1, 1, 0)
        ]);
        const topBoundary = new THREE.Line(topBoundaryGeometry, boundaryMaterial);
        this.scene.add(topBoundary);
        
        // Bottom boundary
        const bottomBoundaryGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-1, -1, 0),
            new THREE.Vector3(1, -1, 0)
        ]);
        const bottomBoundary = new THREE.Line(bottomBoundaryGeometry, boundaryMaterial);
        this.scene.add(bottomBoundary);
        
        // Removed grid for cleaner visualization
    }
    
    // Removed addAxisLabels method for cleaner visualization
    
    // Removed particle effects for cleaner visualization
    
    // Calculate the 2D wave function for infinite potential well
    calculateWaveFunction(x, y, t, nx, ny) {
        // Use simplified units for better visualization
        // Scale time and energy for visible oscillations
        const scaledTime = t * 0.1; // Slow down time evolution
        const scaledEnergy = nx * nx + ny * ny; // 2D energy scale
        
        // Angular frequency: ω = E (in simplified units)
        const omega = scaledEnergy;
        
        // Time evolution factor: e^(-iωt) = cos(ωt) - i*sin(ωt)
        const cosOmegaT = Math.cos(omega * scaledTime);
        const sinOmegaT = Math.sin(omega * scaledTime);
        
        // Normalize coordinates to [0, 1] range
        const normalizedX = (x + 1) / 2;
        const normalizedY = (y + 1) / 2;
        
        // 2D spatial part of wave function: ψ_nx,ny(x,y) = 2 * sin(nxπx) * sin(nyπy)
        const spatialPartX = Math.sin(nx * Math.PI * normalizedX);
        const spatialPartY = Math.sin(ny * Math.PI * normalizedY);
        const spatialPart = 2 * spatialPartX * spatialPartY;
        
        // Complete wave function: ψ(x,y,t) = ψ_nx,ny(x,y) * e^(-iωt)
        const realPart = spatialPart * cosOmegaT;
        const imaginaryPart = -spatialPart * sinOmegaT;
        
        return {
            real: realPart,
            imaginary: imaginaryPart,
            probability: realPart * realPart + imaginaryPart * imaginaryPart
        };
    }
    
    createWaveFunction() {
        // Clear existing lines
        if (this.lines.real) this.scene.remove(this.lines.real);
        if (this.lines.imaginary) this.scene.remove(this.lines.imaginary);
        if (this.lines.probability) this.scene.remove(this.lines.probability);
        
        // Create 2D surfaces for wave function visualization
        const resolution = 50;
        const scale = 0.3;
        
        // Create geometry for real part (red surface)
        const realGeometry = new THREE.PlaneGeometry(2, 2, resolution - 1, resolution - 1);
        const realMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff6666, 
            transparent: true, 
            opacity: 0.7,
            wireframe: true
        });
        
        // Create geometry for imaginary part (blue surface)
        const imaginaryGeometry = new THREE.PlaneGeometry(2, 2, resolution - 1, resolution - 1);
        const imaginaryMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x6666ff, 
            transparent: true, 
            opacity: 0.7,
            wireframe: true
        });
        
        // Create geometry for probability density (green surface)
        const probabilityGeometry = new THREE.PlaneGeometry(2, 2, resolution - 1, resolution - 1);
        const probabilityMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x66ff66, 
            transparent: true, 
            opacity: 0.8,
            wireframe: false
        });
        
        // Update vertex positions based on wave function
        this.updateSurfaceGeometry(realGeometry, 'real', scale, resolution);
        this.updateSurfaceGeometry(imaginaryGeometry, 'imaginary', scale, resolution);
        this.updateSurfaceGeometry(probabilityGeometry, 'probability', scale, resolution);
        
        // Create mesh objects
        this.lines.real = new THREE.Mesh(realGeometry, realMaterial);
        this.lines.imaginary = new THREE.Mesh(imaginaryGeometry, imaginaryMaterial);
        this.lines.probability = new THREE.Mesh(probabilityGeometry, probabilityMaterial);
        
        // Position surfaces for visibility
        this.lines.real.position.set(0, 0, 0.1);
        this.lines.imaginary.position.set(0, 0, -0.1);
        this.lines.probability.position.set(0, 0, 0);
        
        // Add surfaces to scene based on display mode
        this.updateDisplayMode();
    }
    
    updateSurfaceGeometry(geometry, type, scale, resolution) {
        const positions = geometry.attributes.position.array;
        
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const y = positions[i + 1];
            
            // Calculate wave function at this point
            const waveFunc = this.calculateWaveFunction(x, y, this.time, this.quantumNumberX, this.quantumNumberY);
            
            // Update z position based on wave function value
            let zValue = 0;
            switch (type) {
                case 'real':
                    zValue = waveFunc.real * scale;
                    break;
                case 'imaginary':
                    zValue = waveFunc.imaginary * scale;
                    break;
                case 'probability':
                    zValue = waveFunc.probability * scale;
                    break;
            }
            
            positions[i + 2] = zValue;
        }
        
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
    }
    
    updateDisplayMode() {
        // Remove all lines first
        this.scene.remove(this.lines.real);
        this.scene.remove(this.lines.imaginary);
        this.scene.remove(this.lines.probability);
        
        // Add lines based on display mode
        switch (this.displayMode) {
            case 'all':
                this.scene.add(this.lines.real);
                this.scene.add(this.lines.imaginary);
                this.scene.add(this.lines.probability);
                break;
            case 'real':
                this.scene.add(this.lines.real);
                break;
            case 'imaginary':
                this.scene.add(this.lines.imaginary);
                break;
            case 'probability':
                this.scene.add(this.lines.probability);
                break;
        }
    }
    
    setupControls() {
        // Quantum number controls for 2D
        document.getElementById('quantumNumberX').addEventListener('change', (e) => {
            this.quantumNumberX = parseInt(e.target.value);
            document.getElementById('currentNx').textContent = this.quantumNumberX;
            this.createWaveFunction();
        });
        
        document.getElementById('quantumNumberY').addEventListener('change', (e) => {
            this.quantumNumberY = parseInt(e.target.value);
            document.getElementById('currentNy').textContent = this.quantumNumberY;
            this.createWaveFunction();
        });
        
        // Time speed control
        const timeSpeedSlider = document.getElementById('timeSpeed');
        const speedValue = document.getElementById('speedValue');
        
        timeSpeedSlider.addEventListener('input', (e) => {
            this.timeSpeed = parseFloat(e.target.value);
            speedValue.textContent = this.timeSpeed.toFixed(1);
        });
        
        // Pause/Resume control
        const pauseBtn = document.getElementById('pauseBtn');
        const statusIndicator = document.querySelector('.status-indicator');
        
        pauseBtn.addEventListener('click', () => {
            this.isPaused = !this.isPaused;
            pauseBtn.textContent = this.isPaused ? 'Resume' : 'Pause';
            
            // Update status indicator
            if (this.isPaused) {
                statusIndicator.className = 'status-indicator status-paused';
                statusIndicator.parentElement.innerHTML = '<span class="status-indicator status-paused"></span><strong>System Status:</strong> Paused';
            } else {
                statusIndicator.className = 'status-indicator status-active';
                statusIndicator.parentElement.innerHTML = '<span class="status-indicator status-active"></span><strong>System Status:</strong> Running';
            }
        });
        
        // Reset control
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.time = 0;
            this.createWaveFunction();
        });
        
        // Display mode control
        document.getElementById('displayMode').addEventListener('change', (e) => {
            this.displayMode = e.target.value;
            this.updateDisplayMode();
        });
        
        // UI Toggle control for mobile
        const toggleBtn = document.getElementById('toggleUI');
        const uiContainer = document.querySelector('.ui-container');
        
        if (toggleBtn && uiContainer) {
            toggleBtn.addEventListener('click', () => {
                uiContainer.classList.toggle('hidden');
                toggleBtn.textContent = uiContainer.classList.contains('hidden') ? '📱' : '👁️';
            });
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (!this.isPaused) {
            // Update time
            const deltaTime = this.clock.getDelta();
            this.time += deltaTime * this.timeSpeed;
            
            // Update time display
            document.getElementById('time').textContent = this.time.toFixed(2);
            
            // Update wave function
            this.createWaveFunction();
        }
        
        // Update controls
        if (this.controls) {
            this.controls.update();
        }
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Re-adjust camera position for mobile/desktop
        this.setupCamera();
    }
}

// Initialize the visualizer when the page loads
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing QuantumVisualizer...');
    try {
        new QuantumVisualizer();
    } catch (error) {
        console.error('Failed to initialize QuantumVisualizer:', error);
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            z-index: 1000;
            font-family: 'Orbitron', monospace;
        `;
        errorDiv.innerHTML = `
            <h3>Initialization Error</h3>
            <p>Failed to initialize the visualization.</p>
            <p>Error: ${error.message}</p>
        `;
        document.body.appendChild(errorDiv);
    }
}); 