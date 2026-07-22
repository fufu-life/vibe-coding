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

        function preRenderCrimsonRose() {
            const c = cacheSize / 2;
            cCtx.clearRect(0, 0, cacheSize, cacheSize);
            
            cCtx.save();
            cCtx.translate(c, c);
            cCtx.scale(2, 2); 

            // 1. 底座：暗金墨绿色的底叶（作为鼠标的“尾翼”配重，让左上角锐利指向）
            // 右下大叶
            cCtx.fillStyle = '#1c2e1b';
            cCtx.beginPath();
            cCtx.moveTo(2, 2);
            cCtx.quadraticCurveTo(12, 5, 15, 12);
            cCtx.quadraticCurveTo(8, 14, 2, 2);
            cCtx.fill();
            // 右侧小叶
            cCtx.fillStyle = '#2a4229';
            cCtx.beginPath();
            cCtx.moveTo(3, 0);
            cCtx.quadraticCurveTo(10, -2, 13, 2);
            cCtx.quadraticCurveTo(8, 6, 3, 0);
            cCtx.fill();

            // 2. 泣血红玫瑰主体（7层极致深红到猩红的几何色块叠压，边缘带弗拉明戈舞裙般的微尖）
            cCtx.save();
            cCtx.translate(-1, -1); // 微微向左上角偏移重心

            // 层1：最外层深酒红底瓣
            cCtx.fillStyle = '#4a040b';
            cCtx.beginPath();
            cCtx.moveTo(-3, 2);
            cCtx.bezierCurveTo(8, 6, 16, -2, 11, -10);
            cCtx.bezierCurveTo(7, -17, 1, -16, -3, -12);
            cCtx.bezierCurveTo(-3, -6, -4, -1, -3, 2);
            cCtx.fill();

            // 层2：左侧暗红包抄大瓣
            cCtx.fillStyle = '#7a0611';
            cCtx.beginPath();
            cCtx.moveTo(-3, 2);
            cCtx.bezierCurveTo(-12, 4, -17, -3, -13, -11);
            cCtx.bezierCurveTo(-9, -18, -2, -17, 1, -13);
            cCtx.bezierCurveTo(-1, -8, -2, -2, -3, 2);
            cCtx.fill();

            // 层3：底部托瓣（胭脂红）
            cCtx.fillStyle = '#9c0917';
            cCtx.beginPath();
            cCtx.moveTo(-9, -3);
            cCtx.bezierCurveTo(-10, 1, -4, 4, 1, 4);
            cCtx.bezierCurveTo(6, 4, 10, 1, 9, -3);
            cCtx.bezierCurveTo(4, 0, -4, 0, -9, -3);
            cCtx.fill();

            // 层4：左侧叠压（朱砂红）
            cCtx.fillStyle = '#c71021';
            cCtx.beginPath();
            cCtx.moveTo(-7, -4);
            cCtx.bezierCurveTo(-9, -10, -3, -13, 2, -12);
            cCtx.bezierCurveTo(5, -11, 2, -5, 0, -3);
            cCtx.bezierCurveTo(-4, -2, -5, -2, -7, -4);
            cCtx.fill();

            // 层5：右侧交错叠压（亮猩红）
            cCtx.fillStyle = '#e8172c';
            cCtx.beginPath();
            cCtx.moveTo(-2, -2);
            cCtx.bezierCurveTo(3, -5, 7, -7, 6, -11);
            cCtx.bezierCurveTo(3, -14, -2, -12, -4, -10);
            cCtx.bezierCurveTo(-1, -7, -1, -4, -2, -2);
            cCtx.fill();

            // 层6：核心旋涡（致命亮红）
            cCtx.fillStyle = '#ff2e43';
            cCtx.beginPath();
            cCtx.moveTo(-4, -5);
            cCtx.bezierCurveTo(-1, -3, 3, -3, 4, -7);
            cCtx.bezierCurveTo(3, -10, -3, -10, -4, -5);
            cCtx.fill();

            // 层7：最核心的金粉花蕊（决斗金）
            cCtx.fillStyle = '#d6b365';
            cCtx.beginPath(); cCtx.arc(0, -6.5, 1.0, 0, Math.PI * 2); cCtx.fill();
            cCtx.beginPath(); cCtx.arc(-2, -5.5, 0.8, 0, Math.PI * 2); cCtx.fill();
            cCtx.beginPath(); cCtx.arc(1.5, -4.5, 0.9, 0, Math.PI * 2); cCtx.fill();

            cCtx.restore();
            cCtx.restore();
        }
        preRenderCrimsonRose();

        // --- 💎 混合粒子系统：摇曳的“泣血花瓣” & 失重的“决斗金芒” ---
        class FlamencoParticle {
            constructor(x, y, isBurst = false) {
                this.x = x; 
                this.y = y;
                this.alpha = 1.0;
                this.time = Math.random() * 100;

                // 60% 概率是红玫瑰瓣，40% 概率是决斗火星
                this.type = Math.random() > 0.4 ? 'petal' : 'spark';

                if (isBurst) {
                    // 点击时的吉他扫弦感：迅速迸发出的金芒火星
                    this.type = 'spark';
                    let angle = Math.random() * Math.PI * 2;
                    let speed = Math.random() * 3 + 1.5; 
                    this.vx = Math.cos(angle) * speed;
                    this.vy = Math.sin(angle) * speed;
                    this.size = Math.random() * 1.5 + 0.8;
                    this.decay = Math.random() * 0.03 + 0.02; // 消失极快
                    this.color = Math.random() > 0.5 ? '#d6b365' : '#ffeaab'; 
                } else {
                    if (this.type === 'spark') {
                        // 移动金芒：无重力微弱上浮
                        this.vx = (Math.random() - 0.5) * 0.8;
                        this.vy = -(Math.random() * 0.8 + 0.2); 
                        this.size = Math.random() * 1.2 + 0.5;
                        this.decay = Math.random() * 0.02 + 0.01;
                        this.color = '#d6b365';
                    } else {
                        // 移动花瓣：弗拉明戈裙摆般 S型摇曳坠落
                        this.vx = (Math.random() - 0.5) * 0.6;
                        this.vy = Math.random() * 0.5 + 0.3; // 柔和下坠
                        this.w = Math.random() * 2.5 + 3.0; // 宽度
                        this.h = this.w * (Math.random() * 0.4 + 1.2); // 长度
                        this.decay = Math.random() * 0.015 + 0.008; 
                        
                        // 玫瑰花瓣颜色库
                        const petalColors = ['#9c0917', '#c71021', '#e8172c'];
                        this.color = petalColors[Math.floor(Math.random() * petalColors.length)];
                        
                        this.rotation = Math.random() * Math.PI;
                        this.rotSpeed = (Math.random() - 0.5) * 0.03;
                    }
                }
            }
            update() {
                this.time += 0.05;
                
                if (this.type === 'spark') {
                    this.vx *= 0.92;
                    this.vy *= 0.92;
                    this.x += this.vx;
                    this.y += this.vy - 0.02; // 热力上升
                } else {
                    // 花瓣：钟摆摇曳坠落
                    this.x += this.vx + Math.sin(this.time) * 0.6;
                    this.y += this.vy;
                    this.rotation += this.rotSpeed;
                }
                
                this.alpha -= this.decay;
            }
            draw() {
                if (this.alpha <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.alpha;
                
                if (this.type === 'spark') {
                    // 决斗金芒（发光圆点）
                    ctx.globalCompositeOperation = 'screen';
                    ctx.translate(this.x, this.y);
                    ctx.fillStyle = this.color;
                    ctx.shadowColor = this.color;
                    ctx.shadowBlur = 5;
                    ctx.beginPath();
                    ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    // 泣血花瓣（带尖的弗拉明戈水滴形）
                    ctx.translate(this.x, this.y);
                    ctx.rotate(this.rotation);
                    ctx.fillStyle = this.color;
                    
                    ctx.beginPath();
                    ctx.moveTo(0, -this.h);
                    ctx.bezierCurveTo(this.w, -this.h * 0.4, this.w, this.h * 0.7, 0, this.h);
                    ctx.bezierCurveTo(-this.w, this.h * 0.7, -this.w, -this.h * 0.4, 0, -this.h);
                    ctx.closePath();
                    ctx.fill();
                }
                
                ctx.restore();
            }
        }

        // --- 💎 致命吸引力：点击时的“暗红诱惑涟漪” ---
        class PassionRipple {
            constructor(x, y) {
                this.x = x; this.y = y;
                this.r = 2;
                this.maxR = 48; 
                this.alpha = 0.7;
            }
            update() {
                this.r += (this.maxR - this.r) * 0.15; // 扩散果断干脆
                this.alpha -= 0.035; 
            }
            draw() {
                if (this.alpha <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.globalCompositeOperation = 'screen';
                ctx.filter = 'blur(6px)'; 

                let radialGrad = ctx.createRadialGradient(this.x, this.y, this.r * 0.1, this.x, this.y, this.r);
                radialGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
                radialGrad.addColorStop(0.3, 'rgba(214, 179, 101, 0.4)'); // 决斗黄铜金柔光
                radialGrad.addColorStop(0.8, 'rgba(196, 18, 35, 0.15)'); // 猩红暗波
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
                if(Math.random() > 0.75) {
                    particles.push(new FlamencoParticle(mouse.x, mouse.y, false));
                }
            }
        });

        window.addEventListener('mousedown', () => isMouseDown = true);
        window.addEventListener('mouseup', () => {
            isMouseDown = false;
            if(mouse.x > 0) {
                // 点击荡漾诱惑暗红涟漪
                particles.push(new PassionRipple(mouse.x, mouse.y));
                
                // 扫弦感：极速迸发几颗决斗金火花
                let count = Math.floor(Math.random() * 3) + 4; 
                for(let i = 0; i < count; i++) {
                    particles.push(new FlamencoParticle(mouse.x + (Math.random() - 0.5) * 6, mouse.y + (Math.random() - 0.5) * 6, true));
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
                
                // 微微顺时针旋转，让叶片指向右下方配重，玫瑰的最尖端完美指向左上方焦点
                ctx.rotate(-Math.PI / 6); 

                let targetScale = isMouseDown ? 0.85 : 1.0; 
                pointerScale += (targetScale - pointerScale) * 0.35;
                ctx.scale(pointerScale * 0.94, pointerScale * 0.94);

                // 极具质感的深黑红环境阴影，衬托出安达卢西亚的暗夜魅惑
                ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetY = 5;
                ctx.shadowOffsetX = 2;

                ctx.drawImage(cacheCanvas, -32, -32, 64, 64);
                
                ctx.shadowColor = 'transparent';
                ctx.restore();
            }

            requestAnimationFrame(animate);
        }
        animate();
})();
