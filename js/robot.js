import { BCAbstractRobot, SPECS } from 'battlecode';
import { constants } from './constants.js';
import { runCastle } from './castle.js';
import { runCrusader } from './crusader.js';
import { runChurch } from './church.js';
import { runPilgrim } from './pilgrim.js';
import { runPreacher } from './preacher.js';
import { runProphet } from './prophet.js';
import { get_stats} from './helpers.js';


class MyRobot extends BCAbstractRobot {
    turn() {
        this.visible_map = this.getVisibleRobotMap();
        this.visible_robots = this.getVisibleRobots();
        this.stats = get_stats(this);
        const N = this.karbonite_map.length;
        const M = this.karbonite_map[0].length;
        let horizontal = true;
        if (this.symmetry === undefined) {
            for (let i = 0, k = N - 1; i < N / 2; i++ , k--) {
                for (let j = 0; j < M; j++) {
                    if (this.karbonite_map[i][j] !== this.karbonite_map[k][j]) {
                        horizontal = false;
                        break;
                    }
                }
            }
            if (horizontal) {
                this.symmetry = constants.HORIZONTAL;
            } else {
                this.symmetry = constants.VERTICAL;
            }
        }
        if (this.spawn_castle === undefined) {
            for (let robot of this.visible_robots) {
                if (robot.unit === SPECS.CASTLE) {
                    this.spawn_castle = robot;
                }
            }
        }
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
