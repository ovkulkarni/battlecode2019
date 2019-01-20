import { idx, dis } from './helpers.js';
import { constants } from './constants.js';

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

export function fuel_pred_helper(m) {
    return ((x, y) => idx(m.fuel_map, x, y));
}

export function fuel_pred(m) {
    return pand(fuel_pred_helper(m), on_ally_side_pred(m));
}

export function fuel_pred_church(m, xx, yy) {
    return ((x, y) => idx(m.fuel_map, x, y) /*&& dis(x, y, xx, yy) >= constants.FUEL_MIN_DIS*/);
}

export function karbonite_pred_helper(m) {
    return ((x, y) => idx(m.karbonite_map, x, y));
}

export function karbonite_pred(m) {
    return pand(karbonite_pred_helper(m), on_ally_side_pred(m));
}

export function every_pred(m) {
    return por(karbonite_pred_helper(m), fuel_pred_helper(m));
}

export function karbonite_pred_church(m, xx, yy) {
    return ((x, y) => idx(m.karbonite_map, x, y) && dis(x, y, xx, yy) >= constants.KARB_MIN_DIS);
}
export function no_depots(m) {
    return ((x, y) => !idx(m.karbonite_map, x, y) && !idx(m.fuel_map, x, y));
}

export function on_ally_side_pred(m) {
    let sym = m.symmetry;
    let half = Math.floor(m.karbonite_map.length / 2);
    if (sym === constants.HORIZONTAL) {
        // x stays same
        return ((x, y) => !(y < half) ^ (m.me.y < half));
    }
    else {
        // y stays same
        return ((x, y) => !(x < half) ^ (m.me.x < half));
    }
}

export function on_path(path) {
    let spath = path.map(a => a.toString());
    return ((x, y) => path.includes([x, y].toString()));
}
export function central_of_pred(m, fx, fy) {
    let center_x = Math.floor(m.map[0].length / 2);
    let center_y = Math.floor(m.map.length / 2);
    if (m.symmetry === constants.VERTICAL) {
        let fd = dis(fx, fy, center_x, fy);
        return ((x, y) => dis(x, y, center_x, y) < fd);
    } else if (m.symmetry === constants.HORIZONTAL) {
        let fd = dis(fx, fy, fx, center_y);
        return ((x, y) => dis(x, y, x, center_y) < fd);
    }
}
export function opposite_of_pred_by(m, fx, fy, v) {
    let center_x = Math.floor(m.map[0].length / 2);
    let center_y = Math.floor(m.map.length / 2);
    let x_far = fx > center_x ? 0 : m.map[0].length;
    let y_far = fy > center_y ? 0 : m.map.length;
    if (m.symmetry === constants.VERTICAL) {
        let fd = dis(fx, fy, x_far, fy);
        return ((x, y) => dis(x, y, x_far, y) < fd && Math.abs(fx - x) >= v);
    } else if (m.symmetry === constants.HORIZONTAL) {
        let fd = dis(fx, fy, fx, y_far);
        return ((x, y) => dis(x, y, x, y_far) < fd && Math.abs(fy - y) >= v);
    }
}
export function prophet_pred(m, cx, cy) {
    return pand(
        no_depots(m),
        around_pred(cx, cy, 16, 36),
        opposite_of_pred_by(m, cx, cy, 3)
    );
}

export function lattice_pred(m) {
    let modulus = (m.spawn_castle.x + m.spawn_castle.y) % 2;
    return pand(
        no_depots(m),
        ((x, y) => (x + y) % 2 === modulus)
    );
    //return pand(no_depots(m), prophet_pred(m, m.spawn_castle.x, m.spawn_castle.y));
}
