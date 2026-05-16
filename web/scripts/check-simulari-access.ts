import assert from "node:assert/strict";
import {
  canReadSimulation,
  simulariReadWhereForUser,
  type SimulariDocLike,
  type SimulariUserLike,
} from "../lib/simulari-access";

const firmA = { id: 101 };
const firmB = { id: 202 };

const consultantA: SimulariUserLike = {
  id: 11,
  role: "consultant",
  firm: firmA,
};
const consultantB: SimulariUserLike = {
  id: 22,
  role: "consultant",
  firm: firmB,
};
const adminA: SimulariUserLike = {
  id: 33,
  role: "admin_firma",
  firm: firmA,
};
const adminB: SimulariUserLike = {
  id: 44,
  role: "admin_firma",
  firm: firmB,
};
const superAdmin: SimulariUserLike = {
  id: 55,
  role: "super_admin",
  firm: null,
};

const simA1: SimulariDocLike = { user: 11, firm: firmA };
const simA2: SimulariDocLike = { user: 66, firm: firmA };
const simB1: SimulariDocLike = { user: 22, firm: firmB };

assert.equal(simulariReadWhereForUser(null), false, "guest read should be denied");
assert.deepEqual(simulariReadWhereForUser(consultantA), { user: { equals: 11 } });
assert.deepEqual(simulariReadWhereForUser(adminA), { firm: { equals: 101 } });
assert.equal(simulariReadWhereForUser(superAdmin), true);

assert.equal(canReadSimulation(simA1, consultantA), true, "consultant reads own simulation");
assert.equal(canReadSimulation(simA2, consultantA), false, "consultant cannot read colleague simulation");
assert.equal(canReadSimulation(simA2, adminA), true, "firm admin reads firm simulation");
assert.equal(canReadSimulation(simB1, adminA), false, "firm admin cannot read other firm");
assert.equal(canReadSimulation(simA1, adminB), false, "second firm admin cannot read first firm");
assert.equal(canReadSimulation(simB1, consultantA), false, "consultant cannot read other firm");
assert.equal(canReadSimulation(simB1, consultantB), true, "second consultant reads own simulation");
assert.equal(canReadSimulation(simA1, superAdmin), true, "super admin reads all");
assert.equal(canReadSimulation(simB1, superAdmin), true, "super admin reads all firms");

console.log("simulari access checks passed");
