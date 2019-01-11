import { idx, dis } from './helpers.js';

// predicate combinators
function pand(...ps) {
    return ((x, y) => ps.map(p => p(x, y)).reduce((a, b) => a && b));
}
function por(...ps) {
    return ((x, y) => ps.map(p => p(x, y)).reduce((a, b) => a || b));
}

// actual predicates
export function exact_pred(fx, fy) {
    return ((x, y) => fx === x && fy === y);
}
export function around_pred(fx, fy, l, r) {
    return ((x, y) => dis(x, y, fx, fy) <= r && dis(x, y, fx, fy) >= l);
}
export function attack_pred(m, fx, fy) {
    return around_pred(fx, fy, m.stats.ATTACK_RADIUS[0], m.stats.ATTACK_RADIUS[1]);
}

export function fuel_pred(m) {
    return ((x, y) => idx(m.fuel_map, x, y));
}

export function karbonite_pred(m) {
    return ((x, y) => idx(m.karbonite_map, x, y));
}
export function on_path(path) {
    let spath = path.map(a => a.toString());
    return ((x, y) => path.includes([x, y].toString()));
}
export function central_of_pred(m, fx, fy) {
    let center_x = Math.floor(m.map[0].length / 2);
    let center_y = Math.floor(m.map.length / 2);
    let fd = dis(fx, fy, center_x, center_y);
    return ((x, y) => dis(x, y, center_x, center_y) < fd);
}
export function prophet_pred(m, cx, cy) {
    return pand(
        around_pred(cx, cy, 16, 25),
        central_of_pred(m, cx, cy)
    );
}
