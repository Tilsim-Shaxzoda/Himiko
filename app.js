const parallax_el = document.querySelectorAll(".parallax");
const mani = document.querySelector('main')

let xValue = 0;
let yValue = 0;
let rotateDegree = 0;

function update(cursorPosition) {
  parallax_el.forEach((el) => {
    let speedx = parseFloat(el.getAttribute("data-speedX"));
    let speedy = parseFloat(el.getAttribute("data-speedY"));
    let speedz = parseFloat(el.getAttribute("data-speedz"));
    let rotateSpeed = parseFloat(el.getAttribute("data-rotation"));
    rotateDegree = (xValue / (window.innerWidth / 2)) * 20;

    let isInLeft =
      parseFloat(getComputedStyle(el).left) < window.innerWidth / 2 ? 1 : -1;

    let zValue =
      (cursorPosition - parseFloat(getComputedStyle(el).left)) * isInLeft * 0.1;

    el.style.transform = `translateX(calc(-50% + ${
      -xValue * speedx
    }px)) translateY(calc(-50% + ${
      yValue * speedy
    }px)) perspective(2300px) translateZ(${zValue * speedz}px) rotateY(${
      rotateDegree * rotateSpeed
    }deg)`;
  });
}

update(0);

window.addEventListener("mousemove", (e) => {
  xValue = e.clientX - window.innerWidth / 2;
  yValue = e.clientY - window.innerHeight / 2;

  update(e.clientX);
});

