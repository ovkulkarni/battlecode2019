import { BCAbstractRobot, SPECS } from 'battlecode';
import { constants } from './constants.js';
import { runCastle } from './castle.js';
import { runCrusader } from './crusader.js';
import { runChurch } from './church.js';
import { runPilgrim } from './pilgrim.js';
import { runPreacher } from './preacher.js';
import { runProphet } from './prophet.js';
import { get_stats } from './helpers.js';
import { get_symmetry, get_visible_castle } from './analyzemap.js';


class MyRobot extends BCAbstractRobot {
    turn() {
        // set up "global" variables
        this.visible_map = this.getVisibleRobotMap();
        this.visible_robots = this.getVisibleRobots();
        if(this.stats === undefined)
            this.stats = get_stats(this);
        if (this.symmetry === undefined)
            this.symmetry = get_symmetry(this);
        if (this.spawn_castle === undefined)
          this.spawn_castle = get_visible_castle(m);

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
