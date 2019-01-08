import { SPECS } from 'battlecode';
import { open_neighbors_diff } from './helpers.js';

export function runCastle(m) {
    const choices = open_neighbors_diff(m, m.me.x, m.me.y);
    const choice = choices[Math.floor(Math.random() * choices.length)];
    return m.buildUnit(SPECS.PILGRIM, ...choice);
}