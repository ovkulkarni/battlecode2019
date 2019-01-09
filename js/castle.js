import { SPECS } from 'battlecode';
import { open_neighbors_diff } from './helpers.js';

export function runCastle(m) {
    m.log("CASTLE X: " + m.me.x + " Y: " + m.me.y);
    const choices = open_neighbors_diff(m, m.me.x, m.me.y);
    const choice = choices[Math.floor(Math.random() * choices.length)];
    m.log("BUILD UNIT");
    return m.buildUnit(SPECS.PILGRIM, ...choice);

}

export function whatUnit(m) {
    return SPECS.PILGRIM;
}
