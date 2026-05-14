import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import { useAuth } from "../AuthContext";
import { FORMATIONS, FORMATION_NAMES } from "../formations";
import "./TeamSquadPage.css";

function Flag({ code, name }) {
  if (!code) return <span className="squad-flag-placeholder">🏳</span>;
  return (
    <img
      src={`/flags/${code.toLowerCase()}.png`}
      alt={name}
      className="squad-flag"
      onError={(e) => { e.target.style.display = "none"; }}
    />
  );
}

export default function TeamSquadPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const canEdit = !!user?.can_edit_squads;

  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editing, setEditing] = useState(false);
  const [draftFormation, setDraftFormation] = useState("4-3-3");
  const [draftNames, setDraftNames] = useState({});
  const [draftManager, setDraftManager] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/teams/${id}/squad/`)
      .then(({ data }) => {
        setTeam(data);
        setDraftFormation(data.formation);
        const names = {};
        for (const slot of data.slots) names[slot.order] = slot.name;
        setDraftNames(names);
        setDraftManager(data.manager || "");
        setDraftDescription(data.description || "");
        setError(null);
      })
      .catch(() => setError("Kunde inte ladda laguppställning."))
      .finally(() => setLoading(false));
  }, [id]);

  const layout = useMemo(() => {
    const f = editing ? draftFormation : team?.formation;
    return f && FORMATIONS[f] ? FORMATIONS[f] : FORMATIONS["4-3-3"];
  }, [editing, draftFormation, team]);

  const namesByOrder = useMemo(() => {
    if (editing) return draftNames;
    const map = {};
    if (team) for (const slot of team.slots) map[slot.order] = slot.name;
    return map;
  }, [editing, draftNames, team]);

  const startEdit = () => {
    setDraftFormation(team.formation);
    const names = {};
    for (const slot of team.slots) names[slot.order] = slot.name;
    setDraftNames(names);
    setDraftManager(team.manager || "");
    setDraftDescription(team.description || "");
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const slots = Array.from({ length: 11 }, (_, i) => ({
        order: i + 1,
        name: draftNames[i + 1] || "",
      }));
      const { data } = await api.put(`/teams/${id}/squad/`, {
        formation: draftFormation,
        manager: draftManager,
        description: draftDescription,
        slots,
      });
      setTeam(data);
      setEditing(false);
    } catch {
      setError("Kunde inte spara laguppställningen.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="squad-loading">Laddar...</p>;
  if (error && !team) return <p className="squad-error">{error}</p>;
  if (!team) return null;

  const managerName = editing ? draftManager : team.manager;
  const description = editing ? draftDescription : team.description;

  return (
    <div className="squad-page">
      <header className="squad-header">
        <Flag code={team.flag_code} name={team.name} />
        <h1 className="squad-team-name">{team.name}</h1>
        {canEdit && !editing && (
          <button className="squad-btn squad-btn--edit" onClick={startEdit}>
            Redigera
          </button>
        )}
        {canEdit && editing && (
          <>
            <button
              className="squad-btn squad-btn--save"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Sparar..." : "Spara"}
            </button>
            <button
              className="squad-btn squad-btn--cancel"
              onClick={cancelEdit}
              disabled={saving}
            >
              Avbryt
            </button>
          </>
        )}
      </header>

      {error && team && <p className="squad-error squad-error--inline">{error}</p>}

      <div className="squad-layout">
        <aside className="squad-description">
          {editing ? (
            <textarea
              className="squad-description-input"
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              placeholder="Skriv en text om laget..."
              rows={12}
            />
          ) : description ? (
            <p className="squad-description-text">{description}</p>
          ) : (
            <p className="squad-description-empty">Ingen beskrivning ännu.</p>
          )}
        </aside>

        <div className="squad-pitch">
          <div className="squad-formation">
            {editing ? (
              <select
                value={draftFormation}
                onChange={(e) => setDraftFormation(e.target.value)}
              >
                {FORMATION_NAMES.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            ) : (
              <span className="squad-formation-label">{team.formation}</span>
            )}
          </div>
          <div className="squad-pitch-center-circle" />
          <div className="squad-pitch-midline" />
          <div className="squad-pitch-penalty squad-pitch-penalty--top" />
          <div className="squad-pitch-penalty squad-pitch-penalty--bottom" />
          {layout.map((pos) => {
            const name = namesByOrder[pos.order] || "";
            return (
              <div
                key={pos.order}
                className="squad-slot"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              >
                <div className="squad-slot-pos">{pos.label}</div>
                {editing ? (
                  <input
                    className="squad-slot-input"
                    type="text"
                    value={draftNames[pos.order] || ""}
                    onChange={(e) =>
                      setDraftNames((d) => ({ ...d, [pos.order]: e.target.value }))
                    }
                    placeholder="Namn"
                    maxLength={80}
                  />
                ) : (
                  <div className="squad-slot-name">{name || "—"}</div>
                )}
              </div>
            );
          })}
        </div>

        <aside className="squad-manager">
          <span className="squad-manager-label">Manager</span>
          {editing ? (
            <input
              className="squad-manager-input"
              type="text"
              value={draftManager}
              onChange={(e) => setDraftManager(e.target.value)}
              placeholder="Namn"
              maxLength={80}
            />
          ) : (
            <span className="squad-manager-name">{managerName || "—"}</span>
          )}
        </aside>
      </div>
    </div>
  );
}
