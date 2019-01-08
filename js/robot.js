import {BCAbstractRobot, SPECS} from 'battlecode';

class MyRobot extends BCAbstractRobot {
  turn() {
    //this.log(SPECS);
    this.log("attempt " + this.me.id + " " + this.me.unit)
    switch (this.me.unit) {
      case SPECS.CASTLE:
        return runCastle(this);
      case SPECS.CRUSADER:
        return runCrusader(this);
      case SPECS.CHURCH:
        return runChurch(this);
      case SPECS.PILGRIM:
        return runPilgrim(this);
      case SPECS.PREACHER:
        return runPreacher(this);
      case SPECS.PROPHET:
        return runProphet(this);
    }
  }
}

var robot = new MyRobot();

// castle.js
function runCastle(m){
  const choices = open_neighbors_diff(m, m.me.x, m.me.y);
  const choice = choices[Math.floor(Math.random()*choices.length)];
  m.log(choice);
  return m.buildUnit(SPECS.PILGRIM, ...choice);
}

// church.js
function runChurch(m){
  return;
}

// pilgrim.js
function runPilgrim(m){
  m.log("pilgrim try");
  if (typeof m.pathfinder === "undefined")
    m.pathfinder = new Pathfinder(m, karbonite_pred(m));
  let next = m.pathfinder.next_loc();
  let dx = next[0] - m.me.x; let dy = next[1] - m.me.u;
  return m.move(dx, dy);
  return;
}

// crusader.js
function runCrusader(m){
  return m.move(0,1);
}

// preacher.js
function runPreacher(m){
  return m.move(0,1);
}

// prophet.js
function runProphet(m){
  return m.move(0,1);
}

// helpers.js

function open_neighbors(m, x, y){
  const choices = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  return choices.map(s => [x + s[0], y + s[1]])
                .filter(valid_loc(m))
                .filter(s => m.map[s[0]][s[1]]);
}
function open_neighbors_diff(m, x, y){
  return open_neighbors(m, x, y).map(s => [s[0] - x, s[1] - y]);
}
function valid_loc(m) {
  return (l => {
    let x = l[0];
    let y = l[1];
    return x >= 0 && y >= 0 && x < m.map.length, y < m.map[0].length;
  }
  );
}

// pathfinding.js

// premade predicates
function exact_pred(fx, fy) {
  return ((x, y) => fx === x && fy === y);
}
function karbonite_pred(m) {
  return ((x, y) => m.karbonite_map[x][y]);
}

class Pathfinder {
  constructor(m, pred) {
    m.log("made it");
    this.m = m;
    this.loc = [m.me.x, m.me.y];
    this.pred = pred;
    this.speed = SPECS.UNITS[m.me.unit].SPEED;
    this.path = this.find_path();
  }
  next_loc(m){
    this.path.shift();
    return this.path[0];
  }
  find_path(){
    this.m.log("beginning bfs");
    let parent = new Map();
    let vis = new Set();
    let q = [this.loc];
    while(q.length != 0){
      let cur = q.shift();
      vis.add(cur);
      if (this.pred(...cur)) {
        let path = [cur];
        while (parent.has(cur)) {
          cur = parent[cur];
          path.push(cur);
        }
        return path.reverse();
      }
      for (let space of open_neighbors(this.m, ...cur)){
        if(vis.has(space)) continue;
        parent[space] = cur;
        q.push(space);
      }
    }
  }
}
