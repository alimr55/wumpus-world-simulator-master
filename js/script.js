var canvas, ctx;
var darknessCanvas, darknessCtx;
var keys, env, player;
var isAlive = true, isFinished = false;

// === المتغيرات ===
var trail = []; 
var visited = {}; 
var flashGold = 0; 
var particles = []; 
var dustParticles = []; 
var floatTexts = []; 
var glitchEffect = 0; 
var globalTime = 0;

function restart(){
    if (!env){
        env = new Environment(15, 8, 64, 64);
    }
    if (isFinished) {
        env = new Environment(15, 8, 64, 64);
    } else {
        env.restart();
    }
    player = new Player(env, 0, 0);
    
    trail = []; 
    trail.push({x: 0, y: 0, alpha: 1.0});
    
    visited = {}; 
    particles = [];
    floatTexts = [];
    dustParticles = []; 
    globalTime = 0;

    // غبار الجو
    for(var i=0; i<50; i++) {
        dustParticles.push({
            x: Math.random() * env.width * env.i,
            y: Math.random() * env.height * env.j,
            vx: (Math.random() - 0.5) * 0.1,
            vy: (Math.random() - 0.5) * 0.1,
            size: Math.random() * 2,
            alpha: Math.random() * 0.5
        });
    }

    glitchEffect = 0; 
    flashGold = 0;
    env.removeWalls = false; 

    visitCurrentTile();

    $("#modal-win").modal("hide");
    $("#modal-game-over").modal("hide");
    $('#btn-remove-walls').prop('checked', false);

    resources.stop("game-over");
    resources.stop("win");
    resources.play("theme", false);

    isAlive = true;
    isFinished = false;

    animate();
}

function resizeCanvas(){
    if(!canvas) return;
    canvas.width = env.width * env.i;
    canvas.height = env.height * env.j;
    
    if(darknessCanvas) {
        darknessCanvas.width = canvas.width;
        darknessCanvas.height = canvas.height;
    }
}

function onKeydown(e) {
    if([37, 38, 39, 40].indexOf(e.keyCode) > -1) {
        e.preventDefault();
    }
    if(keys) keys.onKeyDown(e);
};

function visitCurrentTile() {
    if (!player) return;
    var pRow = Math.round(player.y / env.height);
    var pCol = Math.round(player.x / env.width);
    var key = pRow + "," + pCol;
    if (!visited[key]) {
        visited[key] = { 
            x: pCol * env.width + (env.width/2), 
            y: pRow * env.height + (env.height/2) 
        };
    }
}

// === خوارزمية الحواس ===
function checkStench() {
    if (!env || !env.wumpus) return false;
    var wumpusList = [].concat(env.wumpus);
    var pRow = Math.round(player.y / env.height);
    var pCol = Math.round(player.x / env.width);
    for (var i = 0; i < wumpusList.length; i++) {
        var w = wumpusList[i];
        if(!w) continue;
        if ((w.i == pRow && Math.abs(w.j - pCol) == 1) || 
            (w.j == pCol && Math.abs(w.i - pRow) == 1) ||
            (w.i == pRow && w.j == pCol)) { 
            return true;
        }
    }
    return false;
}

function checkBreeze() {
    if (!env || !env.holes) return false;
    var holesList = [].concat(env.holes);
    var pRow = Math.round(player.y / env.height);
    var pCol = Math.round(player.x / env.width);
    for (var i = 0; i < holesList.length; i++) {
        var h = holesList[i];
        if(!h) continue;
        if ((h.i == pRow && Math.abs(h.j - pCol) == 1) || 
            (h.j == pCol && Math.abs(h.i - pRow) == 1) ||
            (h.i == pRow && h.j == pCol)) {
            return true;
        }
    }
    return false;
}

function getGoldAngle() {
    if (!env.golds || env.golds.length === 0) return null;
    var closestGold = null;
    var minDist = 9999;
    var pX = player.x + env.width/2;
    var pY = player.y + env.height/2;

    for (var i = 0; i < env.golds.length; i++) {
        var g = env.golds[i];
        var gX = g.j * env.width + env.width/2;
        var gY = g.i * env.height + env.height/2;
        var dist = Math.sqrt(Math.pow(gX - pX, 2) + Math.pow(gY - pY, 2));
        if (dist < minDist) {
            minDist = dist;
            closestGold = { x: gX, y: gY };
        }
    }
    if (minDist < (env.width * 4)) {
        return Math.atan2(closestGold.y - pY, closestGold.x - pX);
    }
    return null;
}

function createExplosion(x, y, color) {
    for (var i = 0; i < 30; i++) {
        particles.push({
            x: x + (env.width / 2),
            y: y + (env.height / 2),
            vx: (Math.random() - 0.5) * 8, 
            vy: (Math.random() - 0.5) * 8,
            life: 1.0, 
            color: color,
            size: Math.random() * 4 + 1
        });
    }
}

function createFloatingText(text, x, y, color) {
    floatTexts.push({
        text: text,
        x: x + (env.width / 2),
        y: y,
        vy: -2, 
        life: 1.0,
        color: color
    });
}

function update(){
    var oldX = player.x;
    var oldY = player.y;
    globalTime += 0.05;

    if (player.update(keys)) {
        player.score -= 10;
        visitCurrentTile(); 
    }
    
    if (player.x !== oldX || player.y !== oldY) {
        trail.push({ x: player.x, y: player.y, alpha: 1.0 });
        if (trail.length > 25) trail.shift();
    }

    for(var i=0; i<dustParticles.length; i++) {
        var d = dustParticles[i];
        d.x += d.vx; d.y += d.vy;
        if(d.x < 0) d.x = canvas.width; if(d.x > canvas.width) d.x = 0;
        if(d.y < 0) d.y = canvas.height; if(d.y > canvas.height) d.y = 0;
        d.alpha = 0.3 + Math.random() * 0.4;
    }

    for (var i = particles.length - 1; i >= 0; i--) {
        var p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.02; 
        if (p.life <= 0) particles.splice(i, 1); 
    }

    for (var i = floatTexts.length - 1; i >= 0; i--) {
        var ft = floatTexts[i];
        ft.y += ft.vy; ft.life -= 0.015;
        if (ft.life <= 0) floatTexts.splice(i, 1);
    }

    if(!$('#btn-remove-walls').is(':checked')) {
        env.removeWalls = false; 
    }

    var deadWumpus = player.kill(keys);

    if (deadWumpus) {
        player.score += 1000;
        env.removeWumpus(deadWumpus);
        createExplosion(deadWumpus.j * env.width, deadWumpus.i * env.height, "#ff0000");
        createFloatingText("ELIMINATED", player.x, player.y, "#ff0000");
    }

    var capturedGold = player.capture(keys);

    if (capturedGold) {
        player.score += 1000;
        env.removeGold(capturedGold);
        resources.play("gold");
        flashGold = 1.0; 
        createExplosion(player.x, player.y, "#ffd700");
        createFloatingText("+1000 GOLD", player.x, player.y, "#ffd700");

        if (env.golds.length == 0){
            isFinished = true;
        }
    }

    if(env.hasAHole(player) || env.hasAWumpus(player)){
        if (isAlive) {
            createExplosion(player.x, player.y, "#00d4ff"); 
            glitchEffect = 40; 
        }
        isAlive = false;
    }

    $("#score").html(player.score);
    $("#arrow").html(player.arrow);
    $("#gold").html(env.golds.length);
    
    if(!isAlive){ displayGameOver(); }
    if(isFinished){ displayCongratulations(); }
}

function displayGameOver(){
    $("#modal-game-over").modal("show");
    resources.play("game-over", false);
    resources.stop("theme");
}

function displayCongratulations(){
    $("#modal-win").modal("show");
    resources.play("win", false);
    resources.stop("theme");
}

// ====================================================
// الرسم
// ====================================================
function draw(){

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (env) env.draw(ctx);

    // 1. رسم خط التدفق الرقمي
    if (trail.length > 1) {
        ctx.save();
        var lastPoint = trail[trail.length-1]; 
        var firstPoint = trail[0]; 
        var gradient = ctx.createLinearGradient(
            lastPoint.x + env.width/2, lastPoint.y + env.height/2,
            firstPoint.x + env.width/2, firstPoint.y + env.height/2
        );
        gradient.addColorStop(0, "rgba(255, 255, 255, 1)"); 
        gradient.addColorStop(0.2, "rgba(0, 243, 255, 0.8)"); 
        gradient.addColorStop(1, "rgba(0, 243, 255, 0)"); 

        ctx.beginPath();
        if(player) {
            ctx.moveTo(player.x + env.width/2, player.y + env.height/2);
        }
        for (var i = trail.length - 1; i >= 0; i--) {
            var tx = trail[i].x + env.width/2;
            var ty = trail[i].y + env.height/2;
            ctx.lineTo(tx, ty);
        }
        ctx.lineCap = "round"; ctx.lineJoin = "round";
        var time = Date.now() / 200;
        ctx.lineWidth = 4 + Math.sin(time) * 1.5; 
        ctx.strokeStyle = gradient;
        ctx.shadowColor = "#00f3ff"; ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.restore();
    }

    if (trail.length > 0) {
        var time = Date.now() / 200;
        for (var i = 0; i < trail.length; i++) {
            var t = trail[i];
            t.alpha -= 0.005; 
            if(t.alpha < 0) t.alpha = 0;
            if (t.alpha > 0) {
                ctx.save();
                ctx.beginPath();
                var tx = t.x + env.width/2;
                var ty = t.y + env.height/2;
                var pulseSize = 4 + Math.sin(time + i) * 1.5; 
                ctx.arc(tx, ty, pulseSize, 0, Math.PI*2);
                ctx.fillStyle = "rgba(0, 243, 255, " + t.alpha + ")";
                ctx.shadowColor = "#ffffff"; ctx.shadowBlur = 5;
                ctx.fill();
                ctx.restore();
            }
        }
    }

    // 🔥🔥🔥 2. رسم الوحوش (النوم vs الغضب) 🔥🔥🔥
    // نرسمها *فوق* البيئة مباشرة (وقبل الظلام)
    if(env.wumpus && isAlive && !isFinished) {
        var wumpusList = [].concat(env.wumpus);
        var pX = player.x + env.width/2;
        var pY = player.y + env.height/2;

        for(var i=0; i<wumpusList.length; i++) {
            var w = wumpusList[i];
            if(!w) continue;
            
            var wx = w.j * env.width + env.width/2;
            var wy = w.i * env.height + env.height/2;
            
            // حساب المسافة
            var dx = wx - pX;
            var dy = wy - pY;
            var dist = Math.sqrt(dx*dx + dy*dy);
            
            // هل اللاعب قريب؟ (أقل من 3 مربعات)
            var isAngry = dist < (env.width * 3.5);

            ctx.save();
            ctx.translate(wx, wy);

            if (isAngry) {
                // === وضع الغضب (Rage Mode) ===
                
                // 1. اهتزاز (Vibration)
                var shakeX = (Math.random() - 0.5) * 4;
                var shakeY = (Math.random() - 0.5) * 4;
                ctx.translate(shakeX, shakeY);

                // 2. هالة حمراء مشعة
                ctx.beginPath();
                ctx.arc(0, 0, env.width/1.8, 0, Math.PI*2);
                ctx.fillStyle = "rgba(255, 0, 0, 0.4)";
                ctx.shadowColor = "#ff0000";
                ctx.shadowBlur = 20;
                ctx.fill();

                // 3. علامة تعجب
                ctx.font = "bold 20px Arial";
                ctx.fillStyle = "#ffffff";
                ctx.fillText("!!", 10, -25);

            } else {
                // === وضع النوم (Sleep Mode) ===
                // طفو بسيط
                var floatY = Math.sin(globalTime * 2) * 5;
                ctx.translate(0, floatY);
                
                // علامة Zzz
                ctx.font = "bold 14px Arial";
                ctx.fillStyle = "#aaa";
                ctx.fillText("Zzz...", 10, -20);
            }

            ctx.restore();
        }
    }

    if (player && isAlive) {
        var goldAngle = getGoldAngle();
        if (goldAngle !== null) {
            var centerX = player.x + (env.width / 2);
            var centerY = player.y + (env.height / 2);
            var compassRadius = env.width / 1.5;
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(goldAngle);
            ctx.beginPath();
            ctx.moveTo(compassRadius, 0);
            ctx.lineTo(compassRadius - 10, -5);
            ctx.lineTo(compassRadius - 10, 5);
            ctx.closePath();
            ctx.fillStyle = "#ffd700"; ctx.shadowColor = "#ffd700"; ctx.shadowBlur = 10;
            ctx.fill();
            ctx.restore();
        }
        player.draw(ctx);
    }

    // === طبقة الظلام ===
    if (player && !isFinished && darknessCtx) {
        darknessCtx.clearRect(0, 0, canvas.width, canvas.height);
        
        darknessCtx.globalCompositeOperation = 'source-over';
        darknessCtx.fillStyle = "rgba(0, 0, 0, 0.98)";
        darknessCtx.fillRect(0, 0, canvas.width, canvas.height);

        darknessCtx.globalCompositeOperation = 'destination-out';

        var pX = player.x + (env.width / 2);
        var pY = player.y + (env.height / 2);
        var lightRadius = (env.width * 2.5) + (Math.random() * 2); 

        var g = darknessCtx.createRadialGradient(pX, pY, lightRadius*0.2, pX, pY, lightRadius);
        g.addColorStop(0, "rgba(255, 255, 255, 1)"); 
        g.addColorStop(1, "rgba(255, 255, 255, 0)"); 

        darknessCtx.fillStyle = g;
        darknessCtx.beginPath();
        darknessCtx.arc(pX, pY, lightRadius, 0, Math.PI*2);
        darknessCtx.fill();

        for (var key in visited) {
            var v = visited[key];
            var candleRadius = env.width * 1.5; 
            var cg = darknessCtx.createRadialGradient(v.x, v.y, candleRadius*0.1, v.x, v.y, candleRadius);
            cg.addColorStop(0, "rgba(255, 255, 255, 0.8)"); 
            cg.addColorStop(1, "rgba(255, 255, 255, 0)");
            darknessCtx.fillStyle = cg;
            darknessCtx.beginPath();
            darknessCtx.arc(v.x, v.y, candleRadius, 0, Math.PI*2);
            darknessCtx.fill();
        }

        ctx.drawImage(darknessCanvas, 0, 0);
        
        ctx.save();
        ctx.globalCompositeOperation = 'overlay'; 
        ctx.fillStyle = "rgba(255, 140, 50, 0.2)"; 
        for (var key in visited) {
             var v = visited[key];
             ctx.beginPath();
             ctx.arc(v.x, v.y, env.width * 1.2, 0, Math.PI*2);
             ctx.fill();
        }
        ctx.restore();
    }

    // غبار الجو
    for(var i=0; i<dustParticles.length; i++) {
        var d = dustParticles[i];
        ctx.save();
        ctx.globalAlpha = d.alpha * 0.5; 
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    }

    // الحواس
    if (player && isAlive) {
        var centerX = player.x + (env.width / 2);
        var centerY = player.y + (env.height / 2);

        if (checkStench()) {
            drawSensorLabel(centerX, centerY - 50, "⚠ DANGER", "#ff0000");
        }

        if (checkBreeze()) {
            drawSensorLabel(centerX, centerY - 50, "≈ WIND", "#ffffff");
        }
    }

    for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    for (var i = 0; i < floatTexts.length; i++) {
        var ft = floatTexts[i];
        ctx.save();
        ctx.globalAlpha = ft.life;
        ctx.font = "bold 18px Arial";
        ctx.fillStyle = ft.color;
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 5;
        ctx.fillText(ft.text, ft.x - 20, ft.y);
        ctx.restore();
    }

    if (flashGold > 0) {
        ctx.fillStyle = "rgba(255, 215, 0, " + flashGold * 0.3 + ")";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        flashGold -= 0.05; 
    }

    if (glitchEffect > 0) {
        ctx.save();
        ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (var i = 0; i < 10; i++) {
            var h = Math.random() * 30;
            var y = Math.random() * canvas.height;
            var w = canvas.width;
            ctx.fillStyle = "rgba(255, 0, 0, " + Math.random() * 0.5 + ")";
            ctx.fillRect(0, y, w, h);
        }
        ctx.restore();
        glitchEffect--; 
    }
}

function drawSensorLabel(x, y, text, color) {
    ctx.save();
    ctx.font = "bold 14px Arial";
    var textWidth = ctx.measureText(text).width;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    if(ctx.roundRect) ctx.roundRect(x - textWidth/2 - 5, y - 15, textWidth + 10, 20, 5);
    else ctx.fillRect(x - textWidth/2 - 5, y - 15, textWidth + 10, 20); 
    ctx.fill();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 5;
    ctx.textAlign = "center";
    ctx.fillText(text, x, y);
    ctx.restore();
}

function animate(){
    update();
    draw();
    requestAnimationFrame(animate); 
}

if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.beginPath();
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
        return this;
    };
}

function getURL(){ var url = "{"; url += "\"holes\":" + encodeToArray(env.holes) + ","; url += "\"golds\":" + encodeToArray(env.golds) + ","; url += "\"wumpus\":" + encodeToArray(env.wumpus) + "}"; return "#" + btoa(url); }
function encodeToArray(array){ return JSON.stringify(array); }
function getLink(){ return window.location.href+getURL(); }
function loadEnvironment(hash){ var link = atob(hash.replace('#', '')); var obj = $.parseJSON(link); env.holes = obj.holes; env.golds = obj.golds; env.wumpus = obj.wumpus; }
function getCurrentVolume(){ return localStorage.getItem("wws-volume") || 0.1; }
function changeVolumeTo(level){ Howler.volume(level); localStorage.setItem("wws-volume", level); }
function getCurrentLanguage(){ return localStorage.getItem("wws-locale") || 'en_us'; }
function changeLanguageTo(locale){ if (locale == "ar") { $("html[lang=en]").attr("dir", "rtl") } else { $("html[lang=en]").attr("dir", "ltr") } $.i18n().locale = locale; $('body').i18n(); $('#select-language').selectpicker('refresh'); localStorage.setItem("wws-locale", locale); }
$(function(){ 
    canvas = document.getElementById("canvas"); 
    ctx = canvas.getContext("2d"); 
    darknessCanvas = document.createElement('canvas');
    darknessCtx = darknessCanvas.getContext('2d');
    keys = new Keys(); 
    $('select').selectpicker({ dropdownAlignRight: true }); $.i18n.debug = true; $.i18n({ locale: getCurrentLanguage() }); $.i18n().load( { en_us: 'i18n/en_us.json', pt_br: 'i18n/pt_br.json', ar: 'i18n/ar.json', fr: 'i18n/fr.json', tr_TR: 'i18n/tr_TR.json', es_mx: 'i18n/es_mx.json' }).done( function() { changeLanguageTo($.i18n().locale); }); $('#select-language').selectpicker('val', $.i18n().locale); $("#select-language").change(function(event){ event.preventDefault(); changeLanguageTo($(this).val()); }); $('#btn-remove-walls').change(function() { env.removeWalls = this.checked; $(this).blur(); }); $(".btn-restart").click(function(){ restart(); }); $(".card-game").width(canvas.width); $(".card-game .card-content").height(canvas.height); $('#modal-share').on('shown.bs.modal', function () { $('#textarea-link').text(getLink()); }); changeVolumeTo(getCurrentVolume()); $("#btn-volume").val(getCurrentVolume().toString()); $("#btn-volume").change(function(event){ event.preventDefault(); changeVolumeTo($(this).val()); }); resources.load().then(() => { resources.play("theme", false); var hash = window.location.hash; if (hash) { loadEnvironment(hash); } restart(); resizeCanvas(); window.addEventListener("keydown", onKeydown, false); animate(); }) });