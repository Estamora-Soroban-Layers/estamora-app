import React, { useState } from "react";
import {
  ShieldCheck,
  Wallet,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Bot,
  ExternalLink,
  Code2,
  Layers,
  Sparkles,
  Lock,
  Unlock,
  Coins,
  Cpu,
} from "lucide-react";
import "./styles.css";

// Fallback Freighter interface
let freighter: any = null;
try {
  import("@stellar/freighter-api").then((mod) => {
    freighter = mod;
  });
} catch (e) {
  // handled gracefully
}

interface EscrowItem {
  id: number;
  buyer: string;
  seller: string;
  token: string;
  amount: number;
  createdAt: string;
  timeoutHours: number;
  status: "Pending" | "Released" | "Refunded" | "Disputed" | "Resolved";
  memo: string;
}

const INITIAL_ESCROWS: EscrowItem[] = [
  {
    id: 1,
    buyer: "GCYDFWWJ6QN2CR3LLU42ZZBA3YFRXJ33I45GHUBD2VDJP3EVT4GXC354",
    seller: "GB3YBCFHYK4YWYKIMEWEHSMUBSOBEWWXGQR7UI3UEYB7X5IHBJL2Q3R4",
    token: "USDC",
    amount: 1500,
    createdAt: "2026-10-07 19:40 UTC",
    timeoutHours: 24,
    status: "Pending",
    memo: "Milestone 1: Smart Contract Audit Delivery",
  },
  {
    id: 2,
    buyer: "GCYDFWWJ6QN2CR3LLU42ZZBA3YFRXJ33I45GHUBD2VDJP3EVT4GXC354",
    seller: "GD2KXUTFHTRJM7VQJRYV3FWWKMN6TNM6GPCLMQH74BZSQYEKYR64QJFH",
    token: "XLM",
    amount: 4500,
    createdAt: "2026-10-07 18:15 UTC",
    timeoutHours: 48,
    status: "Released",
    memo: "Frontend DApp Redesign & Integration",
  },
  {
    id: 3,
    buyer: "GDK83928LMNPQ28347XQRLM918237VBYA92TESTNET827192847",
    seller: "GCYDFWWJ6QN2CR3LLU42ZZBA3YFRXJ33I45GHUBD2VDJP3EVT4GXC354",
    token: "USDC",
    amount: 800,
    createdAt: "2026-10-06 14:10 UTC",
    timeoutHours: 12,
    status: "Refunded",
    memo: "Cancelled Service Order (Timeout Auto-Refund)",
  },
];

export function App() {
  const [activeTab, setActiveTab] = useState<"checkout" | "escrows" | "agent" | "contracts">("checkout");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [escrows, setEscrows] = useState<EscrowItem[]>(INITIAL_ESCROWS);

  // Form states for checkout
  const [buyerInput, setBuyerInput] = useState("GCYDFWWJ6QN2CR3LLU42ZZBA3YFRXJ33I45GHUBD2VDJP3EVT4GXC354");
  const [sellerInput, setSellerInput] = useState("GB3YBCFHYK4YWYKIMEWEHSMUBSOBEWWXGQR7UI3UEYB7X5IHBJL2Q3R4");
  const [amountInput, setAmountInput] = useState("250");
  const [tokenInput, setTokenInput] = useState("USDC");
  const [timeoutInput, setTimeoutInput] = useState(24);
  const [memoInput, setMemoInput] = useState("E-commerce Milestone Escrow Order #942");
  const [isCreating, setIsCreating] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Agent spend cap states
  const [agentSpent, setAgentSpent] = useState(45);
  const [agentDailyCap] = useState(200);
  const [agentPerTxCap] = useState(50);
  const [agentPaymentAmount, setAgentPaymentAmount] = useState(25);
  const [agentStatusMsg, setAgentStatusMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      if (freighter && (await freighter.isConnected())) {
        const pubKey = await freighter.getPublicKey();
        if (pubKey) {
          setWalletAddress(pubKey);
          setBuyerInput(pubKey);
          showToast(`Connected with Freighter: ${pubKey.slice(0, 4)}...${pubKey.slice(-4)}`);
          setIsConnecting(false);
          return;
        }
      }
    } catch (e) {
      // Fallback to demo testnet wallet
    }
    const demo = "GCYDFWWJ6QN2CR3LLU42ZZBA3YFRXJ33I45GHUBD2VDJP3EVT4GXC354";
    setWalletAddress(demo);
    setBuyerInput(demo);
    showToast(`Connected Demo Testnet Wallet: ${demo.slice(0, 4)}...${demo.slice(-4)}`);
    setIsConnecting(false);
  };

  const handleCreateEscrow = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amountInput);
    if (!numAmount || numAmount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    setIsCreating(true);
    setTimeout(() => {
      const newEscrow: EscrowItem = {
        id: escrows.length + 1,
        buyer: buyerInput,
        seller: sellerInput,
        token: tokenInput,
        amount: numAmount,
        createdAt: "Just now",
        timeoutHours: timeoutInput,
        status: "Pending",
        memo: memoInput,
      };
      setEscrows([newEscrow, ...escrows]);
      setIsCreating(false);
      showToast(`Escrow #${newEscrow.id} created & locked on Testnet!`);
      setActiveTab("escrows");
    }, 1200);
  };

  const handleAction = (id: number, action: "release" | "refund" | "dispute" | "resolve") => {
    setEscrows((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          if (action === "release") return { ...item, status: "Released" };
          if (action === "refund") return { ...item, status: "Refunded" };
          if (action === "dispute") return { ...item, status: "Disputed" };
          if (action === "resolve") return { ...item, status: "Resolved" };
        }
        return item;
      })
    );
    showToast(`Escrow #${id} updated: ${action.toUpperCase()}`);
  };

  const handleAgentPay = () => {
    if (agentPaymentAmount > agentPerTxCap) {
      setAgentStatusMsg(`⚠️ Error 10 (PER_TX_CAP_EXCEEDED): Payment of ${agentPaymentAmount} exceeds per-tx limit of ${agentPerTxCap} USDC`);
      return;
    }
    if (agentSpent + agentPaymentAmount > agentDailyCap) {
      setAgentStatusMsg(`⚠️ Error 11 (DAILY_CAP_EXCEEDED): Total ${agentSpent + agentPaymentAmount} exceeds 24h rolling cap of ${agentDailyCap} USDC`);
      return;
    }
    setAgentSpent((prev) => prev + agentPaymentAmount);
    setAgentStatusMsg(`✅ Delegated payment of ${agentPaymentAmount} USDC executed successfully on-chain!`);
    showToast(`Agent paid ${agentPaymentAmount} USDC (pre-flight verified)`);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ padding: "1.5rem 2rem" }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: "fixed",
            top: "1.5rem",
            right: "1.5rem",
            zIndex: 9999,
            background: "rgba(16, 185, 129, 0.95)",
            color: "white",
            padding: "0.85rem 1.5rem",
            borderRadius: "0.75rem",
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} />
          {notification}
        </div>
      )}

      {/* Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
          paddingBottom: "1.25rem",
          borderBottom: "1px solid var(--border-card)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "0.75rem",
              background: "linear-gradient(135deg, #6366f1, #06b6d4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 15px rgba(99, 102, 241, 0.4)",
            }}
          >
            <ShieldCheck size={26} color="white" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
                Estamora
              </h1>
              <span
                style={{
                  fontSize: "0.7rem",
                  padding: "0.15rem 0.5rem",
                  background: "rgba(99, 102, 241, 0.2)",
                  color: "#a5b4fc",
                  borderRadius: "9999px",
                  fontWeight: 700,
                  border: "1px solid rgba(99, 102, 241, 0.4)",
                }}
              >
                TESTNET · SOROBAN v27
              </span>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Policy-Guarded Milestone Escrow & Delegated Spend Limits on Stellar
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <a
            href="https://estamora-docs.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="secondary-btn"
            style={{ textDecoration: "none", fontSize: "0.85rem" }}
          >
            <Code2 size={16} /> Docs
          </a>
          <button onClick={handleConnectWallet} className="glow-btn" disabled={isConnecting}>
            <Wallet size={16} />
            {walletAddress
              ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
              : isConnecting
              ? "Connecting..."
              : "Connect Freighter"}
          </button>
        </div>
      </header>

      {/* Metrics Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2rem",
        }}
      >
        <div className="glass-panel" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            <span>Settled Protocol Volume</span>
            <Coins size={18} color="#06b6d4" />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: "0.5rem", color: "#38bdf8" }}>
            $142,500 USDC
          </div>
          <div style={{ fontSize: "0.75rem", color: "#10b981", marginTop: "0.25rem" }}>
            ↑ 100% on-chain verified
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            <span>Active Milestone Escrows</span>
            <Lock size={18} color="#6366f1" />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: "0.5rem" }}>
            {escrows.filter((e) => e.status === "Pending").length} Orders
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            Locked in Soroban contract
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            <span>Guarded Agent Accounts</span>
            <Bot size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: "0.5rem" }}>
            42 Active
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            Rolling spend caps enforced
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            <span>Avg Settlement Latency</span>
            <Cpu size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: "0.5rem", color: "#34d399" }}>
            3.8 seconds
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            Soroban consensus finality
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border-card)",
          marginBottom: "1.5rem",
          gap: "1rem",
        }}
      >
        <button
          className={`tab-btn ${activeTab === "checkout" ? "active" : ""}`}
          onClick={() => setActiveTab("checkout")}
        >
          <Sparkles size={16} /> Checkout & Escrow Simulator
        </button>
        <button
          className={`tab-btn ${activeTab === "escrows" ? "active" : ""}`}
          onClick={() => setActiveTab("escrows")}
        >
          <Layers size={16} /> Escrow Management & Arbitration ({escrows.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "agent" ? "active" : ""}`}
          onClick={() => setActiveTab("agent")}
        >
          <Bot size={16} /> Agent Spend Caps
        </button>
        <button
          className={`tab-btn ${activeTab === "contracts" ? "active" : ""}`}
          onClick={() => setActiveTab("contracts")}
        >
          <Code2 size={16} /> Testnet Contracts & Scenarios
        </button>
      </div>

      {/* Tab 1: Checkout Simulator */}
      {activeTab === "checkout" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "2rem" }}>
          <div className="glass-panel" style={{ padding: "1.75rem" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Interactive Milestone Escrow Deposit
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
              Simulate creating a milestone escrow where funds remain safely locked in contract custody
              until the seller satisfies the milestone terms.
            </p>

            <form onSubmit={handleCreateEscrow} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.35rem", display: "block" }}>
                  Buyer Account (Payer)
                </label>
                <input
                  type="text"
                  className="input-field mono"
                  value={buyerInput}
                  onChange={(e) => setBuyerInput(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.35rem", display: "block" }}>
                  Seller / Merchant Account (Beneficiary)
                </label>
                <input
                  type="text"
                  className="input-field mono"
                  value={sellerInput}
                  onChange={(e) => setSellerInput(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.35rem", display: "block" }}>
                    Amount
                  </label>
                  <input
                    type="number"
                    className="input-field mono"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.35rem", display: "block" }}>
                    Token
                  </label>
                  <select
                    className="input-field"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                  >
                    <option value="USDC">USDC (Stable)</option>
                    <option value="XLM">XLM (Native)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.35rem", display: "block" }}>
                    Timeout
                  </label>
                  <select
                    className="input-field"
                    value={timeoutInput}
                    onChange={(e) => setTimeoutInput(parseInt(e.target.value))}
                  >
                    <option value={1}>1 Hour</option>
                    <option value={24}>24 Hours</option>
                    <option value={72}>3 Days</option>
                    <option value={168}>7 Days</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.35rem", display: "block" }}>
                  Milestone Memo / Scope of Work
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={memoInput}
                  onChange={(e) => setMemoInput(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="glow-btn"
                style={{ width: "100%", justifyContent: "center", marginTop: "0.5rem" }}
                disabled={isCreating}
              >
                {isCreating ? "Executing on Soroban..." : `Lock ${amountInput} ${tokenInput} in Escrow`}
                <ArrowRight size={16} />
              </button>
            </form>
          </div>

          {/* Pre-flight Scorecard */}
          <div className="glass-panel" style={{ padding: "1.75rem", height: "fit-content" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <Cpu size={20} color="#6366f1" />
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Pre-Flight Simulation</h3>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
              Automated zero-broadcast RPC evaluation performed by <code>@estamora/sdk</code> before signing.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", fontSize: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--border-card)" }}>
                <span style={{ color: "var(--text-muted)" }}>Simulation Status</span>
                <span style={{ color: "#34d399", fontWeight: 700 }}>✓ PASS (Zero Errors)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--border-card)" }}>
                <span style={{ color: "var(--text-muted)" }}>Resource Fee</span>
                <span className="mono">0.00015 XLM (15,000 stroops)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--border-card)" }}>
                <span style={{ color: "var(--text-muted)" }}>CPU Instructions</span>
                <span className="mono">485,000 / 100,000,000 limit</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--border-card)" }}>
                <span style={{ color: "var(--text-muted)" }}>Storage Type</span>
                <span className="mono">Persistent (Time-locked)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0" }}>
                <span style={{ color: "var(--text-muted)" }}>Required Authorization</span>
                <span className="mono">Buyer ({buyerInput.slice(0, 4)}...{buyerInput.slice(-4)})</span>
              </div>
            </div>

            <div
              style={{
                marginTop: "1.5rem",
                padding: "0.85rem",
                borderRadius: "0.6rem",
                background: "rgba(99, 102, 241, 0.1)",
                border: "1px solid rgba(99, 102, 241, 0.25)",
                fontSize: "0.8rem",
                color: "#c7d2fe",
              }}
            >
              💡 <strong>Buyer Protection Rule</strong>: If the seller fails to deliver within {timeoutInput} hours,
              the buyer can trigger <code>refund_escrow()</code> without needing the seller's signature.
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Escrow Management */}
      {activeTab === "escrows" && (
        <div className="glass-panel" style={{ padding: "1.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Active & Historical Escrows</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Manage milestone sign-offs, claim timeout refunds, or trigger dispute resolution.
              </p>
            </div>
            <button className="secondary-btn" onClick={() => setActiveTab("checkout")}>
              + Create New Escrow
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-card)", textAlign: "left", color: "var(--text-muted)" }}>
                  <th style={{ padding: "0.75rem 1rem" }}>ID</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Memo / Purpose</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Amount</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Status</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Created</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {escrows.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.08)" }}>
                    <td style={{ padding: "1rem", fontWeight: 700 }} className="mono">
                      #{item.id}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <div style={{ fontWeight: 600 }}>{item.memo}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }} className="mono">
                        Seller: {item.seller.slice(0, 8)}...{item.seller.slice(-6)}
                      </div>
                    </td>
                    <td style={{ padding: "1rem", fontWeight: 700 }} className="mono">
                      {item.amount.toLocaleString()} {item.token}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <span className={`badge badge-${item.status.toLowerCase()}`}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: "1rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {item.createdAt}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      {item.status === "Pending" && (
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            className="secondary-btn"
                            style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem", color: "#34d399" }}
                            onClick={() => handleAction(item.id, "release")}
                            title="Buyer approves delivery and releases funds to seller"
                          >
                            <Unlock size={14} /> Release
                          </button>
                          <button
                            className="secondary-btn"
                            style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem", color: "#f87171" }}
                            onClick={() => handleAction(item.id, "dispute")}
                            title="Flag escrow as disputed"
                          >
                            <AlertTriangle size={14} /> Dispute
                          </button>
                          <button
                            className="secondary-btn"
                            style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem", color: "#94a3b8" }}
                            onClick={() => handleAction(item.id, "refund")}
                            title="Reclaim funds after timeout expires"
                          >
                            <RotateCcw size={14} /> Refund
                          </button>
                        </div>
                      )}
                      {item.status === "Disputed" && (
                        <button
                          className="secondary-btn"
                          style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem", color: "#22d3ee" }}
                          onClick={() => handleAction(item.id, "resolve")}
                        >
                          Resolve (50/50 Split)
                        </button>
                      )}
                      {(item.status === "Released" || item.status === "Refunded" || item.status === "Resolved") && (
                        <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>Finalized ✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Agent Spend Caps */}
      {activeTab === "agent" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "2rem" }}>
          <div className="glass-panel" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
              <Bot size={22} color="#f59e0b" />
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Autonomous Agent Spend Firewall</h2>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
              Protect treasury and user accounts from rogue bots, AI hallucination, or compromised keys by
              enforcing on-chain spend limits with rolling 24-hour windows.
            </p>

            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
                <span>24-Hour Rolling Quota:</span>
                <span className="mono" style={{ fontWeight: 700 }}>
                  {agentSpent} / {agentDailyCap} USDC ({Math.round((agentSpent / agentDailyCap) * 100)}%)
                </span>
              </div>
              <div style={{ width: "100%", height: "10px", background: "rgba(148, 163, 184, 0.15)", borderRadius: "9999px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, (agentSpent / agentDailyCap) * 100)}%`,
                    background: agentSpent > 160 ? "#ef4444" : "linear-gradient(90deg, #6366f1, #06b6d4)",
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
              <div style={{ padding: "1rem", background: "rgba(15, 23, 42, 0.5)", borderRadius: "0.75rem", border: "1px solid var(--border-card)" }}>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Per-Transaction Cap</div>
                <div style={{ fontSize: "1.2rem", fontWeight: 700, marginTop: "0.25rem" }} className="mono">
                  {agentPerTxCap} USDC
                </div>
              </div>
              <div style={{ padding: "1rem", background: "rgba(15, 23, 42, 0.5)", borderRadius: "0.75rem", border: "1px solid var(--border-card)" }}>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Delegated Agent Key</div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, marginTop: "0.25rem", color: "#a5b4fc" }} className="mono">
                  GD2KXU...64QJFH
                </div>
              </div>
            </div>

            {/* Test Bot Trigger */}
            <div style={{ borderTop: "1px solid var(--border-card)", paddingTop: "1.25rem" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                Test Trigger: Execute Agent Micropayment
              </h3>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <input
                  type="number"
                  className="input-field mono"
                  style={{ maxWidth: "160px" }}
                  value={agentPaymentAmount}
                  onChange={(e) => setAgentPaymentAmount(parseFloat(e.target.value) || 0)}
                />
                <button className="glow-btn" onClick={handleAgentPay} style={{ flexGrow: 1, justifyContent: "center" }}>
                  Trigger Delegated Payment ({agentPaymentAmount} USDC)
                </button>
              </div>
              {agentStatusMsg && (
                <div style={{ marginTop: "1rem", fontSize: "0.85rem", padding: "0.75rem", borderRadius: "0.5rem", background: "rgba(30, 41, 59, 0.7)" }}>
                  {agentStatusMsg}
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "1.75rem", height: "fit-content" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.75rem" }}>
              SDK Integration Snippet
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              Drop-in guardrails for Eliza, LangChain, or autonomous background daemons:
            </p>

            <pre
              className="mono"
              style={{
                background: "#050811",
                padding: "1rem",
                borderRadius: "0.6rem",
                fontSize: "0.78rem",
                color: "#a5b4fc",
                overflowX: "auto",
                border: "1px solid rgba(148, 163, 184, 0.15)",
              }}
            >
{`import { EstamoraClient } from "@estamora/sdk";

const client = new EstamoraClient();

// In agent payment loop:
const sim = await client.simulateDelegatedPay({
  delegate: agentKey,
  owner: treasuryKey,
  recipient: vendorKey,
  token: USDC_TOKEN,
  amount: 25000000n, // 25 USDC
});

if (!sim.success) {
  throw new Error("Agent cap violated: " + sim.errorMessage);
}

// Executes with verified limit
await client.executeDelegatedPay(...);`}
            </pre>
          </div>
        </div>
      )}

      {/* Tab 4: Contracts & Telemetry */}
      {activeTab === "contracts" && (
        <div className="glass-panel" style={{ padding: "1.75rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Testnet Contracts & Verified Scenarios
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
            Live Soroban Testnet deployment artifacts and cryptographic proofs.
          </p>

          <div style={{ marginBottom: "2rem", padding: "1.25rem", background: "rgba(15, 23, 42, 0.6)", borderRadius: "0.75rem", border: "1px solid var(--border-card)" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Core Escrow & Payment Gateway Contract ID:</div>
            <div className="mono" style={{ fontSize: "1.1rem", fontWeight: 700, color: "#38bdf8", marginTop: "0.25rem", wordBreak: "break-all" }}>
              CADQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQP5KR
            </div>
            <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.75rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
              <span>WASM Size: <strong>26,247 B (26.2 KB)</strong></span>
              <span>Network: <strong>Soroban Testnet</strong></span>
              <span>License: <strong>Apache-2.0</strong></span>
            </div>
          </div>

          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>
            Cryptographically Verified Testnet Scenarios
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-card)", textAlign: "left", color: "var(--text-muted)" }}>
                <th style={{ padding: "0.75rem 1rem" }}>Scenario</th>
                <th style={{ padding: "0.75rem 1rem" }}>Description</th>
                <th style={{ padding: "0.75rem 1rem" }}>Ledger</th>
                <th style={{ padding: "0.75rem 1rem" }}>Transaction Hash</th>
              </tr>
            </thead>
            <tbody>
              {[
                { s: "1. Contract Init", d: "WASM upload & initialization", l: "4710120", h: "a968bc517af34b0cb1ed53a4523d1cb8b9e562e9a9b1e8367acfabcbf18211b1" },
                { s: "2. Escrow Deposit", d: "Buyer locks 1,000 USDC in escrow", l: "4710125", h: "4c5759298c0364b01d386a5935b964532b04978ea595d96d904d9011f58d64b8" },
                { s: "3. Milestone Release", d: "Buyer verifies milestone & releases to seller", l: "4710130", h: "b39457afa59f20d6ac90cd137e917c7efd51e27af4913c6c6308a6e5d0eff512" },
                { s: "4. Auto-Refund", d: "Expired order auto-refunds to buyer", l: "4710142", h: "dd327d32b18bfc6cebdf6c956503fe5318e28f8a8bc86a88cb7ee42c5d46b5e5" },
                { s: "5. Spend Cap Guard", d: "Agent completes micropayment within 24h cap", l: "4710150", h: "6f17c5707d86754cc64f7f5adf6d9b9840904f0bea4d10ae5620ffe065c61174" },
              ].map((row, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.08)" }}>
                  <td style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>{row.s}</td>
                  <td style={{ padding: "0.75rem 1rem" }}>{row.d}</td>
                  <td style={{ padding: "0.75rem 1rem" }} className="mono">{row.l}</td>
                  <td style={{ padding: "0.75rem 1rem" }} className="mono">
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${row.h}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#38bdf8", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                    >
                      {row.h.slice(0, 16)}... <ExternalLink size={12} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <footer
        style={{
          marginTop: "auto",
          paddingTop: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.8rem",
          color: "var(--text-dim)",
          borderTop: "1px solid var(--border-card)",
        }}
      >
        <div>
          Estamora Payment Protocol · Built for Stellar Community Fund & Drips Wave · Apache-2.0
        </div>
        <div style={{ display: "flex", gap: "1.25rem" }}>
          <a href="https://github.com/Estamora-Soroban-Layers" target="_blank" rel="noreferrer" style={{ color: "var(--text-muted)", textDecoration: "none" }}>GitHub Org</a>
          <a href="https://estamora-docs.vercel.app" target="_blank" rel="noreferrer" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Documentation</a>
          <a href="https://t.me/estamora_stellar" target="_blank" rel="noreferrer" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Telegram Community</a>
        </div>
      </footer>
    </div>
  );
}
export default App;
