import { BCAbstractRobot, SPECS } from 'battlecode';
import { get_symmetry, get_visible_castle } from './analyzemap.js';
import { runCastle } from './castle.js';
import { runCrusader } from './crusader.js';
import { runChurch } from './church.js';
import { runPilgrim } from './pilgrim.js';
import { runPreacher } from './preacher.js';
import { runProphet } from './prophet.js';
import { get_stats } from './helpers.js';


class MyRobot extends BCAbstractRobot {
    turn() {
        this.visible_map = this.getVisibleRobotMap();
        this.visible_robots = this.getVisibleRobots();
        this.visible_allies = this.visible_robots.filter(r => this.me.team === r.team);
        this.visible_enemies = this.visible_robots.filter(r => this.me.team !== r.team);
        if (this.stats === undefined)
            this.stats = get_stats(this);
        if (this.symmetry === undefined)
            this.symmetry = get_symmetry(this);
        if (this.spawn_castle === undefined)
            this.spawn_castle = get_visible_castle(this);
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
