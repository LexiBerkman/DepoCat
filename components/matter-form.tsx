"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import { createMatterAction } from "@/lib/actions";

const initialState = {
  error: "",
};

function createDeponentField() {
  return { id: crypto.randomUUID() };
}

function createCounselField() {
  return { id: crypto.randomUUID() };
}

export function MatterForm() {
  const [state, formAction, pending] = useActionState(createMatterAction, initialState);
  const [counselEntries, setCounselEntries] = useState([createCounselField()]);
  const [deponents, setDeponents] = useState([createDeponentField()]);

  return (
    <form action={formAction} className="stack">
      <div className="form-grid">
        <label className="label">
          Reference number
          <input className="field" name="referenceNumber" placeholder="24-CV-101" required />
        </label>
        <label className="label">
          Client name
          <input className="field" name="clientName" placeholder="Jane Smith" required />
        </label>
      </div>
      <div className="stack">
        <div className="row">
          <div>
            <h3 className="section-title intake-subtitle">Opposing counsel</h3>
            <p className="muted small">Add every defense attorney contact for this matter.</p>
          </div>
          <button
            className="button-secondary small-button"
            type="button"
            onClick={() => setCounselEntries((current) => [...current, createCounselField()])}
          >
            <Plus size={14} />
            Add another counsel
          </button>
        </div>
        <div className="stack">
          {counselEntries.map((counsel, index) => (
            <div key={counsel.id} className="deponent-card">
              <div className="row">
                <strong>Opposing counsel {index + 1}</strong>
                {counselEntries.length > 1 ? (
                  <button
                    className="button-secondary small-button"
                    type="button"
                    onClick={() =>
                      setCounselEntries((current) => current.filter((entry) => entry.id !== counsel.id))
                    }
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                ) : null}
              </div>
              <div className="form-grid">
                <label className="label">
                  Attorney name
                  <input className="field" name="counselName" placeholder="Alex Morgan" required />
                </label>
                <label className="label">
                  Attorney email
                  <input
                    className="field"
                    name="counselEmail"
                    type="email"
                    placeholder="alex@firm.com"
                    required
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="stack">
        <div className="row">
          <div>
            <h3 className="section-title intake-subtitle">Deponents</h3>
            <p className="muted small">Add each person you want to depose for this matter.</p>
          </div>
          <button
            className="button-secondary small-button"
            type="button"
            onClick={() => setDeponents((current) => [...current, createDeponentField()])}
          >
            <Plus size={14} />
            Add another deponent
          </button>
        </div>
        <div className="stack">
          {deponents.map((deponent, index) => (
            <div key={deponent.id} className="deponent-card">
              <div className="row">
                <strong>Deponent {index + 1}</strong>
                {deponents.length > 1 ? (
                  <button
                    className="button-secondary small-button"
                    type="button"
                    onClick={() =>
                      setDeponents((current) => current.filter((entry) => entry.id !== deponent.id))
                    }
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                ) : null}
              </div>
              <div className="form-grid">
                <label className="label">
                  Deponent
                  <input className="field" name="deponentName" placeholder="Corporate representative" required />
                </label>
                <label className="label">
                  Deponent role
                  <input className="field" name="deponentRole" placeholder="Treating physician" />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="form-grid-wide">
        <label className="label">
          Notes
          <textarea className="field" name="notes" rows={3} placeholder="Anything your paralegal should see immediately" />
        </label>
      </div>
      {state.error ? <p className="error">{state.error}</p> : null}
      <button className="button" type="submit" disabled={pending}>
        {pending ? "Saving..." : "Add matter"}
      </button>
    </form>
  );
}
