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

        function preRenderPureBlockRose() {
            const c = cacheSize / 2;
            cCtx.clearRect(0, 0, cacheSize, cacheSize);
            
            cCtx.save();
            cCtx.translate(c, c);
            cCtx.scale(2, 2); 

            // 1. 保留原本漂亮的写实倒刺墨绿枝干
            cCtx.strokeStyle = '#183627'; 
            cCtx.lineWidth = 1.4;
            cCtx.beginPath(); cCtx.moveTo(0, 2); cCtx.lineTo(0, 24); cCtx.stroke();

            cCtx.fillStyle = '#0a1d13'; 
            cCtx.beginPath();
            cCtx.moveTo(0, 7); cCtx.lineTo(3.5, 6); cCtx.lineTo(0, 10);   
            cCtx.moveTo(0, 13); cCtx.lineTo(-3.5, 12); cCtx.lineTo(0, 16); 
            cCtx.fill();

            // 2. 纯几何块面压叠花冠（彻底拔除粗黑边、黑肿块与冗余的复合路径，绝无黑线）
            
            // --- 块面A：外层纯白右大瓣（向右下展延打破正圆，控制轮廓带微尖） ---
            cCtx.fillStyle = '#ffffff';
            cCtx.beginPath();
            cCtx.moveTo(-3, 1);
            cCtx.bezierCurveTo(7, 3, 13, -1, 11, -8);
            cCtx.bezierCurveTo(9, -15, 2, -15, -2, -12);
            cCtx.bezierCurveTo(-1.5, -7, -2.5, -2, -3, 1);
            cCtx.fill(); // 【安全修复】只保留一次纯正填充，拔除多余代码

            // --- 块面B：外层纯白左大瓣（向左上包抄折叠） ---
            cCtx.fillStyle = '#fbfbfb';
            cCtx.beginPath();
            cCtx.moveTo(-3, 1);
            cCtx.bezierCurveTo(-9, 2, -13, -3, -11, -9);
            cCtx.bezierCurveTo(-9, -15, -4, -16, -1, -13);
            cCtx.bezierCurveTo(-1.5, -9, -1, -4, -3, 1);
            cCtx.fill();

            // --- 块面C：中层环抱托瓣（清爽奶白几何块面） ---
            cCtx.fillStyle = '#f4edd9';
            cCtx.beginPath();
            cCtx.moveTo(-7, -4);
            cCtx.bezierCurveTo(-9, -9, -3, -12, 1, -11);
            cCtx.bezierCurveTo(5, -10, 7, -6, 4, -2);
            cCtx.bezierCurveTo(0, 1, -4, 0, -7, -4);
            cCtx.fill();

            // --- 块面D：内层经典杯状抱瓣（奶油黄几何块面，彻底打破大眼睛荷包蛋感） ---
            cCtx.fillStyle = '#eddca9';
            cCtx.beginPath();
            cCtx.moveTo(-5, -4);
            cCtx.bezierCurveTo(-1.5, -1, 3, -1, 5, -4);
            cCtx.bezierCurveTo(3, -7, -3, -7, -5, -4);
            cCtx.fill();

            // --- 块面E：最核心交错花蕊（麦香暖黄叠块） ---
            cCtx.fillStyle = '#f5df9a';
            cCtx.beginPath();
            cCtx.moveTo(-2.5, -6.5);
            cCtx.bezierCurveTo(-3.5, -10, 0, -11, 2.5, -9);
            cCtx.bezierCurveTo(3.5, -7, 1.5, -5, -1, -5.5);
            cCtx.fill();

            // 最中央用来收口的点睛小白核
            cCtx.fillStyle = '#ffffff';
            cCtx.beginPath();
            cCtx.arc(0, -7.2, 1.0, 0, Math.PI * 2);
            cCtx.fill();

            cCtx.restore();
        }
        preRenderPureBlockRose();

        // --- 💎 纯净唯美S型曲线摇曳飘落花瓣粒子 ---
        class FallingPetal {
            constructor(x, y) {
                this.x = x; 
                this.y = y;
                this.w = Math.random() * 2.5 + 4.0; 
                this.h = this.w * (Math.random() * 0.2 + 1.2); 
                this.alpha = 1.0;
                
                this.time = Math.random() * 100;
                this.oscSpeed = Math.random() * 0.025 + 0.015; 
                this.oscRange = Math.random() * 0.7 + 0.4;    
                
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = Math.random() * 0.4 + 0.4; 
                this.decay = Math.random() * 0.012 + 0.008; 
                
                this.rotation = Math.random() * Math.PI;
                this.rotSpeed = (Math.random() - 0.5) * 0.025;
                this.color = Math.random() > 0.4 ? '#ffffff' : '#f4edd9'; 
            }
            update() {
                this.time += this.oscSpeed;
                this.x += this.vx + Math.sin(this.time) * this.oscRange;
                this.y += this.vy;
                this.vy += 0.012; 
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
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 0.4;
                
                ctx.beginPath();
                ctx.moveTo(0, -this.h);
                ctx.bezierCurveTo(this.w, -this.h / 2, this.w, this.h / 2, 0, this.h);
                ctx.bezierCurveTo(-this.w, this.h / 2, -this.w, -this.h / 2, 0, -this.h);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                
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
                if(Math.random() > 0.84) {
                    particles.push(new FallingPetal(mouse.x, mouse.y));
                }
            }
        });

        window.addEventListener('mousedown', () => isMouseDown = true);
        window.addEventListener('mouseup', () => {
            isMouseDown = false;
            if(mouse.x > 0) {
                let count = Math.floor(Math.random() * 3) + 4; 
                for(let i = 0; i < count; i++) {
                    particles.push(new FallingPetal(mouse.x + (Math.random() - 0.5) * 8, mouse.y + (Math.random() - 0.5) * 8));
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
                ctx.rotate(-Math.PI / 4); // 稳定斜向直指左上方45°
                ctx.translate(0, 14); 

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
