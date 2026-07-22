window.referenceCursorActive = true;

(() => {
  if (window.matchMedia("(pointer: coarse)").matches) return;
        const canvas = document.getElementById('effectCanvas');
        const ctx = canvas.getContext('2d');

        let particles = [];
        let mouse = { x: -100, y: -100, targetX: -100, targetY: -100 };
        
        let isMouseDown = false;
        let pointerScale = 1.0;

        // --- 💎 视网膜双倍像素级离屏缓存 ---
        const cacheCanvas = document.createElement('canvas');
        const cCtx = cacheCanvas.getContext('2d');
        const cacheSize = 128; 
        cacheCanvas.width = cacheSize;
        cacheCanvas.height = cacheSize;

        function preRenderBaguette() {
            const c = cacheSize / 2;
            cCtx.clearRect(0, 0, cacheSize, cacheSize);
            
            cCtx.save();
            cCtx.translate(c, c);
            cCtx.scale(2, 2); 

            // 1. 底层：硬脆烤焦的阴影
            cCtx.fillStyle = '#6b3c15';
            cCtx.beginPath();
            cCtx.moveTo(-18, 1);
            cCtx.quadraticCurveTo(0, 7, 18, 1);
            cCtx.quadraticCurveTo(22, 0, 18, 5);
            cCtx.quadraticCurveTo(0, 10, -18, 5);
            cCtx.quadraticCurveTo(-22, 0, -18, 1);
            cCtx.fill();

            // 2. 中层：焦糖色的法棍主体
            cCtx.fillStyle = '#bc7631';
            cCtx.beginPath();
            cCtx.moveTo(-18, -4);
            cCtx.quadraticCurveTo(0, -9, 18, -4);
            cCtx.quadraticCurveTo(22, 0, 18, 4);
            cCtx.quadraticCurveTo(0, 9, -18, 4);
            cCtx.quadraticCurveTo(-22, 0, -18, -4);
            cCtx.fill();

            // 3. 上层：烤得略微蓬松的顶部
            cCtx.fillStyle = '#d89445';
            cCtx.beginPath();
            cCtx.moveTo(-16, -3);
            cCtx.quadraticCurveTo(0, -7, 16, -3);
            cCtx.quadraticCurveTo(19, -1, 16, 1);
            cCtx.quadraticCurveTo(0, -2, -16, 1);
            cCtx.quadraticCurveTo(-19, -1, -16, -3);
            cCtx.fill();

            // 4. 表皮裂口 (Grignes)：3 道切口
            const cuts = [-9, 0, 9]; 
            cuts.forEach(cx => {
                cCtx.save();
                cCtx.translate(cx, -1);
                cCtx.rotate(Math.PI / 3.5);

                cCtx.fillStyle = '#f2e4c1';
                cCtx.beginPath();
                cCtx.ellipse(0, 0, 2.2, 5.5, 0, 0, Math.PI * 2);
                cCtx.fill();

                cCtx.fillStyle = '#d4b77b';
                cCtx.beginPath();
                cCtx.ellipse(0.5, 0, 1.2, 4.5, 0, 0, Math.PI * 2);
                cCtx.fill();

                cCtx.restore();
            });

            cCtx.restore();
        }
        preRenderBaguette();

        // --- 💎 具有真实重力感的固体“面包渣” ---
        class Crumb {
            constructor(x, y, isBurst = false) {
                this.x = x; 
                this.y = y;
                
                this.size = Math.random() * 1.5 + 0.8; 
                this.alpha = 1.0;
                this.decay = Math.random() * 0.015 + 0.01; 
                
                if (isBurst) {
                    // 【核心微调：不蹦那么高】
                    // 大幅削减整体速度，并去掉了之前多余的垂直向上爆发力
                    let angle = Math.random() * Math.PI * 2;
                    let speed = Math.random() * 1.8 + 0.5; // 速度减缓，显得更克制
                    this.vx = Math.cos(angle) * speed;
                    this.vy = Math.sin(angle) * speed - 0.2; // 仅保留极其微弱的上抛感，或者直接顺势往下
                } else {
                    this.vx = (Math.random() - 0.5) * 1.5;
                    this.vy = Math.random() * 0.5; 
                }
                
                this.gravity = 0.12; 
                
                this.rotation = Math.random() * Math.PI * 2;
                this.rotSpeed = (Math.random() - 0.5) * 0.3;
                
                const colors = ['#bc7631', '#d89445', '#f2e4c1', '#6b3c15'];
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }
            update() {
                this.vx *= 0.94;
                this.vy += this.gravity; 
                
                this.x += this.vx;
                this.y += this.vy;
                
                this.rotation += this.rotSpeed;
                this.alpha -= this.decay;
            }
            draw() {
                if (this.alpha <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                
                ctx.fillStyle = this.color;
                
                ctx.beginPath();
                ctx.rect(-this.size/2, -this.size/2, this.size, this.size);
                ctx.fill();
                
                ctx.restore();
            }
        }

        function resizeCanvas() {
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            canvas.width = window.innerWidth * dpr; 
            canvas.height = window.innerHeight * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            canvas.style.width = window.innerWidth + 'px'; 
            canvas.style.height = window.innerHeight + 'px';
        }
        window.addEventListener('resize', resizeCanvas); 
        resizeCanvas();

        window.addEventListener('mousemove', (e) => {
            let vx = e.clientX - mouse.targetX;
            let vy = e.clientY - mouse.targetY;
            mouse.targetX = e.clientX; 
            mouse.targetY = e.clientY;

            let speed = Math.sqrt(vx * vx + vy * vy);
            if (speed > 2.0 && mouse.x > 0) {
                if(Math.random() > 0.8) { 
                    particles.push(new Crumb(mouse.x, mouse.y, false));
                }
            }
        });

        window.addEventListener('mousedown', () => isMouseDown = true);
        window.addEventListener('mouseup', () => {
            isMouseDown = false;
            if(mouse.x > 0) {
                let count = Math.floor(Math.random() * 4) + 6; 
                for(let i = 0; i < count; i++) {
                    particles.push(new Crumb(mouse.x, mouse.y, true));
                }
            }
        });

        function animate() {
            if (document.hidden) {
                requestAnimationFrame(animate);
                return;
            }
            if (particles.length > 72) particles.splice(0, particles.length - 72);
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

            for (let i = particles.length - 1; i >= 0; i--) {
                let p = particles[i]; 
                p.update();
                if (p.alpha <= 0) particles.splice(i, 1); else p.draw();
            }

            mouse.x += (mouse.targetX - mouse.x) * 0.6;
            mouse.y += (mouse.targetY - mouse.y) * 0.6;

            if (mouse.targetX !== -100) {
                ctx.save();
                ctx.translate(mouse.x, mouse.y); 
                
                ctx.rotate(Math.PI / 4); 
                ctx.translate(18, 0); 

                let targetScale = isMouseDown ? 0.85 : 1.0; 
                pointerScale += (targetScale - pointerScale) * 0.35;
                ctx.scale(pointerScale * 0.98, pointerScale * 0.98);

                ctx.drawImage(cacheCanvas, -32, -32, 64, 64);
                ctx.restore();
            }

            requestAnimationFrame(animate);
        }
        animate();
})();
