import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ordersAPI } from '../services/api';
import Navbar from '../components/Navbar';

const STATUS_CONFIG = {
  ready_for_ship: { label: 'Ready for Pickup', bg: '#dbeafe', color: '#1e40af', accent: '#3b82f6' },
  picked_up:      { label: 'Picked Up',        bg: '#ede9fe', color: '#4c1d95', accent: '#8b5cf6' },
  on_the_way:     { label: 'On the Way',        bg: '#cffafe', color: '#0e7490', accent: '#06b6d4' },
  delivered:      { label: 'Delivered',         bg: '#d1fae5', color: '#065f46', accent: '#10b981' },
  cancelled:      { label: 'Cancelled',         bg: '#fee2e2', color: '#7f1d1d', accent: '#ef4444' },
  pending:        { label: 'Pending',           bg: '#fef3c7', color: '#92400e', accent: '#f59e0b' },
};

const getStatusCfg = (raw) => {
  const key = (raw || 'pending').toLowerCase().replace(/\s+/g, '_');
  return STATUS_CONFIG[key] || { label: raw, bg: '#f3f4f6', color: '#374151', accent: '#9ca3af' };
};

const RiderOrders = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [flashMessages, setFlashMessages] = useState([]);
  const [deliveryProofs, setDeliveryProofs] = useState({});
  const [loadError, setLoadError] = useState(null);

  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const res = await ordersAPI.getRiderOrders();
      setOrders(res.data?.orders || []);
    } catch (error) {
      console.error('[RiderOrders] Failed to load orders:', error?.response?.data || error.message);
      const msg = error?.response?.data?.error || error?.response?.data?.message || 'Failed to load orders';
      setLoadError(msg);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (user && user.role === 'rider') {
      loadOrders();
    } else {
      navigate('/');
    }
  }, [user, navigate, authLoading, loadOrders]);

  const updateOrderStatus = async (orderId, status, proofFile = null) => {
    if (status === 'delivered' && !proofFile) {
      setFlashMessages([{ category: 'error', text: 'Please upload a delivery proof photo first.' }]);
      return;
    }
    try {
      let payload = { status };
      if (proofFile) {
        const formData = new FormData();
        formData.append('status', status);
        formData.append('delivery_proof', proofFile);
        payload = formData;
      }
      const res = await ordersAPI.updateRiderOrderStatus(orderId, payload);
      const data = res.data || {};
      if (data.success) {
        setFlashMessages([{ category: 'success', text: `Order marked as ${status.replace(/_/g, ' ')} successfully!` }]);
        setDeliveryProofs(prev => {
          const next = { ...prev };
          delete next[orderId];
          return next;
        });
        loadOrders();
      } else {
        setFlashMessages([{ category: 'error', text: data.message || 'Failed to update order status' }]);
      }
    } catch (error) {
      setFlashMessages([{ category: 'error', text: 'Failed to update order status' }]);
    }
  };

  const handleProofChange = (orderId, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setDeliveryProofs(prev => ({ ...prev, [orderId]: file }));
  };

  const pendingCount   = orders.filter(o => !['delivered','cancelled'].includes((o.delivery_status || o.status || '').toLowerCase())).length;
  const deliveredCount = orders.filter(o => (o.delivery_status || o.status || '').toLowerCase() === 'delivered').length;

  return (
    <div className="ro-page">
      <Navbar activePage="rider-orders" />

      {/* Hero banner */}
      <div className="ro-hero">
        <div className="ro-hero-inner">
          <div className="ro-hero-text">
            <h1><i className="fas fa-motorcycle"></i> Assigned Orders</h1>
            <p>Manage your deliveries — pick up, update status, and upload proof.</p>
          </div>
          <div className="ro-hero-stats">
            <div className="ro-stat">
              <div className="ro-stat-val">{orders.length}</div>
              <div className="ro-stat-lbl">Total</div>
            </div>
            <div className="ro-stat">
              <div className="ro-stat-val">{pendingCount}</div>
              <div className="ro-stat-lbl">In Progress</div>
            </div>
            <div className="ro-stat">
              <div className="ro-stat-val">{deliveredCount}</div>
              <div className="ro-stat-lbl">Delivered</div>
            </div>
          </div>
        </div>
      </div>

      <div className="ro-body">
        {/* Flash messages */}
        {flashMessages.length > 0 && (
          <div className="ro-flashes">
            {flashMessages.map((msg, i) => (
              <div key={i} className={`ro-flash ro-flash--${msg.category}`}>
                <i className={`fas ${msg.category === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                {msg.text}
                <button className="ro-flash-close" onClick={() => setFlashMessages(prev => prev.filter((_, idx) => idx !== i))}>×</button>
              </div>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="ro-loading">
            <i className="fas fa-spinner fa-spin"></i> Loading orders…
          </div>
        ) : loadError ? (
          <div className="ro-empty">
            <i className="fas fa-exclamation-triangle" style={{ color: '#f59e0b' }}></i>
            <h3>Could not load orders</h3>
            <p style={{ marginBottom: 12 }}>{loadError}</p>
            <button className="ro-btn ro-btn--primary" onClick={loadOrders}>
              <i className="fas fa-redo"></i> Retry
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="ro-empty">
            <i className="fas fa-motorcycle"></i>
            <h3>No assigned orders yet</h3>
            <p>Orders assigned to you will appear here.</p>
          </div>
        ) : (
          <div className="ro-grid">
            {orders.map((order) => {
              const statusValue = (order.delivery_status || order.status || 'pending').toLowerCase();
              const cfg = getStatusCfg(statusValue);
              const proof = deliveryProofs[order.id];
              return (
                <article key={order.id} className="ro-card" style={{ borderLeftColor: cfg.accent }}>
                  {/* Card header */}
                  <div className="ro-card-head">
                    <div className="ro-card-id">
                      <span className="ro-order-num">#{order.order_number || order.id.substring(0, 8).toUpperCase()}</span>
                      <span className="ro-order-date">
                        {order.created_at
                          ? new Date(order.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
                          : ''}
                      </span>
                    </div>
                    <div className="ro-card-right">
                      <span className="ro-badge" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                      <span className="ro-total">₱{(order.total_amount || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="ro-meta-grid">
                    <div className="ro-meta-item">
                      <span className="ro-meta-lbl"><i className="fas fa-user"></i> Buyer</span>
                      <span className="ro-meta-val">{order.buyer_name || 'Customer'}</span>
                    </div>
                    {order.buyer_phone && (
                      <div className="ro-meta-item">
                        <span className="ro-meta-lbl"><i className="fas fa-phone"></i> Buyer Phone</span>
                        <span className="ro-meta-val">{order.buyer_phone}</span>
                      </div>
                    )}
                    {order.shipping_name && (
                      <div className="ro-meta-item">
                        <span className="ro-meta-lbl"><i className="fas fa-user-tag"></i> Recipient</span>
                        <span className="ro-meta-val">{order.shipping_name}</span>
                      </div>
                    )}
                    {order.shipping_phone && (
                      <div className="ro-meta-item">
                        <span className="ro-meta-lbl"><i className="fas fa-phone-alt"></i> Recipient Phone</span>
                        <span className="ro-meta-val">{order.shipping_phone}</span>
                      </div>
                    )}
                    {(order.shipping_address || order.delivery_address) && (
                      <div className="ro-meta-item ro-meta-item--full">
                        <span className="ro-meta-lbl"><i className="fas fa-map-marker-alt"></i> Address</span>
                        <span className="ro-meta-val">{[order.shipping_address || order.delivery_address, order.overall_location].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                    {order.delivery_notes && (
                      <div className="ro-meta-item ro-meta-item--full">
                        <span className="ro-meta-lbl"><i className="fas fa-sticky-note"></i> Notes</span>
                        <span className="ro-meta-val">{order.delivery_notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Items */}
                  {order.items && order.items.length > 0 && (
                    <div className="ro-items">
                      <div className="ro-items-title"><i className="fas fa-box-open"></i> Items</div>
                      <ul className="ro-items-list">
                        {order.items.map((item, idx) => (
                          <li key={idx}>
                            <span>{item.name || 'Item'}</span>
                            <span className="ro-item-qty">×{item.quantity || 1}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Proof image (already uploaded) */}
                  {order.delivery_proof_url && (
                    <div className="ro-proof-existing">
                      <a href={order.delivery_proof_url} target="_blank" rel="noreferrer" className="ro-proof-link">
                        <i className="fas fa-image"></i> View Delivery Proof
                      </a>
                    </div>
                  )}

                  {/* Action area */}
                  <div className="ro-actions">
                    {statusValue === 'ready_for_ship' && (
                      <button className="ro-btn ro-btn--primary" onClick={() => updateOrderStatus(order.id, 'picked_up')}>
                        <i className="fas fa-hand-paper"></i> Mark Picked Up
                      </button>
                    )}
                    {statusValue === 'picked_up' && (
                      <button className="ro-btn ro-btn--primary" onClick={() => updateOrderStatus(order.id, 'on_the_way')}>
                        <i className="fas fa-route"></i> Mark On the Way
                      </button>
                    )}
                    {statusValue === 'on_the_way' && (
                      <div className="ro-proof-section">
                        <label className="ro-proof-label">
                          <i className="fas fa-camera"></i> Delivery Proof Photo
                        </label>
                        <label className="ro-file-btn">
                          <i className="fas fa-upload"></i>
                          {proof ? proof.name : 'Choose photo'}
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => handleProofChange(order.id, e)}
                          />
                        </label>
                        <button
                          className="ro-btn ro-btn--success"
                          onClick={() => updateOrderStatus(order.id, 'delivered', proof)}
                          disabled={!proof}
                        >
                          <i className="fas fa-check-circle"></i> Mark Delivered
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .ro-page {
          min-height: 100vh;
          background: radial-gradient(circle at top left, #e8f5e9 0%, #f4f6f9 45%, #fefcfb 100%);
          font-family: "Space Grotesk", "Segoe UI", sans-serif;
          display: flex;
          flex-direction: column;
        }

        /* Hero */
        .ro-hero {
          background: linear-gradient(135deg, #1a5f1a 0%, #2c7a2c 60%, #38a03a 100%);
          padding: 32px 0 28px;
          color: #fff;
        }
        .ro-hero-inner {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
        }
        .ro-hero-text h1 {
          margin: 0 0 6px;
          font-size: 1.75rem;
          font-weight: 800;
          color: #fff;
        }
        .ro-hero-text p {
          margin: 0;
          font-size: 0.95rem;
          color: rgba(255,255,255,0.82);
        }
        .ro-hero-stats {
          display: flex;
          gap: 18px;
        }
        .ro-stat {
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 12px;
          padding: 12px 20px;
          text-align: center;
          min-width: 72px;
        }
        .ro-stat-val {
          font-size: 1.6rem;
          font-weight: 800;
          color: #fff;
          line-height: 1;
        }
        .ro-stat-lbl {
          font-size: 0.72rem;
          color: rgba(255,255,255,0.75);
          margin-top: 4px;
          text-transform: uppercase;
          letter-spacing: .06em;
        }

        /* Body */
        .ro-body {
          max-width: 1100px;
          margin: 0 auto;
          padding: 28px 24px 60px;
          width: 100%;
          box-sizing: border-box;
        }

        /* Flash messages */
        .ro-flashes { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
        .ro-flash {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 500;
        }
        .ro-flash--success { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
        .ro-flash--error   { background: #fee2e2; color: #7f1d1d; border: 1px solid #fca5a5; }
        .ro-flash-close {
          margin-left: auto;
          background: transparent;
          border: none;
          font-size: 1.1rem;
          cursor: pointer;
          color: inherit;
          opacity: 0.6;
          line-height: 1;
        }
        .ro-flash-close:hover { opacity: 1; }

        /* Loading */
        .ro-loading {
          text-align: center;
          padding: 60px 20px;
          color: #64748b;
          font-size: 1rem;
        }
        .ro-loading i { margin-right: 8px; color: #2c7a2c; }

        /* Empty state */
        .ro-empty {
          text-align: center;
          padding: 80px 20px;
          color: #94a3b8;
        }
        .ro-empty i { font-size: 3.5rem; margin-bottom: 16px; display: block; }
        .ro-empty h3 { font-size: 1.3rem; color: #475569; margin: 0 0 8px; }
        .ro-empty p  { margin: 0; font-size: 0.9rem; }

        /* Orders grid */
        .ro-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 18px;
        }

        /* Order card */
        .ro-card {
          background: #fff;
          border-radius: 16px;
          padding: 0;
          border-left: 5px solid #2c7a2c;
          box-shadow: 0 4px 20px rgba(15,23,42,0.07);
          overflow: hidden;
          transition: box-shadow 0.2s, transform 0.15s;
        }
        .ro-card:hover {
          box-shadow: 0 8px 32px rgba(15,23,42,0.10);
          transform: translateY(-2px);
        }

        /* Card header */
        .ro-card-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 16px 18px 12px;
          border-bottom: 1px solid #f1f5f9;
          gap: 10px;
        }
        .ro-card-id { display: flex; flex-direction: column; gap: 3px; }
        .ro-order-num {
          font-weight: 800;
          font-size: 0.95rem;
          color: #0f172a;
          font-family: monospace;
          letter-spacing: .04em;
        }
        .ro-order-date { font-size: 0.76rem; color: #94a3b8; }
        .ro-card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
        .ro-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 0.73rem;
          font-weight: 700;
          letter-spacing: .04em;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .ro-total {
          font-weight: 800;
          font-size: 1rem;
          color: #111827;
        }

        /* Meta grid */
        .ro-meta-grid {
          padding: 14px 18px 0;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px 16px;
        }
        .ro-meta-item { display: flex; flex-direction: column; gap: 2px; }
        .ro-meta-item--full { grid-column: 1 / -1; }
        .ro-meta-lbl {
          font-size: 0.72rem;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: .05em;
          font-weight: 600;
        }
        .ro-meta-lbl i { margin-right: 4px; }
        .ro-meta-val {
          font-size: 0.88rem;
          color: #1e293b;
          font-weight: 500;
          word-break: break-word;
        }

        /* Items */
        .ro-items {
          margin: 14px 18px 0;
          background: #f8fafc;
          border-radius: 10px;
          padding: 10px 12px;
        }
        .ro-items-title {
          font-size: 0.75rem;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: .05em;
          margin-bottom: 8px;
        }
        .ro-items-title i { margin-right: 5px; color: #2c7a2c; }
        .ro-items-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .ro-items-list li {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          color: #374151;
          padding: 3px 0;
          border-bottom: 1px solid #edf2f7;
        }
        .ro-items-list li:last-child { border-bottom: none; }
        .ro-item-qty {
          font-weight: 700;
          color: #6b7280;
        }

        /* Existing proof link */
        .ro-proof-existing {
          margin: 12px 18px 0;
        }
        .ro-proof-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          color: #0369a1;
          font-weight: 600;
          text-decoration: none;
        }
        .ro-proof-link:hover { text-decoration: underline; }

        /* Action bar */
        .ro-actions {
          padding: 14px 18px 16px;
          border-top: 1px solid #f1f5f9;
          margin-top: 14px;
        }
        .ro-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 18px;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: background 0.15s, opacity 0.15s, transform 0.1s;
          font-family: inherit;
        }
        .ro-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .ro-btn--primary {
          background: #2c7a2c;
          color: #fff;
        }
        .ro-btn--primary:hover:not(:disabled) { background: #1a5c1a; transform: translateY(-1px); }
        .ro-btn--success {
          background: #059669;
          color: #fff;
        }
        .ro-btn--success:hover:not(:disabled) { background: #047857; transform: translateY(-1px); }

        /* Proof upload section */
        .ro-proof-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .ro-proof-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: .04em;
        }
        .ro-proof-label i { margin-right: 5px; color: #2c7a2c; }
        .ro-file-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 8px;
          background: #f1f5f9;
          border: 1.5px dashed #94a3b8;
          color: #475569;
          font-size: 0.84rem;
          font-weight: 600;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
          font-family: inherit;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ro-file-btn:hover { border-color: #2c7a2c; background: #f0fdf4; color: #2c7a2c; }
        .ro-file-btn i { flex-shrink: 0; }

        @media (max-width: 640px) {
          .ro-hero-inner { flex-direction: column; align-items: flex-start; }
          .ro-hero-stats { width: 100%; }
          .ro-stat { flex: 1; }
          .ro-grid { grid-template-columns: 1fr; }
          .ro-meta-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default RiderOrders;
