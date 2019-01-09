import { Pathfinder, exact_pred } from './pathfinder.js';
import { calcOpposite, idx } from './helpers.js';

export function runPreacher(m) {
  m.log("PREACHER ID: " + m.me.id + "  X: " + m.me.x + "  Y: " + m.me.y);
  if (typeof m.pathfinder === "undefined") {
      let opp = calcOpposite(m, m.spawn_castle.x, m.spawn_castle.y);
      opp[0]--;
      m.pathfinder = new Pathfinder(m, exact_pred(...opp));
  }
  let next = m.pathfinder.next_loc(m);
  if (next === undefined && shouldAttack(m) && m.me.fuel >= m.stats.get("ac")) {
    return m.attack(1, 0);
  }
  else if (next === -1) {
      m.log("PREACHER STUCK");
  }
  else {
      m.log("PREACHER MOVING: " + next);
      let dx = next[0] - m.me.x; let dy = next[1] - m.me.y;
      return m.move(dx, dy);
  }
}

function shouldAttack(m) {
    for (i = -1; i <= 1; i++) {
      for (j = -1; j <= 1; j++) {
        if (i != 0 || j != 0) {
          if (idx(m.visible_map,m.me.x + i, m.me.y+j) != 0 && idx(m.visible_map,m.me.x + i, m.me.y+j) != 1) {
            if (m.getRobot(idx(m.visible_map,m.me.x + i, m.me.y+j)).me.team == this.me.team) {
              return false;
            }
          }
        }
      }
    }
    return true;
}
