import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";

const starterCustomers = [
  {
    id: 1,
    name: "Mohd Ali",
    entries: [
      {
        id: 11,
        date: "14-09-2026",
        type: "udhari",
        description: "Printout",
        amount: 300,
      },
    ],
  },
  {
    id: 2,
    name: "Rashid",
    entries: [
      {
        id: 21,
        date: "14-09-2026",
        type: "udhari",
        description: "Form",
        amount: 750,
      },
    ],
  },
  {
    id: 3,
    name: "Salman",
    entries: [
      {
        id: 31,
        date: "14-09-2026",
        type: "udhari",
        description: "Lamination",
        amount: 120,
      },
    ],
  },
  {
    id: 4,
    name: "Irfan",
    entries: [
      {
        id: 41,
        date: "14-09-2026",
        type: "udhari",
        description: "Printout",
        amount: 500,
      },
    ],
  },
  {
    id: 5,
    name: "Aslam",
    entries: [],
  },
  {
    id: 6,
    name: "Nasir",
    entries: [
      {
        id: 61,
        date: "14-09-2026",
        type: "udhari",
        description: "Form",
        amount: 1200,
      },
    ],
  },
  {
    id: 7,
    name: "Sameer",
    entries: [
      {
        id: 71,
        date: "14-09-2026",
        type: "udhari",
        description: "Printout",
        amount: 250,
      },
    ],
  },
];

function today() {
  const d = new Date();

  return (
    String(d.getDate()).padStart(2, "0") +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    d.getFullYear()
  );
}

function money(number) {
  return `₹ ${Number(number).toLocaleString("en-IN")}`;
}

function getTotal(customer, type) {
  return (customer.entries || [])
    .filter((entry) => entry.type === type)
    .reduce((total, entry) => total + Number(entry.amount || 0), 0);
}

// DUES = humein customer se lena hai.
// ADVANCE = customer ka paisa hamare paas hai.
function getNetBalance(customer) {
  return getTotal(customer, "jama") - getTotal(customer, "udhari");
}

function getDues(customer) {
  return Math.max(0, -getNetBalance(customer));
}

function getAdvance(customer) {
  return Math.max(0, getNetBalance(customer));
}

function getStatus(customer) {
  const dues = getDues(customer);
  const advance = getAdvance(customer);

  if (dues > 0) return { type: "dues", amount: dues };
  if (advance > 0) return { type: "advance", amount: advance };
  return { type: "zero", amount: 0 };
}

export default function App() {
  const [customers, setCustomers] = useState([]);

  const [search, setSearch] = useState("");

  const [selectedId, setSelectedId] = useState(null);

  const [modal, setModal] = useState(null);

  const [name, setName] = useState("");

  const [mobile, setMobile] = useState("");

  const [description, setDescription] = useState("");

  const [amount, setAmount] = useState("");

  const [editingEntryId, setEditingEntryId] = useState(null);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  function mapCustomerRow(customer, entries = []) {
    return {
      id: customer.id,
      name: customer.name,
      mobile: customer.mobile || "",
      entries: entries
        .filter((entry) => entry.customer_id === customer.id)
        .map((entry) => ({
          id: entry.id,
          date: entry.date,
          type: entry.type,
          description: entry.description || "",
          amount: Number(entry.amount || 0),
        })),
    };
  }

  async function loadData() {
    setLoading(true);
    setError("");

    const [{ data: customerRows, error: customerError }, { data: entryRows, error: entryError }] =
      await Promise.all([
        supabase
          .from("udhari_customers")
          .select("id, name, mobile, created_at")
          .order("created_at", { ascending: true }),
        supabase
          .from("udhari_entries")
          .select("id, customer_id, date, type, description, amount, created_at")
          .order("date", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);

    if (customerError || entryError) {
      console.error("Supabase load error:", customerError || entryError);
      setError("Supabase से data load नहीं हो पाया।");
      setLoading(false);
      return;
    }

    const dbCustomers = customerRows || [];
    const dbEntries = entryRows || [];

    // पहली बार Supabase खाली हो और पुराने browser में localStorage data हो,
    // तो पुराने data को एक बार database में migrate कर दें।
    if (dbCustomers.length === 0) {
      try {
        const saved = localStorage.getItem("kalam_udhari_customers");
        const oldCustomers = saved ? JSON.parse(saved) : [];

        if (Array.isArray(oldCustomers) && oldCustomers.length > 0) {
          await migrateLocalData(oldCustomers);
          await loadDataFromDatabase();
          return;
        }
      } catch (migrationReadError) {
        console.error("Local data read error:", migrationReadError);
      }
    }

    setCustomers(
      dbCustomers.map((customer) => mapCustomerRow(customer, dbEntries))
    );
    setLoading(false);
  }

  async function loadDataFromDatabase() {
    const [{ data: customerRows, error: customerError }, { data: entryRows, error: entryError }] =
      await Promise.all([
        supabase
          .from("udhari_customers")
          .select("id, name, mobile, created_at")
          .order("created_at", { ascending: true }),
        supabase
          .from("udhari_entries")
          .select("id, customer_id, date, type, description, amount, created_at")
          .order("date", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);

    if (customerError || entryError) {
      console.error("Supabase reload error:", customerError || entryError);
      setError("Supabase से data reload नहीं हो पाया।");
      setLoading(false);
      return;
    }

    setCustomers(
      (customerRows || []).map((customer) =>
        mapCustomerRow(customer, entryRows || [])
      )
    );
    setLoading(false);
  }

  async function migrateLocalData(oldCustomers) {
    for (const oldCustomer of oldCustomers) {
      const { data: newCustomer, error: customerError } = await supabase
        .from("udhari_customers")
        .insert({
          name: String(oldCustomer.name || "").trim(),
          mobile: String(oldCustomer.mobile || "").trim(),
        })
        .select("id")
        .single();

      if (customerError) {
        throw customerError;
      }

      const oldEntries = Array.isArray(oldCustomer.entries)
        ? oldCustomer.entries
        : [];

      if (oldEntries.length > 0) {
        const entriesToInsert = oldEntries
          .filter((entry) => Number(entry.amount) > 0)
          .map((entry) => ({
            customer_id: newCustomer.id,
            date: convertDateToISO(entry.date),
            type: entry.type === "jama" ? "jama" : "udhari",
            description: String(entry.description || "").trim() || "उधारी",
            amount: Number(entry.amount),
          }));

        if (entriesToInsert.length > 0) {
          const { error: entryError } = await supabase
            .from("udhari_entries")
            .insert(entriesToInsert);

          if (entryError) {
            throw entryError;
          }
        }
      }
    }

    localStorage.setItem("kalam_udhari_supabase_migrated", "1");
  }

  function convertDateToISO(value) {
    if (!value) return new Date().toISOString().slice(0, 10);

    const text = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

    const match = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}`;
    }

    return new Date().toISOString().slice(0, 10);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return customers;

    return customers.filter((customer) =>
      customer.name.toLowerCase().includes(query) ||
      String(customer.mobile || "").includes(query)
    );
  }, [customers, search]);

  const selectedCustomer = customers.find(
    (customer) => customer.id === selectedId
  );

  const totalDues = customers.reduce(
    (total, customer) => total + getDues(customer),
    0
  );

  const totalAdvance = customers.reduce(
    (total, customer) => total + getAdvance(customer),
    0
  );

  // =========================
  // NEW CUSTOMER
  // =========================

  async function addCustomer() {
    const cleanName = name.trim();

    if (!cleanName) {
      alert("कृपया ग्राहक का नाम लिखें।");
      return;
    }

    const cleanMobile = mobile.trim();
    setSaving(true);
    setError("");

    const { data, error: insertError } = await supabase
      .from("udhari_customers")
      .insert({
        name: cleanName,
        mobile: cleanMobile,
      })
      .select("id, name, mobile, created_at")
      .single();

    setSaving(false);

    if (insertError) {
      console.error("Add customer error:", insertError);
      setError("ग्राहक सेव नहीं हो पाया।");
      alert("ग्राहक सेव नहीं हो पाया। Supabase connection/policy check करें।");
      return;
    }

    const newCustomer = {
      id: data.id,
      name: data.name,
      mobile: data.mobile || "",
      entries: [],
    };

    setCustomers((previous) => [...previous, newCustomer]);
    setName("");
    setMobile("");
    setModal(null);
    setSelectedId(newCustomer.id);
  }

  // =========================
  // OPEN CUSTOMER DETAILS
  // =========================

  function openCustomerDetails(id) {
    setSelectedId(id);
  }

  // =========================
  // ADD UDHARI / JAMA / EDIT
  // =========================

  function openEditEntry(entry) {
    setEditingEntryId(entry.id);
    setDescription(entry.description || "");
    setAmount(String(entry.amount ?? ""));
    setModal(entry.type);
  }

  function closeEntryModal() {
    setDescription("");
    setAmount("");
    setEditingEntryId(null);
    setModal(null);
  }

  async function addEntry() {
    const value = Number(amount);

    if (!selectedCustomer) return;

    if (!value || value <= 0) {
      alert("कृपया सही रकम लिखें।");
      return;
    }

    const cleanDescription =
      description.trim() ||
      (modal === "udhari" ? "उधारी" : "जमा");

    setSaving(true);
    setError("");

    if (editingEntryId !== null) {
      const { data, error: updateError } = await supabase
        .from("udhari_entries")
        .update({
          type: modal,
          description: cleanDescription,
          amount: value,
        })
        .eq("id", editingEntryId)
        .select("id, customer_id, date, type, description, amount")
        .single();

      setSaving(false);

      if (updateError) {
        console.error("Edit entry error:", updateError);
        setError("Transaction edit नहीं हो पाया।");
        alert("Transaction edit नहीं हो पाया।");
        return;
      }

      setCustomers((previous) =>
        previous.map((customer) => {
          if (customer.id !== selectedCustomer.id) return customer;

          return {
            ...customer,
            entries: customer.entries.map((entry) =>
              entry.id === editingEntryId
                ? {
                    ...entry,
                    type: data.type,
                    description: data.description,
                    amount: Number(data.amount),
                  }
                : entry
            ),
          };
        })
      );

      closeEntryModal();
      return;
    }

    const { data, error: insertError } = await supabase
      .from("udhari_entries")
      .insert({
        customer_id: selectedCustomer.id,
        date: new Date().toISOString().slice(0, 10),
        type: modal,
        description: cleanDescription,
        amount: value,
      })
      .select("id, customer_id, date, type, description, amount")
      .single();

    setSaving(false);

    if (insertError) {
      console.error("Add entry error:", insertError);
      setError("Transaction सेव नहीं हुआ।");
      alert("Transaction सेव नहीं हुआ।");
      return;
    }

    const newEntry = {
      id: data.id,
      date: data.date,
      type: data.type,
      description: data.description,
      amount: Number(data.amount),
    };

    setCustomers((previous) =>
      previous.map((customer) =>
        customer.id === selectedCustomer.id
          ? {
              ...customer,
              entries: [...customer.entries, newEntry],
            }
          : customer
      )
    );

    closeEntryModal();
  }

  // =========================
  // DELETE CUSTOMER
  // =========================

  async function deleteCustomer(id) {
    const customer = customers.find((item) => item.id === id);

    if (!customer) return;

    const confirmDelete = window.confirm(
      `${customer.name} को हटाना है?\n\nउसके सभी उधारी-जमा transactions भी हट जाएंगे।`
    );

    if (!confirmDelete) return;

    setSaving(true);
    setError("");

    const { error: deleteError } = await supabase
      .from("udhari_customers")
      .delete()
      .eq("id", id);

    setSaving(false);

    if (deleteError) {
      console.error("Delete customer error:", deleteError);
      setError("ग्राहक delete नहीं हुआ।");
      alert("ग्राहक delete नहीं हुआ।");
      return;
    }

    setCustomers((previous) =>
      previous.filter((item) => item.id !== id)
    );

    if (selectedId === id) {
      setSelectedId(null);
    }
  }

  // =========================
  // CLOSE DETAILS
  // =========================

  function closeDetails() {
    setSelectedId(null);
  }

  return (
    <div className="app">

      {/* =========================
          HEADER
      ========================= */}

      <header className="header">
        <div className="heading single-title">
          <h1>KALAM UDHARI</h1>
        </div>
      </header>

      {/* =========================
          MAIN
      ========================= */}

      <main className="main">

        {error && (
          <div className="empty" style={{ marginBottom: "16px" }}>
            {error}
          </div>
        )}

        {/* SUMMARY */}

        <div className="summary">
          <div className="summary-card">
            <span>ग्राहक</span>
            <b>{customers.length}</b>
          </div>

          <div className="summary-card dues-card">
            <span>कुल DUES</span>
            <b className="red">{money(totalDues)}</b>
          </div>

          <div className="summary-card advance-card">
            <span>ADVANCE</span>
            <b className="green">{money(totalAdvance)}</b>
          </div>
        </div>

        {/* TOOLBAR */}

        <div className="toolbar">

          <button
            className="add"
            onClick={() => {
              setName("");
              setMobile("");
              setModal("customer");
            }}
          >
            ＋ नया ग्राहक जोड़ें
          </button>

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="🔍 नाम या मोबाइल नंबर खोजें..."
          />

        </div>

        {/* CUSTOMER LIST */}

        <section className="card">

          {loading ? (
            <div className="empty">Data load हो रहा है...</div>
          ) : (
            <>
          <div className="table-head">

            <span>
              ग्राहक का नाम
            </span>

            <span>
              बाकी उधारी
            </span>

            <span>
              ऑप्शन
            </span>

          </div>

          {filteredCustomers.map((customer) => {
            const status = getStatus(customer);

            return (
              <div className="row" key={customer.id}>
                <div className="person">
                  <span className="avatar">
                    {customer.name.charAt(0).toUpperCase()}
                  </span>

                  <div className="person-info">
                    <b>{customer.name}</b>
                    {customer.mobile && (
                      <small>📱 {customer.mobile}</small>
                    )}
                  </div>
                </div>

                <div className="balance-status">
                  {status.type === "dues" && (
                    <span className="status-badge dues-badge">
                      DUES {money(status.amount)}
                    </span>
                  )}

                  {status.type === "advance" && (
                    <span className="status-badge advance-badge">
                      ADVANCE {money(status.amount)}
                    </span>
                  )}

                  {status.type === "zero" && (
                    <span className="status-zero">₹ 0</span>
                  )}
                </div>

                <div className="actions">
                  <button
                    className="view"
                    onClick={() => openCustomerDetails(customer.id)}
                  >
                    देखें
                  </button>

                  <button
                    className="dots"
                    title="ग्राहक हटाएं"
                    onClick={() => deleteCustomer(customer.id)}
                  >
                    ⋮
                  </button>
                </div>
              </div>
            );
          })}

          {filteredCustomers.length === 0 && (
            <div className="empty">
              कोई ग्राहक नहीं मिला
            </div>
          )}
            </>
          )}

        </section>

      </main>

      {/* =========================
          FOOTER
      ========================= */}

      <footer>

        <b>
          KALAM CSC CENTER
        </b>

        <span>
          आपका विश्वास • हमारी पहचान
        </span>

      </footer>

      {/* ==================================================
          CUSTOMER DETAILS POPUP
      ================================================== */}

      {selectedCustomer && (

        <div
          className="details-overlay"
          onMouseDown={(event) => {

            if (
              event.target === event.currentTarget
            ) {
              closeDetails();
            }

          }}
        >

          <div className="details-modal">

            {/* DETAILS HEADER */}

            <div className="details-header">
              <div>
                <h2>{selectedCustomer.name}</h2>

                {selectedCustomer.mobile && (
                  <p className="customer-mobile">
                    📱 {selectedCustomer.mobile}
                  </p>
                )}

                {(() => {
                  const status = getStatus(selectedCustomer);
                  return (
                    <p className="customer-status-line">
                      {status.type === "dues" && (
                        <>
                          DUES:
                          <strong className="red">{money(status.amount)}</strong>
                        </>
                      )}
                      {status.type === "advance" && (
                        <>
                          ADVANCE:
                          <strong className="green">{money(status.amount)}</strong>
                        </>
                      )}
                      {status.type === "zero" && (
                        <>
                          हिसाब बराबर:
                          <strong>₹ 0</strong>
                        </>
                      )}
                    </p>
                  );
                })()}
              </div>

              <button
                className="details-close"
                onClick={closeDetails}
              >
                ×
              </button>

            </div>

            {/* DETAILS SUMMARY */}

            <div className="details-summary">

              <div>

                <span>
                  कुल उधारी
                </span>

                <strong className="red">
                  {money(
                    getTotal(
                      selectedCustomer,
                      "udhari"
                    )
                  )}
                </strong>

              </div>

              <div>

                <span>
                  कुल जमा
                </span>

                <strong className="green">
                  {money(
                    getTotal(
                      selectedCustomer,
                      "jama"
                    )
                  )}
                </strong>

              </div>

              <div className="status-summary">
                <span>वर्तमान स्थिति</span>

                {getDues(selectedCustomer) > 0 ? (
                  <strong className="red">
                    DUES {money(getDues(selectedCustomer))}
                  </strong>
                ) : getAdvance(selectedCustomer) > 0 ? (
                  <strong className="green">
                    ADVANCE {money(getAdvance(selectedCustomer))}
                  </strong>
                ) : (
                  <strong>₹ 0</strong>
                )}
              </div>

            </div>

            {/* ADD BUTTONS */}

            <div className="details-buttons">

              <button
                className="detail-udhari"
                onClick={() => {
                  setEditingEntryId(null);
                  setDescription("");
                  setAmount("");
                  setModal("udhari");
                }}
              >
                ＋ उधारी
              </button>

              <button
                className="detail-jama"
                onClick={() => {
                  setEditingEntryId(null);
                  setDescription("");
                  setAmount("");
                  setModal("jama");
                }}
              >
                ＋ जमा
              </button>

            </div>

            {/* HISTORY */}

            <h3>
              हिसाब
            </h3>

            <div className="details-history">

              {selectedCustomer.entries.length === 0 ? (

                <div className="empty">
                  अभी कोई हिसाब नहीं है
                </div>

              ) : (

                [...selectedCustomer.entries]
                  .reverse()
                  .map((entry) => (

                    <div
                      className="details-entry"
                      key={entry.id}
                    >

                      <div>

                        <strong>
                          {entry.description}
                        </strong>

                        <small>
                          {entry.date}
                        </small>

                      </div>

                      <div className="entry-right">
                        <span
                          className={
                            entry.type === "udhari"
                              ? "entry-type entry-udhari"
                              : "entry-type entry-jama"
                          }
                        >
                          {entry.type === "udhari" ? "उधारी" : "जमा"}
                        </span>

                        <strong
                          className={
                            entry.type === "udhari"
                              ? "red"
                              : "green"
                          }
                        >
                          {entry.type === "udhari" ? "+" : "-"}{" "}
                          {money(entry.amount)}
                        </strong>

                        <button
                          className="entry-edit"
                          onClick={() => openEditEntry(entry)}
                          title="इस transaction को edit करें"
                        >
                          ✏ Edit
                        </button>
                      </div>

                    </div>

                  ))

              )}

            </div>

          </div>

        </div>

      )}

      {/* ==================================================
          ADD CUSTOMER / UDHARI / JAMA MODAL
      ================================================== */}

      {modal && (

        <div
          className="overlay"
          onMouseDown={(event) => {

            if (
              event.target === event.currentTarget
            ) {
              closeEntryModal();
            }

          }}
        >

          <div
            className="modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <button
              className="x"
              onClick={closeEntryModal}
            >
              ×
            </button>

            {/* NEW CUSTOMER */}

            {modal === "customer" && (

              <>
                <h2>
                  नया ग्राहक
                </h2>

                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="ग्राहक का नाम"
                  onKeyDown={(event) => {

                    if (
                      event.key === "Enter"
                    ) {
                      addCustomer();
                    }

                  }}
                />

                <input
                  type="tel"
                  value={mobile}
                  onChange={(event) =>
                    setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  placeholder="मोबाइल नंबर (वैकल्पिक)"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      addCustomer();
                    }
                  }}
                />

                <button
                  className="save"
                  onClick={addCustomer}
                  disabled={saving}
                >
                  {saving ? "सेव हो रहा है..." : "ग्राहक सेव करें"}
                </button>
              </>

            )}

            {/* UDHARI / JAMA */}

            {modal !== "customer" && (

              <>

                <h2>
                  {editingEntryId !== null
                    ? modal === "udhari"
                      ? "उधारी Edit करें"
                      : "जमा Edit करें"
                    : modal === "udhari"
                      ? "उधारी जोड़ें"
                      : "जमा जोड़ें"}
                </h2>

                <input
                  autoFocus
                  type="text"
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  placeholder="क्या लिया / किस काम का"
                />

                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(event) =>
                    setAmount(event.target.value)
                  }
                  placeholder="रकम (₹)"
                  onKeyDown={(event) => {

                    if (
                      event.key === "Enter"
                    ) {
                      addEntry();
                    }

                  }}
                />

                <div className="modal-hint">
                  {editingEntryId !== null
                    ? "Description और रकम बदलकर बदलाव सेव करें।"
                    : modal === "udhari"
                      ? "यह रकम ग्राहक की DUES में जुड़ेगी।"
                      : "यह रकम ग्राहक की जमा में जुड़ेगी।"}
                </div>

                <button
                  className={
                    modal === "udhari"
                      ? "save"
                      : "save green-bg"
                  }
                  onClick={addEntry}
                  disabled={saving}
                >
                  {saving ? "सेव हो रहा है..." : editingEntryId !== null ? "बदलाव सेव करें" : "सेव करें"}
                </button>

              </>

            )}

          </div>

        </div>

      )}

    </div>
  );
}