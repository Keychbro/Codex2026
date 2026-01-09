const canvas = document.getElementById("city");
const ctx = canvas.getContext("2d");

const GRID_SIZE = 18;
const TILE_SIZE = canvas.width / GRID_SIZE;

const TOOL_COSTS = {
  residential: 120,
  commercial: 150,
  industrial: 200,
  park: 80,
  road: 30,
  power: 350,
};

const TOOL_COLORS = {
  empty: "#131826",
  residential: "#63d471",
  commercial: "#6cc6ff",
  industrial: "#f4c35b",
  park: "#3ab87b",
  road: "#9aa3b2",
  power: "#f28f3b",
};

const TOOL_LABELS = {
  residential: "Жильё",
  commercial: "Коммерция",
  industrial: "Промзона",
  park: "Парк",
  road: "Дорога",
  power: "Электростанция",
  bulldoze: "Снос",
};

const state = {
  budget: 1500,
  population: 0,
  power: 0,
  happiness: 70,
  speed: 1,
  tick: 0,
  selectedTool: "residential",
  tiles: Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({ type: "empty" }))
  ),
};

const ui = {
  budget: document.getElementById("budget"),
  population: document.getElementById("population"),
  power: document.getElementById("power"),
  taxIncome: document.getElementById("taxIncome"),
  expenses: document.getElementById("expenses"),
  happiness: document.getElementById("happiness"),
  freeTiles: document.getElementById("freeTiles"),
  message: document.getElementById("message"),
};

const toolButtons = document.querySelectorAll(".tool");
const speedButtons = document.querySelectorAll(".speed-btn");

function setMessage(text) {
  ui.message.textContent = text;
}

function setActiveTool(tool) {
  state.selectedTool = tool;
  toolButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tool === tool);
  });
  setMessage(`Выбран инструмент: ${TOOL_LABELS[tool]}`);
}

function setSpeed(speed) {
  state.speed = speed;
  speedButtons.forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.speed) === speed);
  });
}

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const tile = state.tiles[row][col];
      ctx.fillStyle = TOOL_COLORS[tile.type];
      ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);

      ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
      ctx.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }
}

function getTileFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const col = Math.floor(x / TILE_SIZE);
  const row = Math.floor(y / TILE_SIZE);
  if (col < 0 || row < 0 || col >= GRID_SIZE || row >= GRID_SIZE) {
    return null;
  }
  return { row, col };
}

function countTiles(type) {
  return state.tiles.flat().filter((tile) => tile.type === type).length;
}

function updateStats() {
  const residential = countTiles("residential");
  const commercial = countTiles("commercial");
  const industrial = countTiles("industrial");
  const parks = countTiles("park");
  const roads = countTiles("road");
  const powerPlants = countTiles("power");

  const powerCapacity = powerPlants * 40;
  const demandedPower = residential * 4 + commercial * 3 + industrial * 5;

  const basePopulation = residential * 8;
  const happinessBoost = Math.min(30, parks * 3);
  const pollutionPenalty = Math.min(35, industrial * 2);
  state.happiness = Math.max(
    30,
    Math.min(100, 60 + happinessBoost - pollutionPenalty)
  );

  state.population = Math.floor(
    basePopulation * (state.happiness / 100) * (powerCapacity >= demandedPower ? 1 : 0.6)
  );
  state.power = Math.max(0, powerCapacity - demandedPower);

  const taxIncome = residential * 8 + commercial * 14 + industrial * 18 + roads * 2;
  const expenses = parks * 3 + powerPlants * 12;

  ui.taxIncome.textContent = taxIncome;
  ui.expenses.textContent = expenses;
  ui.happiness.textContent = state.happiness;
  ui.freeTiles.textContent = GRID_SIZE * GRID_SIZE - countTiles("empty");

  return { taxIncome, expenses };
}

function updateBudget() {
  const { taxIncome, expenses } = updateStats();
  state.budget += taxIncome - expenses;
  if (state.budget < 0) {
    state.budget = 0;
  }
}

function canBuild(tool) {
  if (tool === "bulldoze") {
    return true;
  }
  return state.budget >= TOOL_COSTS[tool];
}

function buildTile(row, col) {
  const current = state.tiles[row][col];
  if (state.selectedTool === "bulldoze") {
    if (current.type !== "empty") {
      state.tiles[row][col] = { type: "empty" };
      state.budget += Math.floor(TOOL_COSTS[current.type] * 0.35);
      setMessage("Площадка очищена. Возврат средств за демонтаж.");
    }
    return;
  }

  if (!canBuild(state.selectedTool)) {
    setMessage("Не хватает бюджета на строительство.");
    return;
  }

  if (current.type !== "empty") {
    setMessage("Клетка занята. Используйте снос.");
    return;
  }

  state.tiles[row][col] = { type: state.selectedTool };
  state.budget -= TOOL_COSTS[state.selectedTool];
  setMessage(`Построено: ${TOOL_LABELS[state.selectedTool]}.`);
}

function handleClick(event) {
  const tile = getTileFromEvent(event);
  if (!tile) return;
  buildTile(tile.row, tile.col);
  drawGrid();
  updateUi();
}

function updateUi() {
  ui.budget.textContent = state.budget.toFixed(0);
  ui.population.textContent = state.population;
  ui.power.textContent = state.power;
}

function tick() {
  state.tick += 1;
  if (state.tick % 2 === 0) {
    updateBudget();
  } else {
    updateStats();
  }
  updateUi();
}

function loop() {
  if (state.speed > 0) {
    for (let i = 0; i < state.speed; i += 1) {
      tick();
    }
  }
  requestAnimationFrame(loop);
}

toolButtons.forEach((button) => {
  button.addEventListener("click", () => setActiveTool(button.dataset.tool));
});

speedButtons.forEach((button) => {
  button.addEventListener("click", () => setSpeed(Number(button.dataset.speed)));
});

canvas.addEventListener("click", handleClick);

setActiveTool(state.selectedTool);
setSpeed(1);
updateStats();
updateUi();
drawGrid();
loop();
