

import { useState, useCallback } from "react";
import { useCartState, useCartDispatch } from "../Layout";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AddressForm {
  first_name: string;
  last_name: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postal_code: string;
  country_code: string;
  phone: string;
}

interface PaymentForm {
  card_number: string;
  expiry: string;
  cvc: string;
  name_on_card: string;
}

type Step = "address" | "shipping" | "payment" | "review" | "confirmed";

const SHIPPING_OPTIONS = [
  { id: "std", name: "Standard Shipping", price: 599, days: "5–7" },
  { id: "exp", name: "Express Shipping", price: 1299, days: "2–3" },
  { id: "ovn", name: "Overnight Shipping", price: 2499, days: "1" },
];

const EMPTY_ADDRESS: AddressForm = {
  first_name: "",
  last_name: "",
  address_1: "",
  address_2: "",
  city: "",
  state: "",
  postal_code: "",
  country_code: "US",
  phone: "",
};

const EMPTY_PAYMENT: PaymentForm = {
  card_number: "",
  expiry: "",
  cvc: "",
  name_on_card: "",
};


const fmt = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);

const fmtCard = (v: string) =>
  v
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();

const fmtExpiry = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};


const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0c0c0e; --surface: #141417; --surface2: #1c1c21;
    --border: #2a2a31; --border-hover: #404050;
    --text: #e8e8f0; --text-muted: #6b6b80; --text-dim: #9999aa;
    --accent: #7c6aff; --accent-dim: rgba(124,106,255,0.15); --accent-glow: rgba(124,106,255,0.3);
    --green: #3ddc97; --green-dim: rgba(61,220,151,0.12);
    --amber: #f5a623; --amber-dim: rgba(245,166,35,0.12);
    --red: #ff5c5c; --red-dim: rgba(255,92,92,0.12);
    --radius: 6px; --radius-lg: 10px;
    --mono: 'DM Mono', monospace; --sans: 'Syne', sans-serif;
    --transition: 160ms cubic-bezier(0.4,0,0.2,1);
  }

  .checkout-root {
    min-height: 100vh; background: var(--bg); color: var(--text);
    font-family: var(--sans);
    display: flex; flex-direction: column; align-items: center;
    padding: 40px 16px 80px;
  }

  .checkout-inner { width: 100%; max-width: 960px; display: flex; gap: 32px; align-items: flex-start; }

  /* ── Left: form column ── */
  .checkout-form-col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 24px; }

  /* Breadcrumb steps */
  .steps { display: flex; align-items: center; gap: 0; margin-bottom: 8px; }
  .step-item {
    display: flex; align-items: center; gap: 6px;
    font-family: var(--mono); font-size: 12px; color: var(--text-muted);
    cursor: default;
  }
  .step-item.active { color: var(--accent); font-weight: 600; }
  .step-item.done { color: var(--green); cursor: pointer; }
  .step-item.done:hover { text-decoration: underline; }
  .step-sep { margin: 0 8px; color: var(--border-hover); font-size: 14px; }
  .step-num {
    width: 20px; height: 20px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 700;
    background: var(--surface2); color: var(--text-muted); border: 1px solid var(--border);
  }
  .step-item.active .step-num { background: var(--accent); color: #fff; border-color: var(--accent); }
  .step-item.done .step-num { background: var(--green-dim); color: var(--green); border-color: rgba(61,220,151,0.3); }

  /* Card */
  .card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 24px;
  }
  .card-title {
    font-size: 15px; font-weight: 800; color: var(--text);
    margin-bottom: 20px; display: flex; align-items: center; gap: 8px;
  }
  .card-icon { color: var(--accent); }

  /* Form grid */
  .field-grid { display: grid; gap: 14px; }
  .field-grid-2 { grid-template-columns: 1fr 1fr; }
  .field-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
  label { display: flex; flex-direction: column; gap: 5px; }
  .label-text { font-family: var(--mono); font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
  .label-text.required::after { content: ' *'; color: var(--red); }
  input, select {
    padding: 10px 12px; background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--radius); color: var(--text);
    font-family: var(--mono); font-size: 13px; outline: none;
    transition: border-color var(--transition);
    width: 100%;
  }
  input::placeholder { color: var(--text-muted); }
  input:focus, select:focus { border-color: var(--accent); }
  input.error { border-color: var(--red); }
  .field-error { font-family: var(--mono); font-size: 11px; color: var(--red); margin-top: 3px; }
  select option { background: var(--surface2); }

  /* Shipping options */
  .ship-options { display: flex; flex-direction: column; gap: 10px; }
  .ship-option {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px; border: 1px solid var(--border);
    border-radius: var(--radius-lg); cursor: pointer;
    transition: all var(--transition); background: var(--surface2);
  }
  .ship-option:hover { border-color: var(--border-hover); }
  .ship-option.selected { border-color: var(--accent); background: var(--accent-dim); }
  .ship-option-left { display: flex; align-items: center; gap: 12px; }
  .ship-radio {
    width: 16px; height: 16px; border-radius: 50%;
    border: 1.5px solid var(--border); flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    transition: all var(--transition);
  }
  .ship-option.selected .ship-radio { border-color: var(--accent); background: var(--accent); }
  .ship-radio-dot { width: 6px; height: 6px; border-radius: 50%; background: #fff; }
  .ship-name { font-size: 14px; font-weight: 600; }
  .ship-days { font-family: var(--mono); font-size: 12px; color: var(--text-muted); }
  .ship-price { font-family: var(--mono); font-size: 14px; color: var(--green); font-weight: 600; }

  /* Payment card input styling */
  .card-number-wrap { position: relative; }
  .card-brand {
    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
    font-family: var(--mono); font-size: 11px; color: var(--text-muted);
    background: var(--surface2); padding: 2px 6px; border-radius: 4px;
    border: 1px solid var(--border);
  }

  /* Review section */
  .review-items { display: flex; flex-direction: column; gap: 10px; }
  .review-item {
    display: flex; align-items: center; gap: 12px;
    padding: 12px; background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--radius); font-size: 13px;
  }
  .review-item img { width: 40px; height: 40px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }
  .review-item-info { flex: 1; min-width: 0; }
  .review-item-title { font-weight: 600; }
  .review-item-meta { font-family: var(--mono); font-size: 11px; color: var(--text-muted); margin-top: 2px; }
  .review-item-price { font-family: var(--mono); font-size: 13px; color: var(--green); }

  .review-section { margin-top: 4px; }
  .review-section-label { font-family: var(--mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); margin-bottom: 8px; }
  .review-info { font-size: 13px; color: var(--text-dim); font-family: var(--mono); line-height: 1.7; }

  /* CTA button */
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    padding: 13px 24px; border-radius: var(--radius-lg); border: none;
    font-family: var(--sans); font-size: 14px; font-weight: 700;
    cursor: pointer; transition: all var(--transition);
  }
  .btn-primary { background: var(--accent); color: #fff; width: 100%; }
  .btn-primary:hover { background: #9080ff; box-shadow: 0 0 24px var(--accent-glow); }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; pointer-events: none; }
  .btn-ghost { background: transparent; color: var(--text-muted); border: 1px solid var(--border); }
  .btn-ghost:hover { background: var(--surface2); color: var(--text); }

  /* ── Right: order summary ── */
  .order-summary {
    width: 320px; flex-shrink: 0;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 24px;
    position: sticky; top: 40px;
  }
  .summary-title { font-size: 13px; font-weight: 800; color: var(--text); margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.06em; font-family: var(--mono); }
  .summary-items { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
  .summary-item { display: flex; align-items: center; gap: 10px; }
  .summary-item img { width: 36px; height: 36px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }
  .summary-item-name { flex: 1; font-size: 12px; font-weight: 600; line-height: 1.3; }
  .summary-item-qty { font-family: var(--mono); font-size: 11px; color: var(--text-muted); }
  .summary-item-price { font-family: var(--mono); font-size: 12px; color: var(--green); flex-shrink: 0; }

  .summary-divider { border: none; border-top: 1px solid var(--border); margin: 16px 0; }
  .summary-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 13px; }
  .summary-row-label { color: var(--text-muted); font-family: var(--mono); }
  .summary-row-val { font-family: var(--mono); color: var(--text-dim); }
  .summary-row-total .summary-row-label { font-weight: 700; font-size: 14px; color: var(--text); }
  .summary-row-total .summary-row-val { font-size: 18px; font-weight: 800; color: var(--text); }

  /* Discount input */
  .discount-row { display: flex; gap: 8px; margin-top: 12px; }
  .discount-input {
    flex: 1; padding: 9px 12px; background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--radius); color: var(--text); font-family: var(--mono); font-size: 13px;
    outline: none; transition: border-color var(--transition);
    text-transform: uppercase;
  }
  .discount-input:focus { border-color: var(--accent); }
  .discount-applied { font-family: var(--mono); font-size: 12px; color: var(--green); margin-top: 6px; }

  /* Spinner */
  .spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Success state */
  .success-card {
    text-align: center; padding: 48px 32px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg);
  }
  .success-icon { font-size: 52px; margin-bottom: 16px; }
  .success-title { font-size: 22px; font-weight: 800; color: var(--green); margin-bottom: 8px; }
  .success-subtitle { font-size: 14px; color: var(--text-muted); font-family: var(--mono); margin-bottom: 4px; }
  .success-order-id { font-family: var(--mono); font-size: 13px; color: var(--accent); margin-top: 12px; }
  .success-continue { margin-top: 28px; }

  /* Security badge */
  .security-note { display: flex; align-items: center; gap: 6px; font-family: var(--mono); font-size: 11px; color: var(--text-muted); margin-top: 12px; justify-content: center; }

  /* Section nav */
  .section-nav { display: flex; gap: 10px; margin-top: 8px; }

  @media (max-width: 720px) {
    .checkout-inner { flex-direction: column-reverse; }
    .order-summary { width: 100%; position: static; }
    .field-grid-2, .field-grid-3 { grid-template-columns: 1fr; }
  }
`;


const STEPS: { key: Step; label: string }[] = [
  { key: "address", label: "Address" },
  { key: "shipping", label: "Shipping" },
  { key: "payment", label: "Payment" },
  { key: "review", label: "Review" },
];


export default function CheckoutForm() {
  const { items, total } = useCartState() ?? { items: [], total: 0 };
  const dispatch = useCartDispatch();
  const clearCart = dispatch.clearCart;

  const [step, setStep] = useState<Step>("address");
  const [address, setAddress] = useState<AddressForm>(EMPTY_ADDRESS);
  const [shippingOption, setShippingOption] = useState(SHIPPING_OPTIONS[0]);
  const [payment, setPayment] = useState<PaymentForm>(EMPTY_PAYMENT);
  const [email, setEmail] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [discountApplied, setDiscountApplied] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPlacing, setIsPlacing] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const TAX_RATE = 0.08875;
  const subtotal = total; 
  const discountAmt = discountApplied ? Math.round(subtotal * 0.1) : 0;
  const shipping = shippingOption.price;
  const tax = Math.round((subtotal - discountAmt) * TAX_RATE);
  const grandTotal = subtotal - discountAmt + shipping + tax;

  const stepIdx = STEPS.findIndex((s) => s.key === step);

  const goTo = useCallback(
    (target: Step) => {
      const targetIdx = STEPS.findIndex((s) => s.key === target);
      if (targetIdx < stepIdx) setStep(target);
    },
    [stepIdx]
  );


  const validateAddress = () => {
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = "Invalid email";
    if (!address.first_name.trim()) errs.first_name = "Required";
    if (!address.last_name.trim()) errs.last_name = "Required";
    if (!address.address_1.trim()) errs.address_1 = "Required";
    if (!address.city.trim()) errs.city = "Required";
    if (!address.state.trim()) errs.state = "Required";
    if (!address.postal_code.trim()) errs.postal_code = "Required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validatePayment = () => {
    const errs: Record<string, string> = {};
    const raw = payment.card_number.replace(/\s/g, "");
    if (raw.length < 16) errs.card_number = "Enter a valid 16-digit card number";
    if (!payment.expiry.match(/^\d{2}\/\d{2}$/)) errs.expiry = "MM/YY format";
    if (payment.cvc.length < 3) errs.cvc = "3-digit CVC";
    if (!payment.name_on_card.trim()) errs.name_on_card = "Required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddressContinue = () => {
    if (validateAddress()) {
      setErrors({});
      setStep("shipping");
    }
  };

  const handlePaymentContinue = () => {
    if (validatePayment()) {
      setErrors({});
      setStep("review");
    }
  };

  const handlePlaceOrder = async () => {
    setIsPlacing(true);
    
    await new Promise((r) => setTimeout(r, 1800));
    const mockOrderId = `ORD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    setOrderId(mockOrderId);
    clearCart();
    setStep("confirmed");
    setIsPlacing(false);
  };

  const handleDiscount = () => {
    if (discountCode.trim().toUpperCase() === "HACKATHON10") {
      setDiscountApplied(true);
    }
  };

  const addr = (field: keyof AddressForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setAddress((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const pay = (field: keyof PaymentForm, formatter?: (v: string) => string) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = formatter ? formatter(e.target.value) : e.target.value;
      setPayment((prev) => ({ ...prev, [field]: val }));
      setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    };

  
  if (step === "confirmed") {
    return (
      <>
        <style>{css}</style>
        <div className="checkout-root">
          <div style={{ maxWidth: 520, width: "100%" }}>
            <div className="success-card">
              <div className="success-icon">✅</div>
              <div className="success-title">Order Confirmed!</div>
              <div className="success-subtitle">
                A confirmation email has been sent to
              </div>
              <div className="success-subtitle" style={{ color: "var(--accent)" }}>
                {email}
              </div>
              <div className="success-order-id">Order ID: {orderId}</div>
              <div className="success-continue">
                <button
                  className="btn btn-ghost"
                  onClick={() => window.location.reload()}
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="checkout-root">
        {/* Page title */}
        <div style={{ width: "100%", maxWidth: 960, marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>
            Checkout
          </h1>
        </div>

        <div className="checkout-inner">
          
          <div className="checkout-form-col">
            
            <div className="steps">
              {STEPS.map((s, i) => {
                const isDone = i < stepIdx;
                const isActive = s.key === step;
                return (
                  <span key={s.key} style={{ display: "flex", alignItems: "center" }}>
                    <span
                      className={`step-item${isActive ? " active" : ""}${isDone ? " done" : ""}`}
                      onClick={() => isDone && goTo(s.key)}
                    >
                      <span className="step-num">{isDone ? "✓" : i + 1}</span>
                      {s.label}
                    </span>
                    {i < STEPS.length - 1 && <span className="step-sep">›</span>}
                  </span>
                );
              })}
            </div>

            
            {step === "address" && (
              <div className="card">
                <div className="card-title">
                  <svg className="card-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  Shipping Address
                </div>
                <div className="field-grid">
                  <label>
                    <span className="label-text required">Email</span>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setErrors((p) => { const n = { ...p }; delete n.email; return n; }); }}
                      className={errors.email ? "error" : ""}
                    />
                    {errors.email && <span className="field-error">{errors.email}</span>}
                  </label>

                  <div className="field-grid field-grid-2">
                    <label>
                      <span className="label-text required">First name</span>
                      <input value={address.first_name} onChange={addr("first_name")} placeholder="Jane" className={errors.first_name ? "error" : ""} />
                      {errors.first_name && <span className="field-error">{errors.first_name}</span>}
                    </label>
                    <label>
                      <span className="label-text required">Last name</span>
                      <input value={address.last_name} onChange={addr("last_name")} placeholder="Doe" className={errors.last_name ? "error" : ""} />
                      {errors.last_name && <span className="field-error">{errors.last_name}</span>}
                    </label>
                  </div>

                  <label>
                    <span className="label-text required">Address</span>
                    <input value={address.address_1} onChange={addr("address_1")} placeholder="123 Main St" className={errors.address_1 ? "error" : ""} />
                    {errors.address_1 && <span className="field-error">{errors.address_1}</span>}
                  </label>
                  <label>
                    <span className="label-text">Apartment, suite, etc.</span>
                    <input value={address.address_2} onChange={addr("address_2")} placeholder="Apt 4B (optional)" />
                  </label>

                  <div className="field-grid field-grid-3">
                    <label>
                      <span className="label-text required">City</span>
                      <input value={address.city} onChange={addr("city")} placeholder="San Francisco" className={errors.city ? "error" : ""} />
                      {errors.city && <span className="field-error">{errors.city}</span>}
                    </label>
                    <label>
                      <span className="label-text required">State</span>
                      <input value={address.state} onChange={addr("state")} placeholder="CA" maxLength={2} className={errors.state ? "error" : ""} />
                      {errors.state && <span className="field-error">{errors.state}</span>}
                    </label>
                    <label>
                      <span className="label-text required">ZIP</span>
                      <input value={address.postal_code} onChange={addr("postal_code")} placeholder="94102" className={errors.postal_code ? "error" : ""} />
                      {errors.postal_code && <span className="field-error">{errors.postal_code}</span>}
                    </label>
                  </div>

                  <label>
                    <span className="label-text">Country</span>
                    <select value={address.country_code} onChange={addr("country_code")}>
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="GB">United Kingdom</option>
                      <option value="IN">India</option>
                      <option value="AU">Australia</option>
                    </select>
                  </label>

                  <label>
                    <span className="label-text">Phone (optional)</span>
                    <input type="tel" value={address.phone} onChange={addr("phone")} placeholder="+1 (555) 000-0000" />
                  </label>
                </div>

                <div style={{ marginTop: 24 }}>
                  <button className="btn btn-primary" onClick={handleAddressContinue}>
                    Continue to Shipping
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            
            {step === "shipping" && (
              <div className="card">
                <div className="card-title">
                  <svg className="card-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                  Shipping Method
                </div>
                <div className="ship-options">
                  {SHIPPING_OPTIONS.map((opt) => (
                    <div
                      key={opt.id}
                      className={`ship-option${shippingOption.id === opt.id ? " selected" : ""}`}
                      onClick={() => setShippingOption(opt)}
                    >
                      <div className="ship-option-left">
                        <div className="ship-radio">
                          {shippingOption.id === opt.id && <div className="ship-radio-dot" />}
                        </div>
                        <div>
                          <div className="ship-name">{opt.name}</div>
                          <div className="ship-days">{opt.days} business days</div>
                        </div>
                      </div>
                      <div className="ship-price">{fmt(opt.price)}</div>
                    </div>
                  ))}
                </div>
                <div className="section-nav" style={{ marginTop: 24 }}>
                  <button className="btn btn-ghost" onClick={() => setStep("address")} style={{ flex: 1 }}>
                    ← Back
                  </button>
                  <button className="btn btn-primary" onClick={() => setStep("payment")} style={{ flex: 2 }}>
                    Continue to Payment
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            
            {step === "payment" && (
              <div className="card">
                <div className="card-title">
                  <svg className="card-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                  Payment Details
                </div>
                <div className="field-grid">
                  <label>
                    <span className="label-text required">Card number</span>
                    <div className="card-number-wrap">
                      <input
                        value={payment.card_number}
                        onChange={pay("card_number", fmtCard)}
                        placeholder="4242 4242 4242 4242"
                        className={errors.card_number ? "error" : ""}
                        inputMode="numeric"
                      />
                      <span className="card-brand">VISA</span>
                    </div>
                    {errors.card_number && <span className="field-error">{errors.card_number}</span>}
                  </label>

                  <label>
                    <span className="label-text required">Name on card</span>
                    <input
                      value={payment.name_on_card}
                      onChange={pay("name_on_card")}
                      placeholder="Jane Doe"
                      className={errors.name_on_card ? "error" : ""}
                    />
                    {errors.name_on_card && <span className="field-error">{errors.name_on_card}</span>}
                  </label>

                  <div className="field-grid field-grid-2">
                    <label>
                      <span className="label-text required">Expiry</span>
                      <input
                        value={payment.expiry}
                        onChange={pay("expiry", fmtExpiry)}
                        placeholder="MM/YY"
                        maxLength={5}
                        inputMode="numeric"
                        className={errors.expiry ? "error" : ""}
                      />
                      {errors.expiry && <span className="field-error">{errors.expiry}</span>}
                    </label>
                    <label>
                      <span className="label-text required">CVC</span>
                      <input
                        value={payment.cvc}
                        onChange={pay("cvc")}
                        placeholder="123"
                        maxLength={4}
                        inputMode="numeric"
                        className={errors.cvc ? "error" : ""}
                      />
                      {errors.cvc && <span className="field-error">{errors.cvc}</span>}
                    </label>
                  </div>
                </div>

                <div className="security-note">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  Payments are encrypted & secure
                </div>

                <div className="section-nav" style={{ marginTop: 20 }}>
                  <button className="btn btn-ghost" onClick={() => setStep("shipping")} style={{ flex: 1 }}>
                    ← Back
                  </button>
                  <button className="btn btn-primary" onClick={handlePaymentContinue} style={{ flex: 2 }}>
                    Review Order
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 4: Review ── */}
            {step === "review" && (
              <div className="card">
                <div className="card-title">
                  <svg className="card-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  Review Your Order
                </div>

                <div className="review-items">
                  {(items as any[]).map((item) => (
                    <div className="review-item" key={item.id}>
                      {item.thumbnail && (
                        <img src={item.thumbnail} alt={item.title} />
                      )}
                      <div className="review-item-info">
                        <div className="review-item-title">{item.title}</div>
                        <div className="review-item-meta">
                          Qty {item.quantity} × ${(item.price / 100).toFixed(2)}
                        </div>
                      </div>
                      <div className="review-item-price">
                        ${(((item.price ?? 0) * item.quantity) / 100).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div className="review-section">
                    <div className="review-section-label">Shipping to</div>
                    <div className="review-info">
                      {address.first_name} {address.last_name}<br />
                      {address.address_1}{address.address_2 ? `, ${address.address_2}` : ""}<br />
                      {address.city}, {address.state} {address.postal_code}<br />
                      {address.country_code}
                    </div>
                  </div>
                  <div className="review-section">
                    <div className="review-section-label">Shipping method</div>
                    <div className="review-info">
                      {shippingOption.name}<br />
                      {fmt(shippingOption.price)} · {shippingOption.days} days
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <div className="review-section-label">Payment</div>
                      <div className="review-info">
                        •••• {payment.card_number.replace(/\s/g, "").slice(-4)}<br />
                        {payment.name_on_card}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="section-nav" style={{ marginTop: 24 }}>
                  <button className="btn btn-ghost" onClick={() => setStep("payment")} style={{ flex: 1 }}>
                    ← Back
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handlePlaceOrder}
                    disabled={isPlacing || (items as any[]).length === 0}
                    style={{ flex: 2 }}
                  >
                    {isPlacing ? (
                      <><div className="spinner" /> Placing order…</>
                    ) : (
                      <>
                        Place Order · {fmt(grandTotal)}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Right: order summary ── */}
          <div className="order-summary">
            <div className="summary-title">Order Summary</div>

            <div className="summary-items">
              {(items as any[]).map((item) => (
                <div className="summary-item" key={item.id}>
                  {item.thumbnail && (
                    <img src={item.thumbnail} alt={item.title} />
                  )}
                  <div className="summary-item-name">
                    {item.title}
                    <div className="summary-item-qty">×{item.quantity}</div>
                  </div>
                  <div className="summary-item-price">
                    ${(((item.price ?? 0) * item.quantity) / 100).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <hr className="summary-divider" />

            {/* Discount */}
            {!discountApplied ? (
              <div className="discount-row">
                <input
                  className="discount-input"
                  placeholder="Discount code"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleDiscount()}
                />
                <button
                  className="btn btn-ghost"
                  style={{ padding: "9px 14px", fontSize: 12 }}
                  onClick={handleDiscount}
                >
                  Apply
                </button>
              </div>
            ) : (
              <div className="discount-applied">
                ✓ HACKATHON10 applied — 10% off
              </div>
            )}

            <hr className="summary-divider" />

            <div className="summary-row">
              <span className="summary-row-label">Subtotal</span>
              <span className="summary-row-val">{fmt(subtotal)}</span>
            </div>
            {discountApplied && (
              <div className="summary-row" style={{ color: "var(--green)" }}>
                <span className="summary-row-label" style={{ color: "var(--green)" }}>Discount</span>
                <span>−{fmt(discountAmt)}</span>
              </div>
            )}
            <div className="summary-row">
              <span className="summary-row-label">Shipping</span>
              <span className="summary-row-val">{fmt(shipping)}</span>
            </div>
            <div className="summary-row">
              <span className="summary-row-label">Tax (8%)</span>
              <span className="summary-row-val">{fmt(tax)}</span>
            </div>

            <hr className="summary-divider" />

            <div className="summary-row summary-row-total">
              <span className="summary-row-label">Total</span>
              <span className="summary-row-val">{fmt(grandTotal)}</span>
            </div>

            <div className="security-note" style={{ marginTop: 16 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Protected by 256-bit SSL encryption
            </div>
          </div>
        </div>
      </div>
    </>
  );
}