const Engine = Matter.Engine;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Body = Matter.Body;
const MouseConstraint = Matter.MouseConstraint;
const Mouse = Matter.Mouse;
const Composites = Matter.Composites;
const Constraint = Matter.Constraint;
// Matter.Common.setDecomp(decomp);
//라인별 배열 정의
let hairLine1 = [];
let hairLine2 = [];
let hairLine3 = [];
let hairLine4 = [];
let hairLine5 = [];
let hairLine6 = [];
let hairLine7 = [];
let hairLine8 = [];
let hairLine9 = [];
let hairLine10 = [];
//라인별 comp 정의
let hairComp1,
  hairComp2,
  hairComp3,
  hairComp4,
  hairComp5,
  hairComp6,
  hairComp7,
  hairComp8,
  hairComp9,
  hairComp10;
//라인별 객체 정의
let hair1, hair2, hair3, hair4, hair5, hair6, hair7, hair8, hair9, hair10;
//변수정의
let engine, world, center, canvas, mouseConstraint;
let pressedBody,
  pressX,
  pressY,
  releaseX,
  releaseY,
  mpos,
  img1,
  cuttingZone,
  img2,
  img3;
//가위
// let svg;
// let path;
// let vertices;
let scissors;
//
let constraintBroken = false;

// function preload() {
//   img1 = loadImage("interact.png");
// }

async function setup() {
  engine = Engine.create();
  world = engine.world;
  canvas = createCanvas(windowWidth, windowHeight);
  let mouse = Mouse.create(canvas.elt);
  mouse.pixelRatio = pixelDensity();
  //크기조절
  // mouse.scale.x = 1 / 1.3;
  // mouse.scale.y = 1 / 1.3;
  mouseConstraint = MouseConstraint.create(engine, { mouse: mouse });
  Composite.add(world, mouseConstraint);

  // 이미지 in setup
  img1 = await loadImage("interact.png");
  img2 = await loadImage("interact-12.png");
  img3 = await loadImage("interact-13.png");
  //중심 정의
  center = {
    x: windowWidth / 2,
    y: windowHeight / 2,
    r: 200,
  };
  let r = 9;
  //angle, xspace,yspace, length, r
  hair1 = defaultSetting(200, 50, 0, 7, r, hairComp1, hairLine1);
  hair2 = defaultSetting(220, 40, 0, 9, r, hairComp2, hairLine2);
  hair3 = defaultSetting(240, 40, 0, 10, r, hairComp3, hairLine3);
  hair4 = defaultSetting(260, 40, 0, 10, r, hairComp4, hairLine4);
  hair5 = defaultSetting(280, 40, 0, 10, r, hairComp5, hairLine5);
  hair6 = defaultSetting(300, 40, 0, 10, r, hairComp6, hairLine6);
  hair7 = defaultSetting(320, 40, 0, 9, r, hairComp7, hairLine7);
  hair8 = defaultSetting(340, 50, 0, 7, r, hairComp8, hairLine8);
  // hair9 = defaultSetting(268, 40, 0, 11, r, hairComp9, hairLine9);
  // hair10 = defaultSetting(272, 40, 0, 11, r, hairComp10, hairLine10);

  Matter.Events.on(mouseConstraint, "mousedown", function () {
    mpos = mouseConstraint.mouse.position;
    pressedBody = mouseConstraint.body;
    pressX = mpos.x;
    pressY = mpos.y;
    constraintBroken = false;
  });
  Matter.Events.on(engine, "collisionStart", function (event) {
    for (let pair of event.pairs) {
      let bodyA = pair.bodyA;
      let bodyB = pair.bodyB;
      if (pair.bodyA.id === scissors.id || pair.bodyB.id === scissors.id) {
        let otherBody = bodyA === scissors ? bodyB : bodyA;
        if (otherBody) {
          // console.log(otherBody);
          // let f = find(otherBody);
          // f.array = f.array.filter((x) => x != otherBody);
          // Composite.remove(f.comp, otherBody);
          // Composite.remove(world, otherBody);
          deleteConstraint(otherBody);
        }
      }
    }
  });

  //가위
  // let response = await fetch("interact.svg");
  // let text = await response.text();
  // let parser = new DOMParser();
  // svg = parser.parseFromString(text, "image/svg+xml");
  // path = svg.querySelector("path");
  // vertices = Matter.Svg.pathToVertices(path, 10);
  // scissors = Bodies.fromVertices(300, 200, vertices, {
  //   frictionAir: 0,
  // });
  scissors = Bodies.rectangle(width * 0.77, height * 0.45, 40, 70);
  Composite.add(world, scissors);
  let scissorsConstraint = Constraint.create({
    bodyA: scissors,
    pointB: {
      x: width * 0.77,
      y: height * 0.45,
    },
    stiffness: 1,
  });
  Composite.add(world, scissorsConstraint);
  Matter.Events.on(mouseConstraint, "mousedown", function () {
    if (mouseConstraint.body === scissors) {
      Composite.remove(world, scissorsConstraint);
    }
  });
}
function draw() {
  Engine.update(engine);
  engine.gravity.y = 1;
  background(255);
  //크기조절
  // push();
  // translate(width / 2, height / 2);
  // scale(1.3);
  // translate(-width / 2, -height / 2);
  //얼굴그리기
  fill("#FFEBCD");
  noStroke();
  circle(center.x, center.y, center.r);
  fill(0);
  rectMode(CENTER);
  rect(center.x - 20, center.y - 40, 7.3, 6.3);
  rect(center.x + 20, center.y - 40, 7.3, 6.3);
  textSize(26.8);
  text("/", center.x - 19, center.y - 50);
  text("/", center.x + 20.5, center.y - 50);
  textSize(35);
  textAlign(CENTER);
  text("!", center.x, center.y - 2);

  text(`_`, center.x, center.y + 55);

  stroke("#FFD700");
  strokeWeight(1.8);
  showLine(hair1);
  showBall(hair1.array);

  showLine(hair2);
  showBall(hair2.array);

  showLine(hair3);
  showBall(hair3.array);

  showLine(hair4);
  showBall(hair4.array);

  showLine(hair5);
  showBall(hair5.array);

  showLine(hair6);
  showBall(hair6.array);

  showLine(hair7);
  showBall(hair7.array);

  showLine(hair8);
  showBall(hair8.array);

  // pop();

  push();
  translate(scissors.position.x, scissors.position.y);
  rotate(scissors.angle);

  imageMode(CENTER);
  image(img1, 0, 0);
  pop();
  // 2가 오른쪽, 3이 왼쪽
  imageMode(CENTER);
  image(img2, width * 0.77, height * 0.47, img2.width * 0.9, img2.height * 0.9);
  imageMode(CORNER);
  image(img3, width * 0.2, height * 0.458, img3.width * 0.8, img3.height * 0.8);
  // pop();
}

//line 만드는 함수
function makeinph(obj) {
  let fixed;
  for (let i = 0; i < obj.length; i++) {
    if (i === 0) {
      fixed = true;
    } else {
      fixed = false;
    }
    let p = new HairBall(
      obj.angle < 270 && obj.angle > 180
        ? obj.x - obj.xSpace * i
        : obj.x + obj.xSpace * i,
      obj.y - obj.ySpace * i,
      obj.r,
      fixed,
      obj.comp,
    );
    obj.array.push(p);
  }
  //make chain
  let options = {
    stiffness: 1,
    length: obj.xSpace,
  };
  Composites.chain(obj.comp, 0, 0, 0, 0, options);
}

function HairBall(x, y, r, fixed, comp) {
  let options = {
    restitution: 0,
    density: 1,
    friction: 0.5,
    isStatic: fixed,
  };
  this.body = Bodies.circle(x, y, r, options);
  Composite.add(comp, this.body);
  this.r = r;

  this.show = function () {
    let pos = this.body.position;
    push();
    translate(pos.x, pos.y);

    fill("#8B4513");
    circle(0, 0, this.r * 2);
    // fill(0);
    // circle(0, 0, this.r * (1 / 3.5));
    pop();
  };
  this.checkif = function () {
    if (this.body.position.y > height) {
      // Compositite.remove(comp, this.body);
      // obj.array = obj.array.filter((x) => x != this.body);
    }
  };
}

function showLine(obj) {
  let tarray = obj.array;
  let tcomp = obj.comp;
  for (let i = 0; i < tarray.length - 1; i++) {
    let bodyA = tarray[i].body;
    let bodyB = tarray[i + 1].body;

    let connected = false;

    for (let c of tcomp.constraints) {
      if (
        (c.bodyA === bodyA && c.bodyB === bodyB) ||
        (c.bodyA === bodyB && c.bodyB === bodyA)
      ) {
        connected = true;
        break;
      }
    }

    if (connected) {
      let pos1 = bodyA.position;
      let pos2 = bodyB.position;

      line(pos1.x, pos1.y, pos2.x, pos2.y);
    }
  }
}
function showBall(obj) {
  for (let i = 1; i < obj.length; i++) {
    obj[i].show();
    // obj[i].checkif();
  }
}

function defaultSetting(angle, xSpace, ySpace, length, r, comp, objArray) {
  //comp1 생성
  comp = Composite.create();
  Composite.add(world, comp);

  //hair1 정보 모아놓은 객체
  let obj = {
    //xspace >r*2
    x: center.x + cos(radians(angle)) * (center.r / 2),
    y: center.y + sin(radians(angle)) * (center.r / 2),
    xSpace: xSpace,
    ySpace: ySpace,
    length: length,
    angle: angle,
    r: r,
    comp: comp,
    array: objArray,
  };
  // line 만들기
  makeinph(obj);
  return obj;
}

function rremove(body) {
  //배열찾기;
  let target = find(body);
  let k = target.array;
  Composite.remove(world, body);
  for (let p of k) {
    k = k.filter((x) => x != body);
  }
  //배열에서 제거
  // if (target) {
  //   let k = target.array;
  //   for (let i = 0; i < k.length; i++) {
  //     if (k[i].body === body) {
  //       Composite.remove(
  //         target.comp,
  //         target.obj.comp.constraints[target.index - 1],
  //       );
  //       k.splice(i, 1);
  //       break;
  //     }
  //   }
  // } else {
  //   return;
  // }

  // Composite.remove(target.comp, body);
  // // Composite.remove(world, body);
}

function find(body) {
  let hairs = [hair1, hair2, hair3, hair4, hair5, hair6, hair7, hair8];
  for (let hair of hairs) {
    for (let i = 0; i < hair.array.length; i++) {
      if (hair.array[i].body === body) {
        return { array: hair.array, comp: hair.comp, index: i, obj: hair };
      }
    }
  }
  return null;
}

function mouseReleased() {
  if (pressedBody) {
    releaseX = mpos.x;
    releaseY = mpos.y;
    let d = dist(pressX, pressY, releaseX, releaseY);
    if (d < 5) {
      rremove(pressedBody);
      deleteConstraint(pressedBody);
      // } else {
      //   if (d > 10) {
      //     deleteConstraint(pressedBody);
      //   }
      // }
    }
  }
}
function mouseDragged() {
  if (!pressedBody) return;
  let currentX = mpos.x;
  let currentY = mpos.y;
  let d = dist(pressX, pressY, currentX, currentY);
  if (d > 130 && constraintBroken === false) {
    deleteConstraint(pressedBody);
    constraintBroken = true;
  }
}

// function deleteConstraint(pressedBody) {
//   let h = find(pressedBody);
//   if (!h || h.index === 0) return;
//   let targetIndex = h.index - 1;
//   let targetObj = h.obj;
//   let targetConstraint = targetObj.comp.constraints[targetIndex];
//   Composite.remove(h.comp, targetConstraint);
//   Composite.remove(world, targetConstraint);
// }

function deleteConstraint(pressedBody) {
  let h = find(pressedBody);

  if (!h || h.index === 0) return;

  let targetIndex = h.index - 1;
  let targetConstraint = h.comp.constraints[targetIndex];

  if (!targetConstraint) return;

  Composite.remove(h.comp, targetConstraint);
}
