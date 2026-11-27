export function seededRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function chooseFlight(combat, offset = 0, aimPart = "core") {
  const { session: s, boss, pickups, enemies, enemyShots } = combat;
  const { ship, elapsedMs } = s;
  const bossActive = boss && boss.y > 140;
  const time = elapsedMs / 1000;
  let preferredX = 360 + Math.sin(time * 1.8 + offset) * 210;
  let preferredY = 884 + Math.sin(time * 0.8 + offset) * 70;
  let weight = -Infinity;
  if (bossActive) {
    const target = boss.parts.find((part) => part.id === aimPart && part.hp > 0) ?? boss.parts[2];
    const amplitude = boss.id === "boss_citadel" ? 102 : boss.id === "boss_overmind" ? 154 : 142;
    const moving = !boss.laser && !(boss.staggerUntil > elapsedMs);
    const wings = boss.parts.slice(0, 2).filter(({ hp }) => hp <= 0).length;
    const swaySpeed = moving ? (boss.phase === 1 ? 0.75 : 0.95) * 0.86 ** wings
      * (boss.frozenUntil > elapsedMs ? 0.56 : 1) : 0;
    const travel = Math.max(0, ship.y - boss.y - target.dy) / s.fighter.speed + 0.06;
    preferredX = (moving ? 360 + Math.sin(boss.sway + travel * swaySpeed) * amplitude : boss.x) + target.dx;
    preferredY = 657 + Math.sin(time * 2.1 + offset) * 43;
  } else {
    for (const enemy of enemies) {
      if (enemy.y < 40 || enemy.y > 735) continue;
      const value = (enemy.id === "medium_transport" ? 205 : 0) + enemy.y * 0.16
        - Math.abs(ship.x - enemy.x) * 0.51 - Math.abs(preferredX - enemy.x) * 0.26;
      if (value > weight) {
        preferredX = enemy.x + (enemy.turn ?? 0) * 70;
        weight = value;
      }
    }
    for (const pickup of pickups) {
      if (pickup.speed > 0 || pickup.y < 560 || pickup.y > 1160) continue;
      const value = 140 - Math.abs(ship.y - pickup.y) * 0.56 - Math.abs(ship.x - pickup.x) * 0.42 +
        (pickup.type === "gold" ? 27 : pickup.type === "heal" && s.hp < s.maxHp - 9 ? 48 : 0);
      if (value > weight) {
        preferredX = pickup.x;
        preferredY = Math.max(654, Math.min(1100, pickup.y + 55));
        weight = value;
      }
    }
  }

  const threats = enemyShots.filter((shot) => Math.abs(shot.y - ship.y) < 250 && Math.abs(shot.x - ship.x) < 285);
  const bodies = enemies.filter((enemy) => enemy !== boss && enemy.y > 465 && Math.abs(enemy.x - ship.x) < 185);
  const laser = boss?.laser;
  const beam = laser && { x: laser.ex - laser.x, y: laser.ey - laser.y };
  if (!laser && !threats.length && !bodies.length) {
    return { x: Math.max(47, Math.min(673, preferredX)), y: Math.max(545, Math.min(1130, preferredY)) };
  }
  let best = Infinity;
  let point;
  for (const dx of [0, -42, 42, -92, 92, -156, 156]) {
    for (const dy of [0, -72, 72]) {
      const x = Math.max(47, Math.min(673, preferredX + dx));
      const y = Math.max(545, Math.min(1130, preferredY + dy));
      let cost = Math.abs(dx) * 0.63 + Math.abs(dy) * 0.75 + Math.hypot(x - ship.x, y - ship.y) * 0.16;
      for (const t of [0.09, 0.24, 0.43]) {
        const blend = Math.min(1, t * 6);
        const cx = ship.x + (x - ship.x) * blend;
        const cy = ship.y + (y - ship.y) * blend;
        if (laser && elapsedMs + t * 1000 >= laser.chargeUntil && elapsedMs + t * 1000 < laser.activeUntil) {
          const rx = cx - laser.x;
          const ry = cy - laser.y;
          const projection = rx * beam.x + ry * beam.y;
          const margin = laser.width / 2 + 26 - Math.abs(rx * beam.y - ry * beam.x) / 1500;
          if (projection > 0 && projection < 1500 ** 2 && margin > 0) cost += margin * 9;
        }
        for (const bullet of threats) {
          const dx = bullet.x + bullet.vx * t - cx;
          const dy = bullet.y + bullet.vy * t - cy;
          const distance2 = dx * dx + dy * dy;
          if (distance2 < 42 ** 2) cost += (42 - Math.sqrt(distance2)) * 6.2;
        }
        for (const enemy of bodies) {
          const dx = enemy.x - cx;
          const dy = enemy.y + enemy.speed * t - cy;
          const distance2 = dx * dx + dy * dy;
          const reach = enemy.radius + 35;
          if (distance2 < reach * reach) cost += (reach - Math.sqrt(distance2)) * 5;
        }
      }
      if (cost < best) {
        best = cost;
        point = { x, y };
      }
    }
  }
  return point;
}
