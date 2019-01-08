import {BCAbstractRobot, SPECS} from 'battlecode';
import runCrusader from './crusader';
import runChurch from './church';
import runCastle from './castle';
import runPilgrim from './pilgrim';
import runPreacher from './preacher';
import runProphet from './prophet';

class MyRobot extends BCAbstractRobot {
    turn() {
      switch (this.me.unit) {
        case SPECS['castle']: return runCastle(this);
        case SPECS['crusader']: return runCrusader(this);
        case SPECS['church']: return runChurch(this);
        case SPECS['pilgrim']: return runPilgrim(this);
        case SPECS['preacher']: return runPreacher(this);
        case SPECS['prophet']: return runProphet(this);
      }
    }
}

var robot = new MyRobot();
