import { BCAbstractRobot, SPECS } from 'battlecode';
import { get_symmetry, get_visible_castle } from './analyzemap.js';
import { runCastle } from './castle.js';
import { runCrusader } from './crusader.js';
import { runChurch } from './church.js';
import { runPilgrim } from './pilgrim.js';
import { runPreacher } from './preacher.js';
import { runProphet } from './prophet.js';
import { get_stats, get_mission, dis, open_neighbors2, create_augmented_obj } from './helpers.js';
import { Pathfinder } from './pathfinder.js';
import { exact_pred } from './predicates.js';

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
            this.spawn_castle = get_visible_castle(this);
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
        if (ret === undefined && this.me.unit !== SPECS.CHURCH && this.me.unit !== SPECS.CASTLE) {
            let diff = undefined;
            let min_allies = 25;
            for (let opt of open_neighbors2(this, this.me.x, this.me.y)) {
                let count = 0;
                for (let ally of this.visible_allies) {
                    if (dis(ally.x, ally.y, opt[0], opt[1]) <= 2)
                        count++;
                }
                if (count < min_allies) {
                    min_allies = count;
                    diff = [opt[0] - this.me.x, opt[1] - this.me.y];
                }
            }
            if (diff !== undefined) {
                this.log(`DIFFUSING by ${JSON.stringify(diff)}`);
                return this.move(...diff);
            }
        }
        return ret;
    }
}

var robot = new MyRobot();
