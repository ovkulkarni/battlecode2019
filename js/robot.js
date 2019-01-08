import { BCAbstractRobot, SPECS } from 'battlecode';
import { runCastle } from './castle.js';
import { runCrusader } from './crusader.js';
import { runChurch } from './church.js';
import { runPilgrim } from './pilgrim.js';
import { runPreacher } from './preacher.js';
import { runProphet } from './prophet.js';


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