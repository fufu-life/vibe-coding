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

        // 绘制花结波浪边缘的辅助函数
        function drawScallopedCircle(ctx, radius, bump, points) {
            ctx.beginPath();
            for (let i = 0; i < points; i++) {
                let angle = (Math.PI * 2 / points) * i;
                let nextAngle = (Math.PI * 2 / points) * (i + 1);
                let midAngle = (angle + nextAngle) / 2;
                let r2 = radius + bump; 
                
                if(i === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
                ctx.quadraticCurveTo(
                    Math.cos(midAngle) * r2, Math.sin(midAngle) * r2, 
                    Math.cos(nextAngle) * radius, Math.sin(nextAngle) * radius
                );
            }
            ctx.fill();
        }

        function preRenderRevolutionCocarde() {
            const c = cacheSize / 2;
            cCtx.clearRect(0, 0, cacheSize, cacheSize);
            
            cCtx.save();
            cCtx.translate(c, c);
            cCtx.scale(2, 2); 

            // 1. 底层：垂落的红蓝革命丝带（V字燕尾剪裁）
            // 深蓝丝带 (左)
            cCtx.fillStyle = '#26364e';
            cCtx.beginPath();
            cCtx.moveTo(-3, 0);
            cCtx.lineTo(-12, 16); 
            cCtx.lineTo(-7, 14);  
            cCtx.lineTo(-2, 17);  
            cCtx.lineTo(2, 0);
            cCtx.fill();

            // 暗红丝带 (右)
            cCtx.fillStyle = '#76202a';
            cCtx.beginPath();
            cCtx.moveTo(2, 0);
            cCtx.lineTo(6, 18);   
            cCtx.lineTo(10, 15);  
            cCtx.lineTo(14, 17);  
            cCtx.lineTo(5, 0);
            cCtx.fill();

            // 2. 【脱胎换骨】纯几何色块压叠——法兰西三色革命帽徽（至臻无描边、拒绝生硬黑线）
            
            // 外层：大革命殷红色波浪褶皱花结（打破正圆轮廓）
            cCtx.fillStyle = '#b72e38';
            drawScallopedCircle(cCtx, 8.5, 2.5, 16);
            // 殷红叠压阴影（利用明度差产生立体感）
            cCtx.fillStyle = '#8b202a';
            cCtx.beginPath(); cCtx.arc(0, 0, 7.8, 0, Math.PI * 2); cCtx.fill();

            // 中层：纯净白波浪褶皱花结
            cCtx.fillStyle = '#f2e7d3';
            drawScallopedCircle(cCtx, 5.5, 1.5, 12);
            // 白色叠压阴影
            cCtx.fillStyle = '#d9cdbd';
            cCtx.beginPath(); cCtx.arc(0, 0, 4.8, 0, Math.PI * 2); cCtx.fill();

            // 内层：深邃夜蓝色圆心
            cCtx.fillStyle = '#31435e';
            cCtx.beginPath(); cCtx.arc(0, 0, 3.5, 0, Math.PI * 2); cCtx.fill();

            // 核心：复古黄铜固定纽扣（代替花芯）
            cCtx.fillStyle = '#c9a45e';
            cCtx.beginPath();
            cCtx.arc(0, 0, 1.2, 0, Math.PI * 2);
            cCtx.fill();
            // 纽扣高光小色核
            cCtx.fillStyle = '#ffffff';
            cCtx.beginPath();
            cCtx.arc(-0.3, -0.3, 0.4, 0, Math.PI * 2);
            cCtx.fill();

            cCtx.restore();
        }
        preRenderRevolutionCocarde();

        // --- 💎 彻底重做：金白双色唯美S型摇曳飘落“信仰之尘与耀斑” ---
        class RevolutionSpark {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.radius = Math.random() * 1.25 + 0.65;
                this.alpha = Math.random() * 0.22 + 0.58;
                this.decay = Math.random() * 0.018 + 0.022;
                this.vx = (Math.random() - 0.5) * 0.32;
                this.vy = -(Math.random() * 0.24 + 0.06);
                this.glint = Math.random() > 0.68;
                const colors = ['#b72e38', '#d1aa63', '#f2e7d3'];
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }
            update() {
                this.vx *= 0.95;
                this.vy *= 0.97;
                this.x += this.vx;
                this.y += this.vy;
                this.alpha -= this.decay;
            }
            draw() {
                if (this.alpha <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.globalCompositeOperation = 'screen';
                ctx.fillStyle = this.color;
                ctx.strokeStyle = this.color;
                ctx.shadowColor = this.color;
                ctx.shadowBlur = 5;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                if (this.glint) {
                    ctx.lineWidth = 0.55;
                    ctx.beginPath();
                    ctx.moveTo(this.x - this.radius * 2.4, this.y);
                    ctx.lineTo(this.x + this.radius * 2.4, this.y);
                    ctx.stroke();
                }
                ctx.restore();
            }
        }

        // Soft click glow
        class RomanticGlow {
            constructor(x, y) {
                this.x = x; this.y = y;
                this.r = 2;
                this.maxR = 38; // 宏大的扩散半径
                this.alpha = 0.5;
            }
            update() {
                this.r += (this.maxR - this.r) * 0.12; // 顺滑阻尼缓动扩散
                this.alpha -= 0.03; 
            }
            draw() {
                if (this.alpha <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.globalCompositeOperation = 'screen';
                ctx.filter = 'blur(6px)'; // 高级空灵羽化效果

                let radialGrad = ctx.createRadialGradient(this.x, this.y, this.r * 0.1, this.x, this.y, this.r);
                radialGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
                radialGrad.addColorStop(0.3, 'rgba(247, 230, 196, 0.4)'); // 温柔香槟白柔光
                radialGrad.addColorStop(0.8, 'rgba(193, 39, 45, 0.1)'); // 革命暗红柔光
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
            // 拖动时抖落失重的信仰之尘
            if (speed > 4 && mouse.x > 0) {
                if(Math.random() > 0.88) {
                    particles.push(new RevolutionSpark(mouse.x, mouse.y));
                }
            }
        });

        window.addEventListener('mousedown', () => isMouseDown = true);
        window.addEventListener('mouseup', () => {
            isMouseDown = false;
            if(mouse.x > 0) {
                // 点击瞬间激发耀斑涟漪！不再通过掉落火星产生炸裂感，手感精致空灵
                particles.push(new RomanticGlow(mouse.x, mouse.y));
                
                let count = Math.floor(Math.random() * 2) + 4; 
                for(let i = 0; i < count; i++) {
                    particles.push(new RevolutionSpark(mouse.x + (Math.random() - 0.5) * 6, mouse.y + (Math.random() - 0.5) * 6));
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
                
                // 微微斜向倾斜，让丝带自然垂落到右下角，避免遮挡点击视线
                ctx.rotate(-Math.PI / 8); 

                let targetScale = isMouseDown ? 0.85 : 1.0; 
                pointerScale += (targetScale - pointerScale) * 0.35;
                ctx.scale(pointerScale * 0.9, pointerScale * 0.9);

                // 添加全局空气投影，让帽徽充满悬浮实体感
                ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
                ctx.shadowBlur = 8;
                ctx.shadowOffsetY = 4;
                ctx.shadowOffsetX = 2;

                ctx.drawImage(cacheCanvas, -32, -32, 64, 64);
                
                ctx.shadowColor = 'transparent'; // 绘制完重置阴影
                ctx.restore();
            }

            requestAnimationFrame(animate);
        }
        animate();
})();
