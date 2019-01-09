import { Pathfinder, exact_pred } from './pathfinder.js';
import { get_stats, calcOpposite, idx } from './helpers.js';

export function runPreacher(m) {
  m.log("PREACHER ID: " + m.me.id + "  X: " + m.me.x + "  Y: " + m.me.y);
  if (m.stats == undefined) {
    m.stats = get_stats(m);
  }
  if (typeof m.pathfinder === "undefined") {
      let opp = calcOpposite(m, m.spawn_castle.x, m.spawn_castle.y);
      opp[0]--;
      m.pathfinder = new Pathfinder(m, exact_pred(...opp));
  }
  let next = m.pathfinder.next_loc(m);
  if (next === undefined) {
    m.log("FUEL " + m.fuel + " " + m.stats.get("fc"));
    if (shouldAttack(m) && (m.fuel >= m.stats.get("fc"))) {
      m.log("PREACHER ATTACKED");
      return m.attack(1, 0);
    }
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

export function shouldAttack(m) {

    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i != 0 || j != 0) {
          let id = idx(m.getVisibleRobotMap(),m.me.x + i, m.me.y+j);
          m.log("ROBOT ID " + id);
          if (id != 0 && id != -1) {
            m.log("TEAM "  + m.getRobot(id).team);
            if (m.getRobot(id).team === m.team) {
              return true;
            }
          }
        }
      }
    }
    return true;
}
