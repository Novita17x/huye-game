        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        
        // Estados del juego
        const GameState = {
            MENU: 'menu',
            PLAYING: 'playing',
            GAME_OVER: 'game_over'
        };
        
        let currentState = GameState.MENU;
        let gameStartTime = 0;
        let dangerTime = 0;
        let inDangerZone = false;
        
        // Audio elements
        let backgroundSound;
        let jumpSound;
        let dangerSound;
        
        // Variables del juego
        const game = {
            player: {
                x: 100,
                y: 450,
                width: 30,
                height: 30,
                velX: 0,
                velY: 0,
                speed: 5,
                jumpPower: 15,
                onGround: false,
                color: '#9b59b6'
            },
            enemy: {
                x: 700,
                y: 450,
                width: 25,
                height: 25,
                speed: 2.5,
                color: '#e74c3c',
                detectionRange: 150,
                aggroRange: 100
            },
            obstacles: [
                {x: 300, y: 400, width: 100, height: 20, color: '#8e44ad'},
                {x: 500, y: 350, width: 80, height: 20, color: '#8e44ad'}
            ],
            rotatingObject: {
                x: 400,
                y: 100,
                angle: 0,
                size: 1,
                growing: true
            },
            gravity: 0.8,
            groundY: 480,
            keys: {}
        };

        // Inicializar sonidos
        function initAudio() {
            // Sonido de fondo
            if (!backgroundSound) {
                backgroundSound = new Audio('sonidos/fondo2.mp3'); 
                backgroundSound.loop = true;
                backgroundSound.volume = 0.7;
            }
            
            // Sonido de salto
            if (!jumpSound) {
                jumpSound = new Audio('sonidos/salto.mp3'); 
                jumpSound.volume = 0.2;
            }
            
            // Sonido de peligro
            if (!dangerSound) {
                dangerSound = new Audio('sonidos/peligro.mp3'); 
                dangerSound.volume = 0.6;
                dangerSound.loop = true;
            }
        }
        
        function playBackgroundSound() {
            if (backgroundSound && backgroundSound.paused) {
                backgroundSound.play().catch(e => console.log('No se pudo reproducir sonido de fondo:', e));
            }
        }
        
        function stopBackgroundSound() {
            if (backgroundSound && !backgroundSound.paused) {
                backgroundSound.pause();
                backgroundSound.currentTime = 0;
            }
        }
        
        function playJumpSound() {
            if (jumpSound) {
                jumpSound.currentTime = 0;
                jumpSound.play().catch(e => console.log('No se pudo reproducir sonido de salto:', e));
            }
        }
        
        function playDangerSound() {
            if (dangerSound && dangerSound.paused) {
                dangerSound.play().catch(e => console.log('No se pudo reproducir sonido de peligro:', e));
            }
        }
        
        function stopDangerSound() {
            if (dangerSound && !dangerSound.paused) {
                dangerSound.pause();
                dangerSound.currentTime = 0;
            }
        }

        // Funciones del menú
        function startGame() {
            currentState = GameState.PLAYING;
            gameStartTime = Date.now();
            dangerTime = 0;
            inDangerZone = false;
            
            // Reiniciar posiciones
            game.player.x = 100;
            game.player.y = 450;
            game.player.velX = 0;
            game.player.velY = 0;
            game.player.onGround = false;
            game.enemy.x = 700;
            game.enemy.y = 450;
            
            // Mostrar/ocultar elementos
            document.getElementById('mainMenu').classList.add('hidden');
            document.getElementById('gameOverMenu').classList.add('hidden');
            document.getElementById('controls').classList.remove('hidden');
            document.getElementById('gameInfo').classList.remove('hidden');
            document.getElementById('dangerIndicator').classList.add('hidden');
            
            // Inicializar y reproducir audio
            initAudio();
            playBackgroundSound();
            stopDangerSound(); // Asegurar que el sonido de peligro esté parado
        }
        
        function showMainMenu() {
            currentState = GameState.MENU;
            
            // Parar sonidos
            stopBackgroundSound();
            stopDangerSound();
            
            // Mostrar/ocultar elementos
            document.getElementById('mainMenu').classList.remove('hidden');
            document.getElementById('gameOverMenu').classList.add('hidden');
            document.getElementById('controls').classList.add('hidden');
            document.getElementById('gameInfo').classList.add('hidden');
            document.getElementById('dangerIndicator').classList.add('hidden');
        }
        
        function gameOver() {
            currentState = GameState.GAME_OVER;
            
            const survivalTime = Math.floor((Date.now() - gameStartTime) / 1000);
            document.getElementById('survivalTime').textContent = `Tiempo sobrevivido: ${survivalTime}s`;
            
            // Parar sonidos
            stopBackgroundSound();
            stopDangerSound();
            
            // Mostrar game over
            document.getElementById('gameOverMenu').classList.remove('hidden');
            document.getElementById('controls').classList.add('hidden');
            document.getElementById('gameInfo').classList.add('hidden');
            document.getElementById('dangerIndicator').classList.add('hidden');
        }

        // Funciones matemáticas
        function calculateDistance(p1, p2) {
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            return Math.sqrt(dx * dx + dy * dy);
        }

        function normalizeVector(vector) {
            const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
            if (magnitude === 0) return {x: 0, y: 0};
            return {
                x: vector.x / magnitude,
                y: vector.y / magnitude
            };
        }

        function checkCollision(rect1, rect2) {
            return rect1.x < rect2.x + rect2.width &&
                   rect1.x + rect1.width > rect2.x &&
                   rect1.y < rect2.y + rect2.height &&
                   rect1.y + rect1.height > rect2.y;
        }

        // Manejo de input
        document.addEventListener('keydown', (e) => {
            if (currentState !== GameState.PLAYING) return;
            
            game.keys[e.key.toLowerCase()] = true;
            
            // Salto
            if (e.key === ' ' && game.player.onGround) {
                game.player.velY = -game.player.jumpPower;
                game.player.onGround = false;
                playJumpSound();
            }
            
            // Reiniciar
            if (e.key.toLowerCase() === 'r') {
                startGame();
            }
        });

        document.addEventListener('keyup', (e) => {
            game.keys[e.key.toLowerCase()] = false;
        });

        // Actualizar jugador
        function updatePlayer() {
            const player = game.player;
            
            // Movimiento horizontal
            player.velX = 0;
            if (game.keys['a'] || game.keys['arrowleft']) {
                player.velX = -player.speed;
            }
            if (game.keys['d'] || game.keys['arrowright']) {
                player.velX = player.speed;
            }
            if (game.keys['w'] || game.keys['arrowup']) {
                if (player.onGround) {
                    player.velY = -player.jumpPower;
                    player.onGround = false;
                    playJumpSound();
                }
            }

            // Aplicar movimiento horizontal
            player.x += player.velX;
            
            // Límites horizontales
            if (player.x < 0) player.x = 0;
            if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

            // Física vertical (gravedad)
            player.velY += game.gravity;
            player.y += player.velY;

            // Resetear estado del suelo
            player.onGround = false;

            // Colisión con el suelo principal
            if (player.y + player.height >= game.groundY) {
                player.y = game.groundY - player.height;
                player.velY = 0;
                player.onGround = true;
            }

            // Colisión con obstáculos
            for (let obstacle of game.obstacles) {
                if (checkCollision(player, obstacle)) {
                    if (player.velY > 0 && player.y < obstacle.y) {
                        player.y = obstacle.y - player.height;
                        player.velY = 0;
                        player.onGround = true;
                    }
                    else if (player.velY < 0 && player.y > obstacle.y) {
                        player.y = obstacle.y + obstacle.height;
                        player.velY = 0;
                    }
                    else if (player.velX > 0) {
                        player.x = obstacle.x - player.width;
                    }
                    else if (player.velX < 0) {
                        player.x = obstacle.x + obstacle.width;
                    }
                }
            }
        }

        // Actualizar enemigo
        function updateEnemy() {
            const enemy = game.enemy;
            const player = game.player;
            
            const distance = calculateDistance(
                {x: enemy.x + enemy.width/2, y: enemy.y + enemy.height/2},
                {x: player.x + player.width/2, y: player.y + player.height/2}
            );

            // Verificar si está en zona de peligro
            if (distance < enemy.aggroRange) {
                if (!inDangerZone) {
                    inDangerZone = true;
                    dangerTime = Date.now();
                    playDangerSound();
                    document.getElementById('dangerIndicator').classList.remove('hidden');
                }
                
                // Verificar si han pasado 3 segundos en zona de peligro
                if (Date.now() - dangerTime > 3000) {
                    gameOver();
                    return;
                }
            } else {
                if (inDangerZone) {
                    inDangerZone = false;
                    stopDangerSound();
                    document.getElementById('dangerIndicator').classList.add('hidden');
                }
            }

            // Perseguir si está en rango de detección
            if (distance < enemy.detectionRange && distance > 5) {
                const direction = normalizeVector({
                    x: player.x - enemy.x,
                    y: player.y - enemy.y
                });

                enemy.x += direction.x * enemy.speed;
                enemy.y += direction.y * enemy.speed;

                // Límites para el enemigo
                if (enemy.x < 0) enemy.x = 0;
                if (enemy.x + enemy.width > canvas.width) enemy.x = canvas.width - enemy.width;
                if (enemy.y + enemy.height > game.groundY) enemy.y = game.groundY - enemy.height;
                if (enemy.y < 0) enemy.y = 0;
            }
        }

        // Actualizar objeto rotatorio
        function updateRotatingObject() {
            const obj = game.rotatingObject;
            obj.angle += 0.05;
            
            if (obj.growing) {
                obj.size += 0.01;
                if (obj.size >= 1.5) obj.growing = false;
            } else {
                obj.size -= 0.01;
                if (obj.size <= 0.5) obj.growing = true;
            }
        }

        // Funciones de dibujo
        function drawPlayer() {
            const player = game.player;
            
            ctx.fillStyle = '#306377';
            ctx.fillRect(player.x, player.y, player.width, player.height);
            
            ctx.fillStyle = 'white';
            ctx.fillRect(player.x + 5, player.y + 5, 6, 6);
            ctx.fillRect(player.x + 19, player.y + 5, 6, 6);
            
            ctx.fillStyle = 'black';
            ctx.fillRect(player.x + 7, player.y + 7, 3.3, 3.3);
            ctx.fillRect(player.x + 21, player.y + 7, 3.3, 3.3);
        }

        function drawEnemy() {
            const enemy = game.enemy;
            const player = game.player;
            
            const distance = calculateDistance(
                {x: enemy.x + enemy.width/2, y: enemy.y + enemy.height/2},
                {x: player.x + player.width/2, y: player.y + player.height/2}
            );

            if (distance < enemy.detectionRange) {
                ctx.fillStyle = '#181818';
            } else {
                ctx.fillStyle = '#272727';
            }
            
            ctx.fillRect(enemy.x, enemy.y, enemy.width+10, enemy.height+5);
            
            ctx.fillStyle = 'white';
            ctx.fillRect(enemy.x + 8, enemy.y + 9, 6, 6);
            ctx.fillRect(enemy.x + 22, enemy.y + 9, 6, 6);

            // Rango de detección
            if (distance < enemy.detectionRange) {
                ctx.strokeStyle = '#454545';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.detectionRange, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            // Zona de peligro
            if (distance < enemy.aggroRange) {
                ctx.strokeStyle = '#2f2f2f';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.aggroRange, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        function drawObstacles() {
            for (let obstacle of game.obstacles) {
                ctx.fillStyle = '#584b83'
                ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                
                ctx.strokeStyle = '#4a3e71';
                ctx.lineWidth = 2;
                ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            }
        }

        function drawRotatingObject() {
            const obj = game.rotatingObject;
            
            ctx.save();
            ctx.translate(obj.x, obj.y);
            ctx.rotate(obj.angle);
            ctx.scale(obj.size, obj.size);
            
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            for (let i = 0; i < 10; i++) {
                const angle = (i / 10) * Math.PI * 2;
                const radius = i % 2 === 0 ? 20 : 10;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.fill();
            
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.restore();
        }

        function drawGround() {
            ctx.fillStyle = '#261c49';
            ctx.fillRect(0, game.groundY, canvas.width, canvas.height - game.groundY);
            
            ctx.fillStyle = '#4d3f7b';
            for (let x = 0; x < canvas.width; x += 20) {
                ctx.fillRect(x, game.groundY, 2, 10);
            }
        }

        function updateInfo() {
            if (currentState !== GameState.PLAYING) return;
            
            const distance = calculateDistance(
                {x: game.enemy.x + game.enemy.width/2, y: game.enemy.y + game.enemy.height/2},
                {x: game.player.x + game.player.width/2, y: game.player.y + game.player.height/2}
            );
            
            const survivalTime = Math.floor((Date.now() - gameStartTime) / 1000);
            let dangerText = '';
            
            if (inDangerZone) {
                const timeLeft = 3 - Math.floor((Date.now() - dangerTime) / 1000);
                dangerText = ` | PELIGRO: ${timeLeft}s`;
            }
            
            document.getElementById('infoText').innerHTML = `
                Distancia: ${Math.round(distance)}px | 
                Tiempo: ${survivalTime}s${dangerText}
            `;
        }

        // Bucle principal del juego
        function gameLoop() {
            // Limpiar canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Fondo con gradiente
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#382d5b');
            gradient.addColorStop(1, '#b5add3');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            if (currentState === GameState.PLAYING) {
                // Actualizar
                updatePlayer();
                updateEnemy();
                updateRotatingObject();
                updateInfo();
                
                // Dibujar
                drawGround();
                drawObstacles();
                drawRotatingObject();
                drawPlayer();
                drawEnemy();
            }
            
            requestAnimationFrame(gameLoop);
        }

        // Iniciar el juego
        gameLoop();