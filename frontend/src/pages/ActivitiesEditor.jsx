import React, { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

export default function ActivitiesEditor() {
  const [activities, setActivities] = useState([]);
  const [form, setForm] = useState({
    title: "",
    role: "",
    description: "",
    hours_per_week: "",
    leadership: false,
    start_date: "",
    end_date: ""
  });
  const [status, setStatus] = useState("");

  const loadActivities = () => {
    apiFetch("/api/students/me/activities")
      .then(setActivities)
      .catch(() => {});
  };

  useEffect(() => {
    loadActivities();
  }, []);

  const updateField = (key) => (e) => {
    const value = key === "leadership" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addActivity = async (e) => {
    e.preventDefault();
    setStatus("Saving...");
    try {
      await apiFetch("/api/students/me/activities", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setForm({
        title: "",
        role: "",
        description: "",
        hours_per_week: "",
        leadership: false,
        start_date: "",
        end_date: ""
      });
      loadActivities();
      setStatus("Saved.");
    } catch (err) {
      setStatus(err.message);
    }
  };

  return (
    <div className="grid two">
      <div className="card">
        <div className="section-title">Add Extracurricular Activity</div>
        <form onSubmit={addActivity}>
          <div className="input">
            <label>Title</label>
            <input value={form.title} onChange={updateField("title")} placeholder="Robotics Club" />
          </div>
          <div className="input">
            <label>Role</label>
            <input value={form.role} onChange={updateField("role")} placeholder="Team Lead" />
          </div>
          <div className="input">
            <label>Description</label>
            <textarea rows="3" value={form.description} onChange={updateField("description")} placeholder="Describe your impact" />
          </div>
          <div className="input">
            <label>Hours per week</label>
            <input value={form.hours_per_week} onChange={updateField("hours_per_week")} placeholder="6" />
          </div>
          <div className="input">
            <label>
              <input type="checkbox" checked={form.leadership} onChange={updateField("leadership")} />
              <span style={{ marginLeft: "8px" }}>Leadership Role</span>
            </label>
          </div>
          <div className="input">
            <label>Start Date</label>
            <input type="date" value={form.start_date} onChange={updateField("start_date")} />
          </div>
          <div className="input">
            <label>End Date</label>
            <input type="date" value={form.end_date} onChange={updateField("end_date")} />
          </div>
          <button className="button" type="submit">Save Activity</button>
          {status && <p className="muted" style={{ marginTop: "10px" }}>{status}</p>}
        </form>
      </div>

      <div className="card">
        <div className="section-title">Current Activities</div>
        <div className="list">
          {activities.map((activity) => (
            <div key={activity.id} className="card">
              <strong>{activity.title}</strong>
              <p className="muted">{activity.role} • {activity.hours_per_week} hrs/week</p>
              <p className="muted">{activity.description}</p>
            </div>
          ))}
          {!activities.length && <p className="muted">No activities yet.</p>}
        </div>
      </div>
    </div>
  );
}
