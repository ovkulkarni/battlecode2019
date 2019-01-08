import {BCAbstractRobot, SPECS} from 'battlecode';
/*import runCrusader from './crusader';
import runChurch from './church';
import runCastle from './castle';
import runPilgrim from './pilgrim';
import runPreacher from './preacher';
import runProphet from './prophet';
*/
export default class MyRobot extends BCAbstractRobot {
    turn() {
      /*
      switch (this.me.unit) {
        case SPECS['castle']: return runCastle(this);
        case SPECS['crusader']: return runCrusader(this);
        case SPECS['church']: return runChurch(this);
        case SPECS['pilgrim']: return runPilgrim(this);
        case SPECS['preacher']: return runPreacher(this);
        case SPECS['prophet']: return runProphet(this);
      }*/
      if(this.me.unit > 1) {
        this.move(0,1);
      }
    }
}

var robot = new MyRobot();
