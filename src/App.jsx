import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

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
  const [customers, setCustomers] = useState(() => {
    try {
      const saved = localStorage.getItem("kalam_udhari_customers");

      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((customer) => ({
          ...customer,
          mobile: customer.mobile || "",
          entries: Array.isArray(customer.entries) ? customer.entries : [],
        }));
      }

      return starterCustomers.map((customer) => ({
        ...customer,
        mobile: customer.mobile || "",
      }));
    } catch {
      return starterCustomers;
    }
  });

  const [search, setSearch] = useState("");

  const [selectedId, setSelectedId] = useState(null);

  const [modal, setModal] = useState(null);

  const [name, setName] = useState("");

  const [mobile, setMobile] = useState("");

  const [description, setDescription] = useState("");

  const [amount, setAmount] = useState("");

  const [editingEntryId, setEditingEntryId] = useState(null);

  useEffect(() => {
    localStorage.setItem(
      "kalam_udhari_customers",
      JSON.stringify(customers)
    );
  }, [customers]);

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

  function addCustomer() {
    const cleanName = name.trim();

    if (!cleanName) {
      alert("कृपया ग्राहक का नाम लिखें।");
      return;
    }

    const cleanMobile = mobile.trim();

    const newCustomer = {
      id: Date.now(),
      name: cleanName,
      mobile: cleanMobile,
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
  // ADD UDHARI / JAMA
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

  function addEntry() {
    const value = Number(amount);

    if (!selectedCustomer) {
      return;
    }

    if (!value || value <= 0) {
      alert("कृपया सही रकम लिखें।");
      return;
    }

    const cleanDescription =
      description.trim() ||
      (modal === "udhari" ? "उधारी" : "जमा");

    setCustomers((previous) =>
      previous.map((customer) => {
        if (customer.id !== selectedCustomer.id) {
          return customer;
        }

        if (editingEntryId !== null) {
          return {
            ...customer,
            entries: customer.entries.map((entry) =>
              entry.id === editingEntryId
                ? {
                    ...entry,
                    type: modal,
                    description: cleanDescription,
                    amount: value,
                  }
                : entry
            ),
          };
        }

        const newEntry = {
          id: Date.now(),
          date: today(),
          type: modal,
          description: cleanDescription,
          amount: value,
        };

        return {
          ...customer,
          entries: [...customer.entries, newEntry],
        };
      })
    );

    closeEntryModal();
  }

  // =========================
  // DELETE CUSTOMER
  // =========================

  function deleteCustomer(id) {
    const customer = customers.find(
      (item) => item.id === id
    );

    if (!customer) {
      return;
    }

    const confirmDelete = window.confirm(
      `${customer.name} को हटाना है?`
    );

    if (!confirmDelete) {
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

        <div className="logo">
          K
        </div>

        <div className="heading">

          <h1>
            KALAM CSC CENTER
          </h1>

          <div className="badge">
            UDHARI
          </div>

          <p>
            Simple Hisaab • Behtar Vyapar
          </p>

        </div>


      </header>

      {/* =========================
          MAIN
      ========================= */}

      <main className="main">

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
                >
                  ग्राहक सेव करें
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
                    modal === "udari"
                      ? "save"
                      : "save green-bg"
                  }
                  onClick={addEntry}
                >
                  {editingEntryId !== null ? "बदलाव सेव करें" : "सेव करें"}
                </button>

              </>

            )}

          </div>

        </div>

      )}

    </div>
  );
}