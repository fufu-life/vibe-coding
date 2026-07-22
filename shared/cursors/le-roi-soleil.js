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

        function preRenderTrueApolloSun() {
            const c = cacheSize / 2;
            cCtx.clearRect(0, 0, cacheSize, cacheSize);
            
            cCtx.save();
            cCtx.translate(c, c);
            cCtx.scale(2, 2); 

            // 1. 交替的直射光与波浪火焰光
            const numRays = 8;
            for (let i = 0; i < numRays; i++) {
                let angle = (Math.PI * 2 / numRays) * i;
                cCtx.save();
                cCtx.rotate(angle);

                cCtx.fillStyle = '#e8c674';
                cCtx.beginPath();
                cCtx.moveTo(-1.5, -7);
                cCtx.lineTo(0, -16);
                cCtx.lineTo(1.5, -7);
                cCtx.closePath();
                cCtx.fill();

                cCtx.rotate(Math.PI / numRays); 
                cCtx.fillStyle = '#fdf0d5';
                cCtx.beginPath();
                cCtx.moveTo(-1.5, -7);
                cCtx.bezierCurveTo(-4, -11, 4, -13, 0, -18);
                cCtx.bezierCurveTo(2, -13, -2, -11, 1.5, -7);
                cCtx.closePath();
                cCtx.fill();

                cCtx.restore();
            }

            // 2. 核心太阳神金盘
            cCtx.beginPath();
            cCtx.arc(0, 0, 7.5, 0, Math.PI * 2);
            cCtx.fillStyle = '#f3d497'; 
            cCtx.fill();
            cCtx.lineWidth = 0.8;
            cCtx.strokeStyle = '#c69a31'; 
            cCtx.stroke();

            // 3. 阿波罗太阳神微缩人脸
            cCtx.strokeStyle = '#8a601c'; 
            cCtx.lineWidth = 0.5;
            cCtx.lineCap = 'round';

            cCtx.beginPath(); cCtx.moveTo(-3.5, -1.5); cCtx.quadraticCurveTo(-2.2, -0.2, -1, -1.5); cCtx.stroke();
            cCtx.beginPath(); cCtx.moveTo(1, -1.5); cCtx.quadraticCurveTo(2.2, -0.2, 3.5, -1.5); cCtx.stroke();
            cCtx.beginPath(); cCtx.moveTo(0, -1.5); cCtx.lineTo(0, 2.5); cCtx.lineTo(0.8, 3); cCtx.stroke();
            cCtx.beginPath(); cCtx.moveTo(-1.5, 4.5); cCtx.quadraticCurveTo(0, 5.5, 1.5, 4.5); cCtx.stroke();

            cCtx.restore();
        }
        preRenderTrueApolloSun();

        // --- 💎 极致微调：细腻轻盈的太阳光尘 ---
        class SolarDust {
            constructor(x, y, isBurst = false) {
                this.x = x; 
                this.y = y;
                
                // 【核心修改】光尘尺寸大幅度缩小，像真正的漂浮金粉
                this.r = Math.random() * 0.8 + 0.4; 
                this.alpha = 1.0;
                this.decay = Math.random() * 0.02 + 0.015; 
                
                let angle = Math.random() * Math.PI * 2; 
                
                // 【核心修改】大幅收缩爆发范围与移动速度
                // 爆发时仅有微弱散开速度(0.8~2.3)，移动时速度更低(0.1~0.6)
                let speed = isBurst ? (Math.random() * 1.5 + 0.8) : (Math.random() * 0.5 + 0.1);
                
                this.vx = Math.cos(angle) * speed;
                this.vy = Math.sin(angle) * speed;
                
                this.color = Math.random() > 0.4 ? '#f3d497' : '#ffffff'; 
            }
            update() {
                this.x += this.vx;
                this.y += this.vy;
                
                // 阻力更大，减速更快，体现尘埃的轻盈感
                this.vx *= 0.88; 
                this.vy *= 0.88;
                this.vy -= 0.015; // 极其微弱的热力上浮
                
                this.r *= 0.94; // 尘埃自然缩小
                this.alpha -= this.decay;
            }
            draw() {
                if (this.alpha <= 0 || this.r <= 0.1) return;
                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.globalCompositeOperation = 'screen';
                
                ctx.translate(this.x, this.y);
                ctx.fillStyle = this.color;
                
                // 发光范围同步调小，避免糊成一大团
                ctx.shadowColor = this.color;
                ctx.shadowBlur = 3;
                
                ctx.beginPath();
                ctx.arc(0, 0, this.r, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.restore();
            }
        }

        // --- 💎 范围收敛的“初绽月晕波纹涟漪” ---
        class RoyalSunGlow {
            constructor(x, y) {
                this.x = x; this.y = y;
                this.r = 2;
                // 【核心修改】光晕涟漪的最大扩散范围收紧，更显克制精致
                this.maxR = 35; 
                this.alpha = 0.8;
            }
            update() {
                this.r += (this.maxR - this.r) * 0.12; 
                this.alpha -= 0.03; // 消失速度略微加快
            }
            draw() {
                if (this.alpha <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.globalCompositeOperation = 'screen';
                ctx.filter = 'blur(4px)'; 

                let radialGrad = ctx.createRadialGradient(this.x, this.y, this.r * 0.1, this.x, this.y, this.r);
                radialGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
                radialGrad.addColorStop(0.4, 'rgba(247, 230, 196, 0.4)'); 
                radialGrad.addColorStop(0.8, 'rgba(209, 166, 70, 0.1)');
                radialGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

                ctx.fillStyle = radialGrad;
                ctx.beginPath(); 
                ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); 
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
            if (speed > 2.5 && mouse.x > 0) {
                if(Math.random() > 0.6) {
                    particles.push(new SolarDust(mouse.x, mouse.y, false));
                }
            }
        });

        window.addEventListener('mousedown', () => isMouseDown = true);
        window.addEventListener('mouseup', () => {
            isMouseDown = false;
            if(mouse.x > 0) {
                // 点击瞬间激发收敛克制的涟漪
                particles.push(new RoyalSunGlow(mouse.x, mouse.y));
                
                // 360度散开极其细碎的金粉尘埃
                let count = Math.floor(Math.random() * 6) + 12; 
                for(let i = 0; i < count; i++) {
                    particles.push(new SolarDust(mouse.x, mouse.y, true));
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
                if (p.alpha <= 0 || p.r <= 0) particles.splice(i, 1); else p.draw();
            }

            mouse.x += (mouse.targetX - mouse.x) * 0.6;
            mouse.y += (mouse.targetY - mouse.y) * 0.6;

            if (mouse.targetX !== -100) {
                ctx.save();
                ctx.translate(mouse.x, mouse.y); 

                let targetScale = isMouseDown ? 0.85 : 1.0; 
                pointerScale += (targetScale - pointerScale) * 0.35;
                ctx.scale(pointerScale * 0.9, pointerScale * 0.9);

                ctx.drawImage(cacheCanvas, -32, -32, 64, 64);
                ctx.restore();
            }

            requestAnimationFrame(animate);
        }
        animate();
})();
