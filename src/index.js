import p5 from "p5";
import catImageSrc from "./assets/cat.png";
import backgroundImage from "./assets/background.png";
import { Layer, Network } from "synaptic";

let catImage;
let catScalar = 0.05;
let cats = [];
let arrows = [];
let arrowSpeed = 2;
let arrowSpawnInterval = 300;
let lastMultipleArrowTime = 0;
const radius = 281;
let generation = 1;
let startTime = Date.now();

const getElapsedTime = () => {
  const currentTime = Date.now();
  const elapsedTime = (currentTime - startTime) / 1000;
  return elapsedTime.toFixed(2);
};

class Cat {
  constructor(x, y, index) {
    this.x = x;
    this.y = y;
    this.index = index;
    this.brain = setupNeuralNetwork();
    this.alive = true;
    this.survive;
  }

  think(arrows, p) {
    // 현재 위치에서 가장 가까운 화살을 찾습니다.
    let closestArrow = null;
    let minDistance = Infinity;

    for (const arrow of arrows) {
      const dist = p.dist(this.x, this.y, arrow.x, arrow.y);
      if (dist < minDistance) {
        minDistance = dist;
        closestArrow = arrow;
      }
    }

    if (closestArrow) {
      console.log(closestArrow);
      const inputs = [
        this.x / p.width,
        this.y / p.height,
        closestArrow.x / p.width,
        closestArrow.y / p.height,
        closestArrow.vx,
        closestArrow.vy,
      ];
      const output = this.brain.activate(inputs);

      // 출력 값을 콘솔에 기록
      console.log(
        `${this.index}번: Output: Up: ${output[0]}, Down: ${output[1]}, Left: ${output[2]}, Right: ${output[3]}, x: ${this.x}, y: ${this.y}`
      );

      if (this.y > 0) {
        this.y -= output[0] * 15;
      }
      if (this.y < p.height - catImage.height * catScalar) {
        this.y += output[1] * 15;
      }
      if (this.x > 0) {
        this.x -= output[2] * 15;
      }
      if (this.x < p.width - catImage.width * catScalar) {
        this.x += output[3] * 15;
      }
    }

    const distFromCenter = p.dist(this.x, this.y, p.width / 2, p.height / 2);
    if (distFromCenter + (catImage.width * catScalar) / 2 > radius) {
      const angle = Math.atan2(this.y - p.height / 2, this.x - p.width / 2);
      this.x =
        p.width / 2 +
        (radius - (catImage.width * catScalar) / 2) * Math.cos(angle);
      this.y =
        p.height / 2 +
        (radius - (catImage.width * catScalar) / 2) * Math.sin(angle);
    }
  }
}

const setupNeuralNetwork = () => {
  const inputLayer = new Layer(6);
  const hiddenLayer1 = new Layer(16);
  const hiddenLayer2 = new Layer(16);
  const hiddenLayer3 = new Layer(16);
  const hiddenLayer4 = new Layer(16);
  const hiddenLayer5 = new Layer(16);
  const hiddenLayer6 = new Layer(16);
  const outputLayer = new Layer(4);

  inputLayer.project(hiddenLayer1);
  hiddenLayer1.project(hiddenLayer2);
  hiddenLayer2.project(hiddenLayer3);
  hiddenLayer3.project(hiddenLayer4);
  hiddenLayer4.project(hiddenLayer5);
  hiddenLayer5.project(hiddenLayer6);
  hiddenLayer6.project(outputLayer);

  const network = new Network({
    input: inputLayer,
    hidden: [
      hiddenLayer1,
      hiddenLayer2,
      hiddenLayer3,
      hiddenLayer4,
      hiddenLayer5,
      hiddenLayer6,
    ],
    output: outputLayer,
  });

  return network;
};

// const generateCats = (brain1, brain2) => {
//   generation++;
//   cats = [];
//   for (let i = 0; i < 10; i++) {
//     cats.push(new Cat(281, 281));
//   }
// };

const mutate = (network) => {
  network.layers.hidden.forEach((layer) => {
    layer.list.forEach((neuron) => {
      Object.values(neuron.connections.projected).forEach((connection) => {
        if (Math.random() < 0.1) {
          // 10% 확률로 돌연변이 발생
          connection.weight += Math.random() * 0.2 - 0.1; // -0.1 ~ 0.1 사이의 값 추가
        }
      });
    });
  });
};

const crossover = (brain1, brain2) => {
  const newBrain = setupNeuralNetwork();
  newBrain.layers.hidden.forEach((layer, i) => {
    layer.list.forEach((neuron, j) => {
      Object.values(neuron.connections.projected).forEach((connection, k) => {
        const parentConnection =
          Math.random() > 0.5
            ? Object.values(
                brain1.layers.hidden[i].list[j].connections.projected
              )[k]
            : Object.values(
                brain2.layers.hidden[i].list[j].connections.projected
              )[k];
        connection.weight = parentConnection.weight;
      });
    });
  });

  return newBrain;
};

const generateCats = (brain1, brain2) => {
  generation++;
  cats = [];

  for (let i = 0; i < 10; i++) {
    let newBrain;
    if (brain1 && brain2) {
      newBrain = crossover(brain1, brain2); // 두 부모 신경망을 교차
      mutate(newBrain); // 돌연변이 적용
    } else {
      newBrain = setupNeuralNetwork(); // 초기 세대는 새로운 신경망으로 생성
    }

    const newCat = new Cat(281, 281, i);
    newCat.brain = newBrain; // 새로운 신경망을 적용
    cats.push(newCat);
  }
};

const updateRemainingCats = () => {
  const remainingCats = cats.filter((cat) => cat.alive).length;
  const remainingCatsElement = document.getElementById("remain");
  remainingCatsElement.innerText = `남은 개체 수: ${remainingCats}`;
};

const sketch = (p) => {
  p.preload = () => {
    catImage = p.loadImage(catImageSrc);
  };

  p.setup = () => {
    const canvas = p.createCanvas(562, 562);
    canvas.parent("canvas");

    const backgroundImg = document.getElementById("background");
    backgroundImg.src = backgroundImage;

    const generationElement = document.getElementById("generation");
    generationElement.innerText = `${generation}세대`;

    setInterval(spawnArrow, arrowSpawnInterval);

    generateCats();
    updateSeconds();
    updateRemainingCats();
  };

  p.draw = () => {
    p.background(32, 34, 57);

    cats.forEach((cat) => {
      if (cat.alive) {
        cat.think(arrows, p);

        // Check collision with arrows
        arrows.forEach((arrow) => {
          if (checkCollision(cat, arrow, p)) {
            cat.alive = false;
            cat.survive = getElapsedTime();
          }
        });

        // Draw cat
        p.image(
          catImage,
          cat.x,
          cat.y,
          catImage.width * catScalar,
          catImage.height * catScalar
        );
      }
    });

    arrows.forEach((arrow) => {
      arrow.x += arrow.vx * arrowSpeed;
      arrow.y += arrow.vy * arrowSpeed;

      if (
        arrow.x < 0 ||
        arrow.x > p.width ||
        arrow.y < 0 ||
        arrow.y > p.height
      ) {
        arrows.splice(arrows.indexOf(arrow), 1);
      }

      p.stroke(255, 255, 255);
      p.strokeWeight(4);
      p.line(
        arrow.x,
        arrow.y,
        arrow.x - arrow.vx * 10,
        arrow.y - arrow.vy * 10
      );
    });

    updateRemainingCats();

    if (cats.every((cat) => !cat.alive)) {
      arrows = [];
      cats.sort((a, b) => b.survive - a.survive);
      console.log(cats);
      const generationElement = document.getElementById("generation");
      generationElement.innerText = `${generation}세대`;
      console.log("end");
      console.log(cats[0].brain, cats[1].brain);
      generateCats(cats[0].brain, cats[1].brain);
      startTime = Date.now();
    }

    if (getElapsedTime() - startTime > 10000) {
      arrowSpawnInterval = Math.max(500, arrowSpawnInterval - 100);
      startTime = getElapsedTime();
    }

    if (getElapsedTime() / 1000 - lastMultipleArrowTime >= 10) {
      spawnMultipleArrows(((getElapsedTime() / 1000) * 3) / 5 + 10);
      lastMultipleArrowTime = getElapsedTime() / 1000;
    }
  };

  // function spawnArrow() {
  //   const edge = Math.floor(Math.random() * 4);
  //   let arrow = { x: 0, y: 0, vx: 0, vy: 0 };

  //   switch (edge) {
  //     case 0:
  //       arrow.x = Math.random() * p.width;
  //       arrow.y = 0;
  //       arrow.vx =
  //         (p.width / 2 - arrow.x) /
  //         p.dist(arrow.x, arrow.y, p.width / 2, p.height / 2);
  //       arrow.vy =
  //         (p.height / 2 - arrow.y) /
  //         p.dist(arrow.x, arrow.y, p.width / 2, p.height / 2);
  //       break;
  //     case 1:
  //       arrow.x = p.width;
  //       arrow.y = Math.random() * p.height;
  //       arrow.vx =
  //         (p.width / 2 - arrow.x) /
  //         p.dist(arrow.x, arrow.y, p.width / 2, p.height / 2);
  //       arrow.vy =
  //         (p.height / 2 - arrow.y) /
  //         p.dist(arrow.x, arrow.y, p.width / 2, p.height / 2);
  //       break;
  //     case 2:
  //       arrow.x = Math.random() * p.width;
  //       arrow.y = p.height;
  //       arrow.vx =
  //         (p.width / 2 - arrow.x) /
  //         p.dist(arrow.x, arrow.y, p.width / 2, p.height / 2);
  //       arrow.vy =
  //         (p.height / 2 - arrow.y) /
  //         p.dist(arrow.x, arrow.y, p.width / 2, p.height / 2);
  //       break;
  //     case 3:
  //       arrow.x = 0;
  //       arrow.y = Math.random() * p.height;
  //       arrow.vx =
  //         (p.width / 2 - arrow.x) /
  //         p.dist(arrow.x, arrow.y, p.width / 2, p.height / 2);
  //       arrow.vy =
  //         (p.height / 2 - arrow.y) /
  //         p.dist(arrow.x, arrow.y, p.width / 2, p.height / 2);
  //       break;
  //   }

  //   arrows.push(arrow);
  // }

  function spawnArrow() {
    const edge = Math.floor(Math.random() * 4);
    let arrow = { x: 0, y: 0, vx: 0, vy: 0 };
    const angleOffset = (Math.random() * Math.PI) / 6; // 방향의 랜덤함을 위한 작은 각도 오프셋

    switch (edge) {
      case 0: // 상단 가장자리
        arrow.x = Math.random() * p.width;
        arrow.y = 0;
        // 위쪽에서 아래쪽으로 향하게
        const angle0 =
          Math.PI / 2 + (Math.random() < 0.5 ? -angleOffset : angleOffset);
        arrow.vx = Math.cos(angle0) * arrowSpeed;
        arrow.vy = Math.sin(angle0) * arrowSpeed;
        break;
      case 1: // 오른쪽 가장자리
        arrow.x = p.width;
        arrow.y = Math.random() * p.height;
        // 오른쪽에서 왼쪽으로 향하게
        const angle1 =
          Math.PI + (Math.random() < 0.5 ? -angleOffset : angleOffset);
        arrow.vx = Math.cos(angle1) * arrowSpeed;
        arrow.vy = Math.sin(angle1) * arrowSpeed;
        break;
      case 2: // 하단 가장자리
        arrow.x = Math.random() * p.width;
        arrow.y = p.height;
        // 아래쪽에서 위쪽으로 향하게
        const angle2 =
          -Math.PI / 2 + (Math.random() < 0.5 ? -angleOffset : angleOffset);
        arrow.vx = Math.cos(angle2) * arrowSpeed;
        arrow.vy = Math.sin(angle2) * arrowSpeed;
        break;
      case 3: // 왼쪽 가장자리
        arrow.x = 0;
        arrow.y = Math.random() * p.height;
        // 왼쪽에서 오른쪽으로 향하게
        const angle3 = Math.random() < 0.5 ? angleOffset : -angleOffset;
        arrow.vx = Math.cos(angle3) * arrowSpeed;
        arrow.vy = Math.sin(angle3) * arrowSpeed;
        break;
    }

    arrows.push(arrow);
  }

  function spawnMultipleArrows(count) {
    for (let i = 0; i < count; i++) {
      spawnArrow();
    }
  }

  function updateSeconds() {
    const secondsOutput = document.getElementById("seconds");
    if (secondsOutput) {
      secondsOutput.innerText = `${getElapsedTime()}초`;
    }

    requestAnimationFrame(updateSeconds);
  }

  function checkCollision(cat, arrow, p) {
    const catLeft = cat.x;
    const catRight = cat.x + catImage.width * catScalar;
    const catTop = cat.y;
    const catBottom = cat.y + catImage.height * catScalar;

    const arrowLeft = arrow.x - arrow.vx * 10;
    const arrowRight = arrow.x;
    const arrowTop = arrow.y - arrow.vy * 10;
    const arrowBottom = arrow.y;

    return !(
      catLeft > arrowRight ||
      catRight < arrowLeft ||
      catTop > arrowBottom ||
      catBottom < arrowTop
    );
  }
};

new p5(sketch);
