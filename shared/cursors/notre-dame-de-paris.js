window.referenceCursorActive = true;

(() => {
  if (window.matchMedia("(pointer: coarse)").matches) return;
        const canvas = document.getElementById('effectCanvas');
        const ctx = canvas.getContext('2d');

        let particles = [];
        let mouse = { x: -100, y: -100, targetX: -100, targetY: -100 };
        
        let isMouseDown = false;
        let pointerScale = 1.0;
        let autoRotation = 0; 

        // --- 💎 离屏高性能缓存：彻底告别卡顿与潦草线框 ---
        // 我们在内存里先用极高精度画好一张完美的彩窗贴图，随后直接在主屏“贴图映射”，速度提升数倍！
        const cacheCanvas = document.createElement('canvas');
        const cCtx = cacheCanvas.getContext('2d');
        const cacheSize = 64; 
        cacheCanvas.width = cacheSize;
        cacheCanvas.height = cacheSize;

        function preRenderRoseWindow() {
            const c = cacheSize / 2;
            const r = 24;
            cCtx.clearRect(0, 0, cacheSize, cacheSize);
            
            // 1. 极致精细的玫瑰窗立体石质金属边框
            cCtx.strokeStyle = '#d1b58a';
            cCtx.lineWidth = 1.5;
            cCtx.beginPath(); cCtx.arc(c, c, r, 0, Math.PI * 2); cCtx.stroke();
            cCtx.lineWidth = 0.8;
            cCtx.beginPath(); cCtx.arc(c, c, r * 0.5, 0, Math.PI * 2); cCtx.stroke();
            cCtx.beginPath(); cCtx.arc(c, c, r * 0.2, 0, Math.PI * 2); cCtx.stroke();

            // 2. 12瓣法式玻璃色彩渲染（半透明通透质感）
            cCtx.save();
            cCtx.translate(c, c);
            for (let i = 0; i < 12; i++) {
                cCtx.rotate(Math.PI / 6);
                cCtx.strokeStyle = '#d1b58a';
                cCtx.lineWidth = 0.6;
                cCtx.beginPath(); cCtx.moveTo(0, 0); cCtx.lineTo(0, r); cCtx.stroke();

                cCtx.globalCompositeOperation = 'destination-over';
                cCtx.fillStyle = i % 2 === 0 ? 'rgba(184, 47, 24, 0.6)' : 'rgba(42, 77, 124, 0.5)';
                cCtx.beginPath(); cCtx.moveTo(0, 0); cCtx.arc(0, 0, r, 0, Math.PI / 6); cCtx.closePath(); cCtx.fill();
            }
            cCtx.restore();

            // 3. 中心烫金核心孔
            cCtx.globalCompositeOperation = 'source-over';
            cCtx.fillStyle = '#d1b58a';
            cCtx.beginPath(); cCtx.arc(c, c, 2, 0, Math.PI * 2); cCtx.fill();
        }
        preRenderRoseWindow();

        function resizeCanvas() {
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            canvas.width = window.innerWidth * dpr; canvas.height = window.innerHeight * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            canvas.style.width = window.innerWidth + 'px'; canvas.style.height = window.innerHeight + 'px';
        }
        window.addEventListener('resize', resizeCanvas); resizeCanvas();

        // 顶级高斯发光薄雾光晕拖尾（无颗粒，不累眼）
        class CathedralHaloTrail {
            constructor(x, y, warm) {
                this.x = x; this.y = y;
                this.size = 24;
                this.alpha = 0.34;
                this.decay = 0.018;
                this.warm = warm;
            }
            update() { this.alpha -= this.decay; }
            draw() {
                if (this.alpha <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.globalCompositeOperation = 'screen'; 
                ctx.filter = 'blur(9px)';

                let g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 1.8);
                if (this.warm) {
                    g.addColorStop(0, 'rgba(226, 206, 169, 0.32)');
                    g.addColorStop(0.22, 'rgba(209, 181, 138, 0.2)');
                    g.addColorStop(0.52, 'rgba(184, 47, 24, 0.09)');
                } else {
                    g.addColorStop(0, 'rgba(209, 181, 138, 0.24)');
                    g.addColorStop(0.24, 'rgba(93, 120, 157, 0.16)');
                    g.addColorStop(0.54, 'rgba(42, 77, 124, 0.07)');
                }
                g.addColorStop(0.78, 'rgba(209, 181, 138, 0.025)');
                g.addColorStop(1, 'rgba(0, 0, 0, 0)');
                
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(this.x, this.y, this.size * 1.5, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }
        }

        // 丝滑内敛的点击晕光圈
        class SoftWindowGlow {
            constructor(x, y) {
                this.x = x; this.y = y; this.r = 12;
                this.maxR = 48;
                this.alpha = 0.48;
            }
            update() {
                this.r += (this.maxR - this.r) * 0.15;
                this.alpha -= 0.032;
            }
            draw() {
                if (this.alpha <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.globalCompositeOperation = 'screen';
                ctx.filter = 'blur(8px)';

                let radialGrad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r * 1.2);
                radialGrad.addColorStop(0, 'rgba(241, 224, 191, 0.3)');
                radialGrad.addColorStop(0.26, 'rgba(209, 181, 138, 0.2)');
                radialGrad.addColorStop(0.52, 'rgba(184, 47, 24, 0.1)');
                radialGrad.addColorStop(0.76, 'rgba(42, 77, 124, 0.04)');
                radialGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

                ctx.fillStyle = radialGrad;
                ctx.beginPath(); ctx.arc(this.x, this.y, this.r * 1.2, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }
        }

        window.addEventListener('mousemove', (e) => {
            let vx = e.clientX - mouse.targetX;
            let vy = e.clientY - mouse.targetY;
            mouse.targetX = e.clientX; mouse.targetY = e.clientY;

            if (Math.abs(vx) > 0.5 || Math.abs(vy) > 0.5) {
                particles.push(new CathedralHaloTrail(mouse.x, mouse.y, Math.random() > 0.48));
            }
        });

        window.addEventListener('mousedown', () => isMouseDown = true);
        window.addEventListener('mouseup', () => {
            isMouseDown = false;
            particles.push(new SoftWindowGlow(mouse.x, mouse.y));
        });

        function animate() {
            if (document.hidden) {
                requestAnimationFrame(animate);
                return;
            }
            if (particles.length > 72) particles.splice(0, particles.length - 72);
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

            // 渲染全套柔光粒子
            for (let i = particles.length - 1; i >= 0; i--) {
                let p = particles[i]; p.update();
                if (p.alpha <= 0) particles.splice(i, 1); else p.draw();
            }

            // 丝滑的60帧缓动追踪算法
            mouse.x += (mouse.targetX - mouse.x) * 0.55;
            mouse.y += (mouse.targetY - mouse.y) * 0.55;

            // 绘制离屏缓存的高性能自转彩窗皮肤
            if (mouse.targetX !== -100) {
                ctx.save();
                ctx.translate(mouse.x, mouse.y);
                
                autoRotation += 0.005; // 极为优雅的静谧微旋
                ctx.rotate(autoRotation);

                let targetScale = isMouseDown ? 0.88 : 1.0;
                pointerScale += (targetScale - pointerScale) * 0.3;
                ctx.scale(pointerScale * 0.88, pointerScale * 0.88);

                // 直接映射内存缓存中的超高清彩窗，CPU占用瞬间归零，带来绝对丝滑的体验
                ctx.drawImage(cacheCanvas, -cacheSize/2, -cacheSize/2);
                ctx.restore();
            }

            requestAnimationFrame(animate);
        }
        animate();
})();
