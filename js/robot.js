import {BCAbstractRobot, SPECS} from 'battlecode';
/*
import runCrusader from './crusader';
import runChurch from './church';
import runCastle from './castle';
import runPilgrim from './pilgrim';
import runPreacher from './preacher';
import runProphet from './prophet';
*/

class MyRobot extends BCAbstractRobot {
  turn() {
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
  return m.buildUnit(SPECS.PILGRIM, 1, 1);
}

// church.js
function runChurch(m){
  return;
}

// pilgrim.js
function runPilgrim(m){
  const choices = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  const choice = choices[Math.floor(Math.random()*choices.length)]
  m.log("Moved: (" + choice[0] + ", " + choice[1] + ")")
  return m.move(...choice);
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
