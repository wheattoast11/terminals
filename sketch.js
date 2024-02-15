let song, fft;
let particles = [];
let cubeSize = 500;
let firstPersonMode = false;
let easyCam;
let zoom = 500;
let zoomDirection = 1;
let zoomSpeed = 2;
let zoomMin = 0;
let zoomMax = 5000;
let moons = [];
let numMoons = 8;
let moonDistance = 4000;
let figure1 = [];
let figure2 = [];
let dragAmount = 0;

function preload() {
  song = loadSound("https://github.com/wheattoast11/terminals/blob/main/04%20round%20(1)%20(1).mp3");
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  fft = new p5.FFT();
  song.loop();
  easyCam = createEasyCam({ distance: zoom });
  document.oncontextmenu = () => false;

  particles = new Array(3333).fill().map(() => new Particle());

  createHumanoidTargets();
  createMoons();
}

function draw() {
  // Optimized: Set a solid background to improve performance
  let t = frameCount * 0.01;
  fluidBackground(t);
  zoom += zoomSpeed * zoomDirection;
  if (zoom > zoomMax || zoom < zoomMin) zoomDirection *= -1;
  easyCam.setDistance(zoom);

  let time = millis() * 0.0005 + dragAmount;
  rotateY(time);
  rotateX(time * 0.3);

  stroke((frameCount * 3) % 255, 255, 255);
  strokeWeight(4);
  noFill();
  box(cubeSize);

  animateMoons();

  particles.forEach((particle) => {
    particle.update();
    particle.show();
  });

  let waveform = fft.waveform();
  drawWaveform(waveform);

  if (!firstPersonMode) {
    let camTime = millis() * 0.0005 + dragAmount;
    easyCam.rotateY(camTime);
    easyCam.rotateX(camTime * 0.3);
  }

  animateToHumanoidForm();
}

function mousePressed() {
  particles.forEach((particle) => {
    particle.vel = p5.Vector.random3D().mult(random(5, 10));
  });
}

function mouseReleased() {
  particles.forEach((particle) => {
    particle.resetPosition(cubeSize);
  });
}

function mouseDragged() {
  dragAmount += sqrt(sq(mouseX - pmouseX) + sq(mouseY - pmouseY)) * 0.00001;
  song.rate(min(max(dragAmount * 100, 0.1), 4)); // Constrain rate for usability
}

function keyPressed() {
  if (key === " ") {
    firstPersonMode = !firstPersonMode;
    easyCam.setDistance(firstPersonMode ? 0 : zoom);
  }
  if (keyCode === UP_ARROW || keyCode === DOWN_ARROW) {
    cubeSize = keyCode === UP_ARROW ? random(200, 700) : 500;
    moonDistance = keyCode === UP_ARROW ? random(3000, 5000) : 4000;
    createHumanoidTargets();
  } else if (keyCode === 80) {
    // 'P' key for planetary view
    togglePlanetaryView();
  }
}

function mouseWheel(event) {
  zoom += event.delta;
  zoom = constrain(zoom, zoomMin, zoomMax);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// Optimizations and refactoring below (e.g., simplified creation of humanoid targets, optimized animation methods)

function createHumanoidTargets() {
  figure1 = [];
  figure2 = [];
  let offsetX = 0;

  // Simplify humanoid target creation with a generic function
  createHumanoid(figure1, offsetX, -200);
  createHumanoid(figure2, offsetX + 200, -200);

  assignParticlesToTargets([...figure1, ...figure2]);
}

function createHumanoid(figure, offsetX, offsetY) {
  for (let i = 0; i < 36; i++) {
    let angle = (TWO_PI / 36) * i;
    let r = 50;
    figure.push(
      createVector(offsetX + r * cos(angle), offsetY + r * sin(angle), 0)
    );
  }

  for (let i = 0; i < 75; i++) {
    figure.push(
      createVector(
        offsetX - 50 + (i < 50 ? 0 : -25),
        offsetY - 150 + i * (i < 50 ? 3 : 4),
        0
      )
    );
    if (i < 50)
      figure.push(createVector(offsetX + 50, offsetY - 150 + i * 3, 0));
  }

  for (let i = 0; i < 25; i++) {
    figure.push(
      createVector(offsetX - 75, offsetY - 150 + i * 2, 0),
      createVector(offsetX + 75, offsetY - 150 + i * 2, 0)
    );
  }
}

function assignParticlesToTargets(targets) {
  particles.forEach((particle) => {
    particle.target = targets.reduce(
      (closest, point) => {
        let d = p5.Vector.dist(particle.pos, point);
        return d < closest.dist ? { dist: d, point: point } : closest;
      },
      { dist: Infinity, point: null }
    ).point;
  });
}

function animateToHumanoidForm() {
  particles.forEach((particle) => {
    let force = p5.Vector.sub(particle.target, particle.pos);
    force.setMag(0.1);
    particle.acc.add(force);
  });
}

class Particle {
  constructor() {
    this.pos = p5.Vector.random3D().mult(random(0.5 * cubeSize));
    this.vel = createVector(0, 0, 0);
    this.acc = createVector(0, 0, 0);
    this.size = random(0.5, 1);
    this.target = createVector();
  }

  resetPosition(size) {
    this.pos = p5.Vector.random3D().mult(random(0.5 * size));
  }

  update() {
    this.edges();
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.mult(0);

    let force = p5.Vector.sub(this.target, this.pos);
    force.setMag(0.1);
    this.acc.add(force);

    let beat = fft.getEnergy(100, 200);
    if (beat > 0) {
      this.acc.add(p5.Vector.random3D().mult(0.01 * beat));
    }
  }

  show() {
    let particleCol = lerpColor(
      color(255, 204, 0),
      color(255, 0, 204),
      sin(frameCount * 0.02)
    );
    stroke(particleCol);
    strokeWeight(this.size);
    point(this.pos.x, this.pos.y, this.pos.z);
  }

  edges() {
    if (this.pos.x > cubeSize / 2 || this.pos.x < -cubeSize / 2)
      this.vel.x *= -1;
    if (this.pos.y > cubeSize / 2 || this.pos.y < -cubeSize / 2)
      this.vel.y *= -1;
    if (this.pos.z > cubeSize / 2 || this.pos.z < -cubeSize / 2)
      this.vel.z *= -1;
  }
}
function fluidBackground(t) {
  let colors = [
    color(255, 0, 0, 50),
    color(0, 255, 0, 50),
    color(0, 0, 255, 50),
  ];
  for (let i = 0; i < colors.length; i++) {
    fill(colors[i]);
    noStroke();
    ellipse(
      sin(t + i) * 200 + width / 2,
      cos(t + i) * 200 + height / 2,
      2000,
      2000
    );
  }
}

function psychedelicPatterns() {
  let spectrum = fft.analyze();
  for (let i = 0; i < spectrum.length; i++) {
    let angle = map(i, 0, spectrum.length, 0, TWO_PI);
    let amp = spectrum[i];
    let r = map(amp, 0, 256, 20, 100);
    stroke(i, 255, 255);
    noFill();
    push();
    rotate(angle);
    translate(width / 2, height / 2);
    beginShape();
    for (let j = 0; j < TWO_PI; j += 0.1) {
      let x = r * cos(j);
      let y = r * sin(j);
      let z = r * tan(j);
      vertex(x, y, z);
    }
    endShape(CLOSE);
    pop();
  }
}

function drawWaveform(waveform) {
  noFill();
  strokeWeight(2);
  beginShape();
  for (let i = 0; i < waveform.length; i++) {
    let angle = map(i, 0, waveform.length, 0, TWO_PI);
    let rad = map(waveform[i], -1, 1, 0, cubeSize / 2);
    let x = rad * cos(angle);
    let y = rad * sin(angle);
    let z = 0;
    stroke(
      lerpColor(
        color(255, 255, 255),
        color(255, (frameCount * 3) % 255, 255),
        255
      )
    );
    vertex(x, y, 0);
  }
  endShape(CLOSE);
}

function createMoons() {
  for (let i = 0; i < numMoons; i++) {
    moons.push({
      x: random(-moonDistance, moonDistance),
      y: random(-moonDistance, moonDistance),
      z: random(-moonDistance, moonDistance),
    });
  }
}

function animateMoons() {
  moons.forEach((moon, index) => {
    push();
    let rotation = millis() / 1000;
    rotateY(rotation);
    translate(moon.x, moon.y, moon.z);
    noStroke();
    fill(
      lerpColor(
        color(255, 204, 0),
        color(255, 0, 204),
        sin(frameCount * 0.02 + index)
      )
    );
    sphere(300);
    pop();
  });
}

function togglePlanetaryView() {
  firstPersonMode = !firstPersonMode;
  if (firstPersonMode) {
    easyCam.setRotation(createVector(PI / 2, 0, 0), 0);
    easyCam.setPosition(0, -moonDistance * 1.5, 0);
    easyCam.setDistance(moonDistance * 2);
  } else {
    easyCam.setRotation(createVector(0, 0, 0), 0);
    easyCam.setDistance(zoom);
  }
}

function mousePressed() {
  moons.forEach((moon, index) => {
    let moonPos = createVector(moon.x, moon.y, moon.z);
    let mousePos = createVector(mouseX - width / 2, mouseY - height / 2, 0);
    if (moonPos.dist(mousePos) < 300) {
      window.open("url_for_application_" + index, "_blank");
    }
  });
  particles.forEach((particle) => {
    particle.vel = p5.Vector.random3D().mult(random(5, 10));
  });
}

function mouseReleased() {
  dragAmount = 0;
  song.rate(1);
  particles.forEach((particle) => {
    particle.pos = p5.Vector.random3D().mult(random(0.5 * cubeSize));
  });
}

function mouseDragged() {
  dragAmount += sqrt(sq(mouseX - pmouseX) + sq(mouseY - pmouseY)) * 0.00001;
  let speed = dragAmount * 100;
  song.rate(speed);
}

function keyPressed() {
  if (key === " ") {
    firstPersonMode = !firstPersonMode;
    easyCam.setDistance(firstPersonMode ? 0 : zoom);
  }
  if (keyCode === UP_ARROW) {
    cubeSize = random(200, 700);
    moonDistance = random(3000, 5000);
    createHumanoidTargets();
  } else if (keyCode === DOWN_ARROW) {
    cubeSize = 500;
    moonDistance = 4000;
    createHumanoidTargets();
  } else if (keyCode === 80) {
    // 'P' key for planetary view
    togglePlanetaryView();
  }
}

function mouseWheel(event) {
  zoom += event.delta;
  zoom = constrain(zoom, zoomMin, zoomMax);
}
