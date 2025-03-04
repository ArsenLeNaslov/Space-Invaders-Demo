import kaboom from "kaboom";

kaboom();

loadSprite("galaxy", "sprites/galaxy.png");
loadSound("blip", "sounds/blip.mp3");
loadSound("error", "sounds/error.mp3");
loadSound("shoot", "sounds/shoot.mp3");
loadSound("bug", "sounds/bug.mp3");
loadSound("Retro_Platforming-David_Fesliyan", "sounds/Retro_Platforming-David_Fesliyan.mp3");
const music = play("Retro_Platforming-David_Fesliyan", { loop: true, volume: 1 });

const ALIEN_ROWS = 5;
const ALIEN_COLS = 6;
const ALIEN_SPEED = 15;
const ALIEN_STEPS = 322;
const ALIEN_ROWS_MOVE = 7;
const BLOCK_HEIGHT = 40;
const BLOCK_WIDTH = 32;
const OFFSET_X = 208;
const OFFSET_Y = 100;
const PLAYER_MOVE_SPEED = 500;
const SCREEN_EDGE = 100;
const GUN_COOLDOWN_TIME = 0.2;
const BULLET_SPEED = 500;
const POINTS_PER_ALIEN = 100;

loadRoot("sprites/");
loadSpriteAtlas("alien-sprite.png", {
  alien: {
    x: 0,
    y: 0,
    width: 48,
    height: 12,
    sliceX: 4,
    sliceY: 1,
    anims: {
      fly: {
        from: 0, to: 1, speed: 4, loop: true
      },
      explode: { from: 2, to: 3, speed: 8, loop: true },
    },
  },
});

loadSpriteAtlas("player-sprite.png", {
  player: {
    x: 0,
    y: 0,
    width: 100,
    height: 30,
    sliceX: 3,
    sliceY: 1,
    anims: {
      move: {
        from: 0, to: 0, speed: 4, loop: false
      },
      explode: { from: 1, to: 2, speed: 8, loop: true },
    },
  },
});

scene("game", () => {
  add([
    sprite("galaxy", { width: width(), height: height() })
  ]);

  const player = add([
    sprite("player"),
    scale(1),
    origin("center"),
    pos(50, 550),
    area(),
    {
      score: 0,
      lives: 3,
    },
    "player"]);

  let pause = false;
  onKeyDown("left", () => {
    if (pause) return;
    if (player.pos.x >= SCREEN_EDGE) {
      player.move(-1 * PLAYER_MOVE_SPEED, 0);
    }
  });

  onKeyDown("right", () => {
    if (pause) return;
    if (player.pos.x <= width() - SCREEN_EDGE) {
      player.move(PLAYER_MOVE_SPEED, 0);
    }
  });

  let alienMap = [];
  function spawnAliens() {
    for (let row = 0; row < ALIEN_ROWS; row++) {
      alienMap[row] = [];
      for (let col = 0; col < ALIEN_COLS; col++) {
        const x = col * BLOCK_WIDTH * 2 + OFFSET_X;
        const y = row * BLOCK_HEIGHT + OFFSET_Y;
        const alien = add([
          pos(x, y),
          sprite("alien"),
          area(),
          scale(4),
          origin("center"),
          "alien",
          {
            row: row,
            col: col,
          },
        ]);
        alien.play("fly");
        alienMap[row][col] = alien;
      }
    }
  }
  spawnAliens();

  let alienDirection = 1;
  let alienMoveCounter = 0;
  let alienRowsMoved = 0;

  player.play("move");

  onUpdate(() => {
    if (pause) return;

    every("alien", (alien) => {
      alien.move(alienDirection * ALIEN_SPEED, 0);
    });

    alienMoveCounter++;

    if (alienMoveCounter > ALIEN_STEPS) {
      alienDirection = alienDirection * -1;
      alienMoveCounter = 0;
      moveAliensDown();
    }

    if (alienRowsMoved > ALIEN_ROWS_MOVE) {
      pause = true;
      player.play("explode");
      wait(2, () => {
        go("gameOver", player.score);
      });
    }
  });

  function moveAliensDown() {
    alienRowsMoved++;
    every("alien", (alien) => {
      alien.moveBy(0, BLOCK_HEIGHT);
    });
  }

  let lastShootTime = time();
  onKeyPress("space", () => {
    if (pause) return;
    if (time() - lastShootTime > GUN_COOLDOWN_TIME) {
      lastShootTime = time();
      spawnBullet(player.pos, -1, "bullet");
    }
  });

  function spawnBullet(bulletPos, direction, tag) {
    add([
      rect(2, 6),
      pos(bulletPos),
      origin("center"),
      color(255, 255, 255),
      area(),
      cleanup(),
      play("shoot"),
      "missile",
      tag,
      {
        direction,
      },
    ]);
  }

  onUpdate("missile", (missile) => {
    if (pause) return;
    missile.move(0, BULLET_SPEED * missile.direction);
  });

  onCollide("bullet", "alien", (bullet, alien) => {
    destroy(bullet);
    play("error", { volume: 0.3 });
    alien.play("explode");
    alien.use(lifespan(0.5, { fade: 0.1 }));
    alienMap[alien.row][alien.col] = null; // Mark the alien as dead
    updateScore(POINTS_PER_ALIEN);
  });

  add([
    text("SCORE:", { size: 20, font: "sink" }),
    pos(100, 40),
    origin("center"),
    layer("ui"),
    color(127, 255, 0),
  ]);

  const scoreText = add([
    text("000000", { size: 20, font: "sink" }),
    pos(200, 40),
    origin("center"),
    layer("ui"),
  ]);

  function updateScore(points) {
    player.score += points;
    scoreText.text = player.score.toString().padStart(6, "0");
  }

  // Find a random alien to make shoot
  loop(1, () => {
    if (pause) return;
    // Randomly choose a column, then walk up from the
    // bottom row until an alien that is still alive is found

    let row, col;
    col = randi(0, ALIEN_COLS);
    let shooter = null;

    // Look for the first alien in the column that is still alive
    for (row = ALIEN_ROWS - 1; row >= 0; row--) {
      shooter = alienMap[row][col];
      if (shooter != null) {
        break;
      }
    }
    if (shooter != null) {
      spawnBullet(shooter.pos, 1, "alienBullet");
    }
  });

  player.onCollide("alienBullet", (bullet) => {
    if (pause) return;
    destroyAll("bullet");
    player.play("explode");
    play("bug");
    updateLives(-1);
    pause = true;
    wait(0.5, () => {
      if (player.lives == 0) {
        go("gameOver", player.score);
      } else {
        player.moveTo(50, 550);
        player.play("move");
        pause = false;
      }
    });
  });

  add([
    text("LIVES:", { size: 20, font: "sink" }),
    pos(650, 40),
    origin("center"),
    layer("ui"),
    color(127, 255, 0),
  ]);

  const livesText = add([
    text("3", { size: 20, font: "sink" }),
    pos(700, 40),
    origin("center"),
    layer("ui"),
  ]);

  function updateLives(life) {
    player.lives += life;
    livesText.text = player.lives.toString();
  }

});

scene("gameOver", (score) => {
  add([
    sprite("galaxy", { width: width(), height: height() })
  ]);

  add([
    text("GAME OVER", { size: 40, font: "sink" }),
    pos(width() / 2, height() / 2),
    origin("center"),
    play("blip"),
    layer("ui"),
    color(255, 255, 0),
  ]);

  add([
    text("SCORE: " + score, { size: 20, font: "sink" }),
    pos(width() / 2, height() / 2 + 50),
    origin("center"),
    layer("ui"),
    color(255, 255, 0),
  ]);

  onKeyPress("space", () => {
    go("game");
  });
});

go("game");