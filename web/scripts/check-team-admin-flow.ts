import assert from "node:assert/strict";
import { relationId, type SimulariUserLike } from "../lib/simulari-access";

type TeamUser = SimulariUserLike & {
  email?: string;
};

function canInvite(user: TeamUser) {
  return Boolean(
    user?.id &&
      user.role === "admin_firma" &&
      (!user.accountStatus || user.accountStatus === "active") &&
      relationId(user.firm),
  );
}

function inviteDefaults(actor: TeamUser, requestedRole: string) {
  const firmId = relationId(actor?.firm);
  return {
    firm: firmId,
    role: requestedRole === "admin_firma" ? "admin_firma" : "consultant",
    accountStatus: "pending_approval",
    invitedBy: actor?.id,
  };
}

function canDecide(user: TeamUser) {
  return Boolean(user?.id && user.role === "super_admin");
}

function canSeeTeam(user: TeamUser) {
  return Boolean(
    user?.id &&
      (user.role === "super_admin" ||
        (user.role === "admin_firma" &&
          (!user.accountStatus || user.accountStatus === "active") &&
          relationId(user.firm))),
  );
}

function safeTeamUser(doc: TeamUser & { id: string | number; firmName?: string }) {
  return {
    id: doc.id,
    email: doc.email,
    role: doc.role,
    accountStatus: doc.accountStatus,
    firm: relationId(doc.firm),
    firmName: doc.firmName ?? "-",
  };
}

const firmA = { id: 10 };
const firmAdmin: TeamUser = { id: 1, role: "admin_firma", accountStatus: "active", firm: firmA };
const pendingFirmAdmin: TeamUser = { id: 2, role: "admin_firma", accountStatus: "pending_approval", firm: firmA };
const consultant: TeamUser = { id: 3, role: "consultant", accountStatus: "active", firm: firmA };
const superAdmin: TeamUser = { id: 4, role: "super_admin", accountStatus: "active", firm: null };

assert.equal(canInvite(firmAdmin), true, "active firm admin can invite team members");
assert.equal(canInvite(pendingFirmAdmin), false, "pending firm admin cannot invite team members");
assert.equal(canInvite(consultant), false, "consultant cannot invite team members");
assert.deepEqual(inviteDefaults(firmAdmin, "consultant"), {
  firm: 10,
  role: "consultant",
  accountStatus: "pending_approval",
  invitedBy: 1,
});
assert.deepEqual(inviteDefaults(firmAdmin, "admin_firma"), {
  firm: 10,
  role: "admin_firma",
  accountStatus: "pending_approval",
  invitedBy: 1,
});
assert.equal(canDecide(superAdmin), true, "super admin can approve/reject");
assert.equal(canDecide(firmAdmin), false, "firm admin cannot approve/reject");
assert.equal(canSeeTeam(superAdmin), true, "super admin can see managed team list");
assert.equal(canSeeTeam(firmAdmin), true, "active firm admin can see own team list");
assert.equal(canSeeTeam(pendingFirmAdmin), false, "pending firm admin cannot manage team list");
assert.equal(canSeeTeam(consultant), false, "consultant cannot see team admin list");
assert.deepEqual(
  safeTeamUser({ id: 7, email: "x@y.test", role: "consultant", accountStatus: "pending_approval", firm: firmA }),
  {
    id: 7,
    email: "x@y.test",
    role: "consultant",
    accountStatus: "pending_approval",
    firm: 10,
    firmName: "-",
  },
);

console.log("team admin flow checks passed");
