window.referenceCursorActive = true;

(() => {
  if (window.matchMedia("(pointer: coarse)").matches) return;
        const canvas = document.getElementById('effectCanvas');
        const ctx = canvas.getContext('2d');

        let particles = [];
        let mouse = { x: -100, y: -100, targetX: -100, targetY: -100 };
        
        let isMouseDown = false;
        let pointerScale = 1.0;
        let distanceSinceLastSpawn = 0; 

        // --- 💎 视网膜双倍像素级离屏缓存 ---
        const cacheCanvas = document.createElement('canvas');
        const cCtx = cacheCanvas.getContext('2d');
        const cacheSize = 128; 
        cacheCanvas.width = cacheSize;
        cacheCanvas.height = cacheSize;

        // 预渲染：霓虹音符 (焦点重构版)
        function preRenderNeonNote() {
            const c = cacheSize / 2;
            cCtx.clearRect(0, 0, cacheSize, cacheSize);
            
            cCtx.save();
            cCtx.translate(c, c);
            cCtx.scale(2.2, 2.2); // 保持较大的尺寸，清晰亮眼
            
            // 霓虹发光效果
            cCtx.strokeStyle = '#5df5d3'; 
            cCtx.lineWidth = 2.5;
            cCtx.lineCap = 'round';
            cCtx.lineJoin = 'round';
            
            // 魅红阴影光晕
            cCtx.shadowColor = '#e84a7e'; 
            cCtx.shadowBlur = 8;
            cCtx.shadowOffsetX = 1;
            cCtx.shadowOffsetY = 1;

            cCtx.beginPath();
            
            // 【核心重构：将音符的“圆圈”完美放在 0,0 坐标作为鼠标焦点】
            cCtx.ellipse(0, 0, 3.7, 3.1, -Math.PI / 8, 0, Math.PI * 2);
            cCtx.stroke();

            // 符干从圆圈右侧向上延伸
            cCtx.beginPath();
            cCtx.moveTo(3.7, 0);
            cCtx.lineTo(3.7, -19.5);
            cCtx.stroke();

            // 符尾飘逸的弧线
            cCtx.beginPath();
            cCtx.moveTo(3.7, -19.5);
            cCtx.quadraticCurveTo(13.5, -17.1, 12.2, -7.3);
            cCtx.stroke();

            // 符干中心白色高光，增加通透感
            cCtx.strokeStyle = '#ffffff';
            cCtx.lineWidth = 1.0;
            cCtx.shadowColor = 'transparent'; 
            
            cCtx.beginPath();
            cCtx.moveTo(3.7, 0);
            cCtx.lineTo(3.7, -19.5);
            cCtx.stroke();

            cCtx.restore();
        }
        preRenderNeonNote();

        // --- 💎 粒子系统：精致洒落的流光音符与星尘 ---
        class NeonParticle {
            constructor(x, y, isBurst = false) {
                this.x = x; 
                this.y = y;
                
                this.isNote = Math.random() > 0.4; 
                
                if (this.isNote) {
                    const notes = ['♪', '♫'];
                    this.char = notes[Math.floor(Math.random() * notes.length)];
                    this.size = Math.random() * 4 + 10; 
                } else {
                    this.size = Math.random() * 1.5 + 0.5; 
                }

                if (isBurst) {
                    let angle = Math.random() * Math.PI * 2;
                    let speed = Math.random() * 1.0 + 0.3; 
                    this.vx = Math.cos(angle) * speed;
                    this.vy = Math.sin(angle) * speed; 
                    this.decay = Math.random() * 0.025 + 0.02; 
                } else {
                    this.vx = (Math.random() - 0.5) * 0.8; 
                    this.vy = -(Math.random() * 0.6 + 0.1); 
                    this.decay = Math.random() * 0.015 + 0.01; 
                }
                
                this.rotation = Math.random() * Math.PI * 2;
                this.rotSpeed = (Math.random() - 0.5) * 0.05;
                
                this.alpha = 1.0;
                this.color = Math.random() > 0.4 ? '#5df5d3' : '#e84a7e';
            }
            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.vx *= 0.95; 
                this.vy *= 0.95;
                
                this.rotation += this.rotSpeed;
                this.alpha -= this.decay;
            }
            draw() {
                if (this.alpha <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.globalCompositeOperation = 'screen';
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                
                ctx.fillStyle = this.color;
                ctx.shadowColor = this.color;
                ctx.shadowBlur = 6; 
                
                if (this.isNote) {
                    ctx.font = `italic ${this.size}px sans-serif`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(this.char, 0, 0);
                } else {
                    ctx.beginPath();
                    ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                ctx.restore();
            }
        }

        // --- 💎 极致精致温婉：微型双轨霓虹涟漪 ---
        class ElegantRipple {
            constructor(x, y) {
                this.x = x; this.y = y;
                this.r = 2;
                this.maxR = 25; 
                this.alpha = 0.6; 
                this.thickness = 1.5; 
            }
            update() {
                this.r += (this.maxR - this.r) * 0.1; 
                this.thickness *= 0.92;
                this.alpha -= 0.025; 
            }
            draw() {
                if (this.alpha <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.globalCompositeOperation = 'screen';
                
                ctx.strokeStyle = '#e84a7e';
                ctx.lineWidth = this.thickness * 1.5;
                ctx.filter = 'blur(3px)';
                ctx.beginPath(); 
                ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); 
                ctx.stroke();
                
                ctx.strokeStyle = '#5df5d3';
                ctx.lineWidth = this.thickness;
                ctx.filter = 'none';
                ctx.beginPath(); 
                ctx.arc(this.x, this.y, this.r * 0.8, 0, Math.PI * 2); 
                ctx.stroke();
                
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
            mouse.targetX = e.clientX; 
            mouse.targetY = e.clientY;

            let vx = e.clientX - mouse.x;
            let vy = e.clientY - mouse.y;
            let speed = Math.sqrt(vx * vx + vy * vy);
            
            distanceSinceLastSpawn += speed;
            if (distanceSinceLastSpawn > 40 && mouse.x > 0) { 
                particles.push(new NeonParticle(mouse.x, mouse.y, false));
                distanceSinceLastSpawn = 0; 
            }
        });

        window.addEventListener('mousedown', () => isMouseDown = true);
        window.addEventListener('mouseup', () => {
            isMouseDown = false;
            if(mouse.x > 0) {
                particles.push(new ElegantRipple(mouse.x, mouse.y));
                
                let count = Math.floor(Math.random() * 2) + 2; 
                for(let i = 0; i < count; i++) {
                    particles.push(new NeonParticle(mouse.x, mouse.y, true));
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
                if (p.alpha <= 0) {
                    particles.splice(i, 1);
                } else {
                    p.draw();
                }
            }

            mouse.x += (mouse.targetX - mouse.x) * 0.45;
            mouse.y += (mouse.targetY - mouse.y) * 0.45;

            if (mouse.targetX !== -100) {
                ctx.save();
                ctx.translate(mouse.x, mouse.y); 
                
                // 【核心优化：向右倾斜音符】
                // 顺时针旋转约 18 度 (Math.PI / 10)，让符干优雅地指向右上方，手感和谐自然
                ctx.rotate(Math.PI / 10); 

                let targetScale = isMouseDown ? 0.85 : 1.0; 
                pointerScale += (targetScale - pointerScale) * 0.35;
                ctx.scale(pointerScale * 0.92, pointerScale * 0.92);

                ctx.drawImage(cacheCanvas, -32, -32, 64, 64);
                
                ctx.restore();
            }

            requestAnimationFrame(animate);
        }
        animate();
})();
