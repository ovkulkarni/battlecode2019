import { BCAbstractRobot, SPECS } from 'battlecode';
import { get_symmetry, get_visible_base } from './analyzemap.js';
import { runCastle } from './castle.js';
import { runCrusader } from './crusader.js';
import { runChurch } from './church.js';
import { runPilgrim } from './pilgrim.js';
import { runPreacher } from './preacher.js';
import { runProphet } from './prophet.js';
import { get_stats, get_mission, dis, open_neighbors2, idx, all_neighbors2 } from './helpers.js';

class MyRobot extends BCAbstractRobot {
    turn() {
        this.visible_map = this.getVisibleRobotMap();
        this.visible_robots = this.getVisibleRobots();
        if (this.me.unit === SPECS.CASTLE) {
            this.visible_allies = this.visible_robots.filter(r => r.castle_talk !== undefined).filter(r => this.me.id !== r.id);
            this.visible_enemies = this.visible_robots.filter(r => r.castle_talk === undefined);
        } else {
            this.visible_allies = this.visible_robots.filter(r => r.team === this.me.team).filter(r => r.id !== this.me.id);
            this.visible_enemies = this.visible_robots.filter(r => r.team !== this.me.team);
        }
        if (this.mission === undefined)
            this.mission = get_mission(this);
        if (this.stats === undefined)
            this.stats = get_stats(this);
        if (this.symmetry === undefined)
            this.symmetry = get_symmetry(this);
        if (this.spawn_castle === undefined)
            this.spawn_castle = get_visible_base(this);
        let ret = undefined;
        switch (this.me.unit) {
            case SPECS.CASTLE:
                ret = runCastle(this);
                break;
            case SPECS.CRUSADER:
                ret = runCrusader(this);
                break;
            case SPECS.CHURCH:
                ret = runChurch(this);
                break;
            case SPECS.PILGRIM:
                ret = runPilgrim(this);
                break;
            case SPECS.PREACHER:
                ret = runPreacher(this);
                break;
            case SPECS.PROPHET:
                ret = runProphet(this);
                break;
        }
        if(ret === true && this.me.unit === SPECS.PILGRIM) {
            return;
        }
        if (ret === undefined && this.me.unit !== SPECS.CHURCH && this.me.unit !== SPECS.CASTLE) {
            return diffuse(this);
        }
        return ret;
    }
}

function neighbor_score(m, x, y) {
    let count = 0;
    for (let loc of all_neighbors2(m, x, y)) {
        let dist = dis(x, y, loc[0], loc[1]);
        if (dist === 1 && idx(m.visible_map, ...loc) > 0) {   
            count++;
        }
    }
    return count;
}

function diffuse(m) {
    let diff = undefined;

    let min_allies = neighbor_score(m, m.me.x, m.me.y);
    for (let opt of open_neighbors2(m, m.me.x, m.me.y)) {
        let count = neighbor_score(m, ...opt);
        if (count < min_allies) {
            min_allies = count;
            diff = [opt[0] - m.me.x, opt[1] - m.me.y];
        }
    }
    if (diff !== undefined) {
        if (idx(m.karbonite_map, m.me.x + diff[0], m.me.y + diff[1]) || idx(m.fuel_map, m.me.x + diff[0], m.me.y + diff[1]))
            return;
        return m.move(...diff);
    }
}

var robot = new MyRobot();
