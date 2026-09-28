const Engine = Matter.Engine,
  World = Matter.World,
  Bodies = Matter.Bodies,
  Body = Matter.Body,
  Composite = Matter.Composite,
  Constraint = Matter.Constraint;

//엔진객체 생성
let circles = [];
let triangles = [];
let boxes = [];
let propellers = [];
let world, engine, slope, propeller, s_vertices, slope2, s2_vertices;
let c_d = 0.001;
let b_d = 0.005;
let t_d;

function setup() {
  // put setup code here
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  engine = Engine.create();
  world = engine.world;
  let r = 50;
  Composite.add(world, [
    // Bodies.rectangle(-r / 2, height / 2, r, height, { isStatic: true }),
    Bodies.rectangle(width + r / 2, height / 2, r, height, {
      isStatic: true,
    }),
    Bodies.rectangle(width / 2, height + r / 2, width, r, { isStatic: true }),
  ]);

  //slope1
  s_vertices = [
    { x: 0, y: 500 },
    { x: width * (3 / 5), y: height * (4 / 5) },
    { x: width * (2 / 5) + 200, y: height },
    { x: 0, y: height },
  ];
  slope = Bodies.fromVertices(0, 0, s_vertices, { isStatic: true });
  //중심 맞추기
  let centre = Matter.Vertices.centre(s_vertices);
  Body.setPosition(slope, centre);
  Composite.add(world, slope);
  // slope2
  s2_vertices = [
    { x: width * 0.68 + 4, y: height },
    { x: width * 0.74, y: height * 0.82 + 30 },
    { x: width, y: height * 0.94 + 30 },
    { x: width, y: height },
  ];
  slope2 = Bodies.fromVertices(0, 0, s2_vertices, {
    isStatic: true,
    friction: 1,
  });

  let centre2 = Matter.Vertices.centre(s2_vertices);
  Body.setPosition(slope2, centre2);
  Composite.add(world, slope2);

  //propeller 만들기
  let p = new Propeller(
    width * (3 / 5) + 64,
    height * (4 / 5) + 27,
    60,
    20,
    -0.3,
  );
  let k = new Propeller(
    width * (3 / 5) + 170,
    height * (4 / 5) + 27,
    60,
    20,
    -0.3,
  );
  propellers.push(p);
  propellers.push(k);
}

function draw() {
  background(255);
  Engine.update(engine, 1000 / 50);
  engine.gravity.y = 1;
  //slope 그리기
  stroke(0);
  noFill();
  beginShape();
  for (let v of s_vertices) {
    vertex(v.x, v.y);
  }
  endShape(CLOSE);
  //slope2 그리기
  stroke(0);
  noFill();
  beginShape();
  for (let q of s2_vertices) {
    vertex(q.x, q.y);
  }
  endShape(CLOSE);
  //propellers 돌리기
  for (let i = 0; i < propellers.length; i++) {
    propellers[i].show();
    propellers[i].rotate();
  }
  //circle 그리기
  if (frameCount % 20 == 0) {
    circles.push(new Circle(10, 10, 15, c_d));
  }
  for (let i = 0; i < circles.length; i++) {
    circles[i].show();
  }
  //box 그리기
  if (frameCount % 20 == 10) {
    boxes.push(new Box(10, 10, 20, b_d));
  }
  for (let i = 0; i < boxes.length; i++) {
    boxes[i].show();
  }
}

//propeller 생성자함수
function Propeller(x, y, w, h, a) {
  this.a = a;
  this.w = w;
  this.h = h;
  let options = { density: 1, restitution: 1.1, friction: 0 };
  this.body1 = Bodies.rectangle(x, y, w, h, options);
  this.body2 = Bodies.rectangle(x, y, h, w, options);
  this.body = Body.create({
    parts: [this.body1, this.body2],
  });
  Composite.add(world, this.body);

  this.constraint = Constraint.create({
    bodyA: this.body,
    pointB: { x: x, y: y },
    stiffness: 1,
  });

  Composite.add(world, this.constraint);

  this.rotate = function () {
    Body.setAngularVelocity(this.body, this.a);
  };
  this.show = function () {
    stroke(0);
    let pos = this.body.position;
    let angle = this.body.angle;

    push();
    translate(pos.x, pos.y);
    rotate(angle);
    rectMode(CENTER);
    rect(0, 0, this.w, this.h);
    rect(0, 0, this.h, this.w);
    pop();
  };
}

//Circle 생성자함수
function Circle(x, y, r, c_d) {
  this.col = color(random(150), 100, 100);
  let options = {
    restitution: 0.8,
    friction: 0.03,
    density: c_d,
  };
  this.body = Bodies.circle(x, y, r, options);
  Composite.add(world, this.body);

  //p5.js 에서 그리기
  this.show = function () {
    let pos = this.body.position;
    fill(this.col);
    push();
    translate(pos.x, pos.y);
    ellipse(0, 0, r * 2);
    pop();
  };
}

//box 생성자함수
function Box(x, y, r, b_d) {
  this.col = color(random(180, 360), 10, 100);
  let options = {
    restitution: 1.3,
    friction: 0.02,
    density: b_d,
  };
  this.body = Bodies.rectangle(x, y, r, r, options);
  Composite.add(world, this.body);

  //p5.js 에서 그리기
  this.show = function () {
    let pos = this.body.position;
    let angle = this.body.angle;
    fill(this.col);
    push();
    translate(pos.x, pos.y);
    rotate(angle);
    rectMode(CENTER);
    rect(0, 0, r, r);
    pop();
  };
}
