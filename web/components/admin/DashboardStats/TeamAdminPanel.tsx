"use client";

import { useMemo, useState, type FormEvent } from "react";

type AdminRole = "super_admin" | "admin_firma" | "consultant";

type CurrentUser = {
  role?: AdminRole | null;
  firm?: string | number | { id?: string | number | null; nume?: string | null } | null;
} | null;

type PendingUser = {
  id: string | number;
  email: string;
  role: string;
  firm: string;
};

const errorText: Record<string, string> = {
  forbidden: "Nu ai drepturi pentru această acțiune.",
  invalid_email: "Emailul nu este valid.",
  password_too_short: "Parola temporară trebuie să aibă minimum 6 caractere.",
  missing_firm: "Utilizatorul tău nu are firmă asociată.",
  super_admin_required: "Doar Super Admin poate aproba sau respinge utilizatori.",
  invalid_status: "Status invalid.",
};

function roleLabel(role: string) {
  if (role === "admin_firma") return "Admin firmă";
  if (role === "consultant") return "Consultant";
  return role;
}

async function readError(res: Response) {
  try {
    const body = await res.json();
    return errorText[String(body.error)] ?? "Acțiunea nu a putut fi finalizată.";
  } catch {
    return "Acțiunea nu a putut fi finalizată.";
  }
}

export function TeamAdminPanel({
  currentUser,
  pendingUsers,
  pendingTotal,
}: {
  currentUser: CurrentUser;
  pendingUsers: PendingUser[];
  pendingTotal: number;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("consultant");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [busyDecision, setBusyDecision] = useState<string | number | null>(null);

  const canInvite = currentUser?.role === "admin_firma";
  const canDecide = currentUser?.role === "super_admin";

  const helperText = useMemo(() => {
    if (canInvite) {
      return "Adaugă un membru în firma ta. Contul rămâne blocat până îl aprobă Super Admin.";
    }
    if (canDecide) {
      return "Aprobă sau respinge membrii propuși de firme pentru beta comercială.";
    }
    return "Flux disponibil pentru Admin Firmă și Super Admin.";
  }, [canDecide, canInvite]);

  async function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    const res = await fetch("/api/admin/team-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, nume: name, role, password }),
    });

    if (!res.ok) {
      setStatus("error");
      setMessage(await readError(res));
      return;
    }

    setStatus("done");
    setMessage("Utilizator trimis la aprobare.");
    setEmail("");
    setName("");
    setPassword("");
    window.setTimeout(() => window.location.reload(), 800);
  }

  async function decide(id: string | number, accountStatus: "active" | "rejected") {
    setBusyDecision(id);
    setMessage("");

    const res = await fetch(`/api/admin/team-members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountStatus }),
    });

    if (!res.ok) {
      setStatus("error");
      setMessage(await readError(res));
      setBusyDecision(null);
      return;
    }

    setStatus("done");
    setMessage(accountStatus === "active" ? "Utilizator aprobat." : "Utilizator respins.");
    window.setTimeout(() => window.location.reload(), 600);
  }

  return (
    <div className="ds-team">
      <div className="ds-team__header">
        <div>
          <div className="ds-team__title">Flux beta comercială</div>
          <div className="ds-team__hint">{helperText}</div>
        </div>
        <span className="ds-team__badge">{pendingTotal} în așteptare</span>
      </div>

      {canInvite && (
        <form className="ds-team__form" onSubmit={submitInvite}>
          <label>
            Nume
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nume consultant" />
          </label>
          <label>
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="consultant@firma.ro"
            />
          </label>
          <label>
            Rol
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="consultant">Consultant</option>
              <option value="admin_firma">Admin firmă</option>
            </select>
          </label>
          <label>
            Parolă temporară
            <input
              required
              minLength={6}
              type="text"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="minimum 6 caractere"
            />
          </label>
          <button type="submit" disabled={status === "saving"}>
            {status === "saving" ? "Se trimite..." : "Trimite la aprobare"}
          </button>
        </form>
      )}

      <div className="ds-team__list">
        {pendingUsers.length === 0 ? (
          <div className="ds-team__empty">Nu există utilizatori în așteptare.</div>
        ) : (
          pendingUsers.map((user) => (
            <div key={user.id} className="ds-team__item">
              <span>{user.email}</span>
              <strong>{roleLabel(user.role)}</strong>
              <em>{user.firm}</em>
              {canDecide && (
                <div className="ds-team__actions">
                  <button type="button" disabled={busyDecision === user.id} onClick={() => decide(user.id, "active")}>
                    Aprobă
                  </button>
                  <button type="button" disabled={busyDecision === user.id} onClick={() => decide(user.id, "rejected")}>
                    Respinge
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {message && (
        <div className={`ds-team__message ds-team__message--${status === "error" ? "error" : "ok"}`}>
          {message}
        </div>
      )}
    </div>
  );
}
