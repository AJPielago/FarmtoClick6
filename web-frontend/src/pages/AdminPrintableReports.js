import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import html2pdf from 'html2pdf.js';

const AdminPrintableReports = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const printRef = useRef();

  const [stats, setStats] = useState({
    totalProducts: 0,
    totalFarmers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingVerifications: 0,
    activeRiders: 0,
    totalRiders: 0,
  });
  const [reports, setReports] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reportDays, setReportDays] = useState(30);
  const [recentOrders, setRecentOrders] = useState([]);
  const [selectedSections, setSelectedSections] = useState({
    kpi: true,
    revenueTimeline: true,
    orderStatus: true,
    paymentMethods: true,
    monthlyData: true,
    topProducts: true,
    farmerPerformance: true,
    recentOrders: true,
  });

  useEffect(() => {
    if (authLoading) return;
    if (user && user.is_admin) {
      loadDashboardStats();
      loadReports(reportDays);
    } else {
      navigate('/');
    }
  }, [user, navigate, authLoading]);

  useEffect(() => {
    if (authLoading) return;
    if (user && user.is_admin) {
      loadReports(reportDays);
    }
  }, [reportDays, user, authLoading]);

  const loadDashboardStats = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('userToken');
      const headers = { 'Authorization': token ? `Bearer ${token}` : '' };

      const [productsRes, farmersRes, ordersRes, verificationsRes, ridersRes] = await Promise.all([
        fetch('http://localhost:5001/api/admin/products', { headers, credentials: 'include' }),
        fetch('http://localhost:5001/api/admin/farmers', { headers, credentials: 'include' }),
        fetch('http://localhost:5001/api/admin/orders', { headers, credentials: 'include' }),
        fetch('http://localhost:5001/api/admin/verifications', { headers, credentials: 'include' }),
        fetch('http://localhost:5001/api/admin/riders', { headers, credentials: 'include' }),
      ]);

      let totalProducts = 0, totalFarmers = 0, totalOrders = 0, totalRevenue = 0, pendingVerifications = 0, activeRiders = 0, totalRiders = 0;

      if (productsRes.ok) {
        const data = await productsRes.json();
        totalProducts = (data.products || []).length;
      }
      if (farmersRes.ok) {
        const data = await farmersRes.json();
        totalFarmers = (data.farmers || []).length;
      }
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        const orders = data.orders || [];
        totalOrders = orders.length;
        totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.total) || parseFloat(o.total_amount) || 0), 0);
        setRecentOrders(orders.slice(0, 10));
      }
      if (verificationsRes.ok) {
        const data = await verificationsRes.json();
        if (data.stats) {
          pendingVerifications = Math.max(0, (data.stats.total || 0) - (data.stats.verified || 0) - (data.stats.rejected || 0));
        }
      }
      if (ridersRes.ok) {
        const data = await ridersRes.json();
        activeRiders = data.active_count || 0;
        totalRiders = data.total_count || 0;
      }

      setStats({ totalProducts, totalFarmers, totalOrders, totalRevenue, pendingVerifications, activeRiders, totalRiders });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadReports = async (days) => {
    try {
      const token = localStorage.getItem('userToken');
      const res = await fetch(`http://localhost:5001/api/admin/reports?days=${days}`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSavePDF = () => {
    const element = printRef.current;
    if (!element) return;
    setIsSaving(true);
    const periodLabel = `${reportDays}d`;
    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename = `FarmToClick_Report_${periodLabel}_${dateStamp}.pdf`;

    const opt = {
      margin: [10, 8, 10, 8],
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };

    html2pdf().set(opt).from(element).save().then(() => {
      setIsSaving(false);
    }).catch(() => {
      setIsSaving(false);
    });
  };

  const toggleSection = (key) => {
    setSelectedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAll = (val) => {
    const updated = {};
    Object.keys(selectedSections).forEach(k => { updated[k] = val; });
    setSelectedSections(updated);
  };

  if (!user || !user.is_admin) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>You don't have permission to access this page.</p>
        <Link to="/" className="btn btn-primary">Go Home</Link>
      </div>
    );
  }

  const kpis = reports?.kpis || {};
  const assumedMarginPct = kpis.assumed_margin_pct ?? 15;
  const totalRevenueForCalc = (kpis.total_revenue !== undefined && kpis.total_revenue !== null) ? kpis.total_revenue : stats.totalRevenue;
  const estimatedProfit = Number(totalRevenueForCalc) * (Number(assumedMarginPct) / 100);
  const completionRate = stats.totalOrders > 0 ? (((kpis.completed_orders || 0) / stats.totalOrders) * 100).toFixed(1) : '0.0';
  const inProgress = stats.totalOrders - (kpis.completed_orders || 0) - (kpis.cancelled_orders || 0);

  const generatedDate = new Date().toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit'
  });

  const sectionLabels = {
    kpi: 'Key Performance Indicators',
    revenueTimeline: 'Daily Revenue & Orders',
    orderStatus: 'Order Status Breakdown',
    paymentMethods: 'Payment Methods',
    monthlyData: 'Monthly Revenue & Orders',
    topProducts: 'Top Products Performance',
    farmerPerformance: 'Farmer Performance',
    recentOrders: 'Recent Orders',
  };

  return (
    <div className="printable-reports-page">
      <Navbar />

      {/* Controls - hidden when printing */}
      <div className="print-controls no-print">
        <div className="controls-container">
          <div className="controls-header">
            <Link to="/admin-dashboard" className="back-link">
              <i className="fas fa-arrow-left"></i> Back to Dashboard
            </Link>
            <h2><i className="fas fa-file-pdf"></i> Printable Reports</h2>
          </div>

          <div className="controls-row">
            <div className="control-group">
              <label>Report Period:</label>
              <div className="period-btns">
                {[7, 14, 30, 60, 90].map(d => (
                  <button
                    key={d}
                    className={`period-btn ${reportDays === d ? 'active' : ''}`}
                    onClick={() => setReportDays(d)}
                  >
                    {d} Days
                  </button>
                ))}
              </div>
            </div>

            <div className="control-group">
              <label>Sections to Include:</label>
              <div className="section-toggles">
                <button className="toggle-all-btn" onClick={() => toggleAll(true)}>Select All</button>
                <button className="toggle-all-btn" onClick={() => toggleAll(false)}>Deselect All</button>
              </div>
              <div className="section-checkboxes">
                {Object.entries(sectionLabels).map(([key, label]) => (
                  <label key={key} className="section-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedSections[key]}
                      onChange={() => toggleSection(key)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button className="print-btn" onClick={handleSavePDF} disabled={isLoading || isSaving}>
            {isSaving ? (
              <><i className="fas fa-spinner fa-spin"></i> Generating PDF...</>
            ) : (
              <><i className="fas fa-download"></i> Save as PDF</>
            )}
          </button>
        </div>
      </div>

      {/* Printable Content */}
      <div className="print-content" ref={printRef}>
        {isLoading ? (
          <div className="loading-spinner no-print">
            <i className="fas fa-spinner fa-spin"></i> Loading report data...
          </div>
        ) : (
          <>
            {/* Report Header */}
            <div className="report-header">
              <div className="report-logo">
                <i className="fas fa-leaf" style={{ fontSize: '2rem', color: '#2c7a2c' }}></i>
                <h1>FarmToClick</h1>
              </div>
              <h2 className="report-title">E-Commerce Analytics Report</h2>
              <div className="report-meta">
                <span>Period: Last {reportDays} Days</span>
                <span className="report-meta-sep">|</span>
                <span>Generated: {generatedDate}</span>
              </div>
            </div>

            {/* KPI Summary */}
            {selectedSections.kpi && (
              <div className="report-section">
                <h3 className="section-title"><span className="section-num">1</span> Key Performance Indicators</h3>
                <table className="print-table kpi-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Value</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Total Revenue</strong></td>
                      <td className="text-right">{formatCurrency(stats.totalRevenue)}</td>
                      <td>{kpis.revenue_growth_pct !== undefined && kpis.revenue_growth_pct !== 0
                        ? `${kpis.revenue_growth_pct > 0 ? '+' : ''}${kpis.revenue_growth_pct}% vs previous period`
                        : 'No change vs previous period'}</td>
                    </tr>
                    <tr>
                      <td><strong>Estimated Profit</strong></td>
                      <td className="text-right">{formatCurrency(estimatedProfit)}</td>
                      <td>Assumed margin: {assumedMarginPct}%</td>
                    </tr>
                    <tr>
                      <td><strong>Total Orders</strong></td>
                      <td className="text-right">{stats.totalOrders}</td>
                      <td>Avg order value: {formatCurrency(kpis.avg_order_value)}</td>
                    </tr>
                    <tr>
                      <td><strong>Completed Orders</strong></td>
                      <td className="text-right">{kpis.completed_orders || 0}</td>
                      <td>{kpis.cancelled_orders || 0} cancelled</td>
                    </tr>
                    <tr>
                      <td><strong>Completion Rate</strong></td>
                      <td className="text-right">{completionRate}%</td>
                      <td>{inProgress} orders in progress</td>
                    </tr>
                    <tr>
                      <td><strong>Active Farmers</strong></td>
                      <td className="text-right">{stats.totalFarmers}</td>
                      <td>{stats.totalProducts} products listed</td>
                    </tr>
                    <tr>
                      <td><strong>Active Riders</strong></td>
                      <td className="text-right">{stats.activeRiders}</td>
                      <td>{stats.totalRiders} total riders</td>
                    </tr>
                    <tr>
                      <td><strong>Pending Verifications</strong></td>
                      <td className="text-right">{stats.pendingVerifications}</td>
                      <td>Awaiting admin review</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Daily Revenue & Orders Timeline */}
            {selectedSections.revenueTimeline && reports?.revenue_timeline && (
              <div className="report-section">
                <h3 className="section-title"><span className="section-num">2</span> Daily Revenue & Orders (Last {reportDays} Days)</h3>
                <table className="print-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th className="text-right">Revenue</th>
                      <th className="text-right">Orders</th>
                      <th className="text-right">Avg Per Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.revenue_timeline.map((d, i) => (
                      <tr key={i} className={d.revenue > 0 ? '' : 'zero-row'}>
                        <td>{formatDate(d.date)}</td>
                        <td className="text-right">{formatCurrency(d.revenue)}</td>
                        <td className="text-right">{d.orders}</td>
                        <td className="text-right">{d.orders > 0 ? formatCurrency(d.revenue / d.orders) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="totals-row">
                      <td><strong>Total</strong></td>
                      <td className="text-right"><strong>{formatCurrency(reports.revenue_timeline.reduce((s, d) => s + (d.revenue || 0), 0))}</strong></td>
                      <td className="text-right"><strong>{reports.revenue_timeline.reduce((s, d) => s + (d.orders || 0), 0)}</strong></td>
                      <td className="text-right"><strong>{
                        (() => {
                          const totalRev = reports.revenue_timeline.reduce((s, d) => s + (d.revenue || 0), 0);
                          const totalOrd = reports.revenue_timeline.reduce((s, d) => s + (d.orders || 0), 0);
                          return totalOrd > 0 ? formatCurrency(totalRev / totalOrd) : '—';
                        })()
                      }</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Order Status Breakdown */}
            {selectedSections.orderStatus && reports?.order_status && (
              <div className="report-section">
                <h3 className="section-title"><span className="section-num">3</span> Order Status Breakdown</h3>
                <table className="print-table compact-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th className="text-right">Count</th>
                      <th className="text-right">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.order_status.map((s, i) => {
                      const total = reports.order_status.reduce((sum, x) => sum + x.count, 0);
                      return (
                        <tr key={i}>
                          <td style={{ textTransform: 'capitalize' }}>
                            <span className={`status-dot status-${s.status}`}></span>
                            {s.status}
                          </td>
                          <td className="text-right">{s.count}</td>
                          <td className="text-right">{total > 0 ? ((s.count / total) * 100).toFixed(1) : '0.0'}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="totals-row">
                      <td><strong>Total</strong></td>
                      <td className="text-right"><strong>{reports.order_status.reduce((s, x) => s + x.count, 0)}</strong></td>
                      <td className="text-right"><strong>100%</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Payment Methods */}
            {selectedSections.paymentMethods && reports?.payment_breakdown && reports.payment_breakdown.length > 0 && (
              <div className="report-section">
                <h3 className="section-title"><span className="section-num">4</span> Payment Methods Breakdown</h3>
                <table className="print-table compact-table">
                  <thead>
                    <tr>
                      <th>Payment Method</th>
                      <th className="text-right">Revenue</th>
                      <th className="text-right">Transactions</th>
                      <th className="text-right">% of Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.payment_breakdown.map((p, i) => {
                      const totalRev = reports.payment_breakdown.reduce((s, x) => s + (x.revenue || 0), 0);
                      return (
                        <tr key={i}>
                          <td style={{ textTransform: 'capitalize' }}>{p.method}</td>
                          <td className="text-right">{formatCurrency(p.revenue)}</td>
                          <td className="text-right">{p.count}</td>
                          <td className="text-right">{totalRev > 0 ? ((p.revenue / totalRev) * 100).toFixed(1) : '0.0'}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="totals-row">
                      <td><strong>Total</strong></td>
                      <td className="text-right"><strong>{formatCurrency(reports.payment_breakdown.reduce((s, x) => s + (x.revenue || 0), 0))}</strong></td>
                      <td className="text-right"><strong>{reports.payment_breakdown.reduce((s, x) => s + (x.count || 0), 0)}</strong></td>
                      <td className="text-right"><strong>100%</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Monthly Revenue & Orders */}
            {selectedSections.monthlyData && reports?.monthly_data && (
              <div className="report-section">
                <h3 className="section-title"><span className="section-num">5</span> Monthly Revenue & Orders (Last 6 Months)</h3>
                <table className="print-table compact-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th className="text-right">Revenue</th>
                      <th className="text-right">Orders</th>
                      <th className="text-right">Avg Per Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.monthly_data.map((m, i) => (
                      <tr key={i}>
                        <td>{m.month}</td>
                        <td className="text-right">{formatCurrency(m.revenue)}</td>
                        <td className="text-right">{m.orders}</td>
                        <td className="text-right">{m.orders > 0 ? formatCurrency(m.revenue / m.orders) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="totals-row">
                      <td><strong>Total</strong></td>
                      <td className="text-right"><strong>{formatCurrency(reports.monthly_data.reduce((s, m) => s + (m.revenue || 0), 0))}</strong></td>
                      <td className="text-right"><strong>{reports.monthly_data.reduce((s, m) => s + (m.orders || 0), 0)}</strong></td>
                      <td className="text-right"><strong>{
                        (() => {
                          const tr = reports.monthly_data.reduce((s, m) => s + (m.revenue || 0), 0);
                          const to = reports.monthly_data.reduce((s, m) => s + (m.orders || 0), 0);
                          return to > 0 ? formatCurrency(tr / to) : '—';
                        })()
                      }</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Top Products */}
            {selectedSections.topProducts && reports?.top_products && (
              <div className="report-section">
                <h3 className="section-title"><span className="section-num">6</span> Top Products Performance</h3>
                <table className="print-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Product Name</th>
                      <th className="text-right">Revenue</th>
                      <th className="text-right">Units Sold</th>
                      <th className="text-right">Avg Price/Unit</th>
                      <th className="text-right">% of Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.top_products.map((p, i) => {
                      const totalProdRev = reports.top_products.reduce((s, x) => s + (x.revenue || 0), 0);
                      return (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{p.name}</td>
                          <td className="text-right">{formatCurrency(p.revenue)}</td>
                          <td className="text-right">{p.quantity_sold}</td>
                          <td className="text-right">{p.quantity_sold > 0 ? formatCurrency(p.revenue / p.quantity_sold) : '—'}</td>
                          <td className="text-right">{totalProdRev > 0 ? ((p.revenue / totalProdRev) * 100).toFixed(1) : '0.0'}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="totals-row">
                      <td colSpan="2"><strong>Total (Top {reports.top_products.length})</strong></td>
                      <td className="text-right"><strong>{formatCurrency(reports.top_products.reduce((s, p) => s + (p.revenue || 0), 0))}</strong></td>
                      <td className="text-right"><strong>{reports.top_products.reduce((s, p) => s + (p.quantity_sold || 0), 0)}</strong></td>
                      <td className="text-right">—</td>
                      <td className="text-right"><strong>100%</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Farmer Performance */}
            {selectedSections.farmerPerformance && reports?.top_farmers && reports.top_farmers.length > 0 && (
              <div className="report-section">
                <h3 className="section-title"><span className="section-num">7</span> Farmer Revenue Performance</h3>
                <table className="print-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Farmer Name</th>
                      <th className="text-right">Revenue Generated</th>
                      <th className="text-right">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.top_farmers.map((f, i) => {
                      const totalFarmerRev = reports.top_farmers.reduce((s, x) => s + (x.revenue || 0), 0);
                      return (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{f.name}</td>
                          <td className="text-right">{formatCurrency(f.revenue)}</td>
                          <td className="text-right">{totalFarmerRev > 0 ? ((f.revenue / totalFarmerRev) * 100).toFixed(1) : '0.0'}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="totals-row">
                      <td colSpan="2"><strong>Total</strong></td>
                      <td className="text-right"><strong>{formatCurrency(reports.top_farmers.reduce((s, f) => s + (f.revenue || 0), 0))}</strong></td>
                      <td className="text-right"><strong>100%</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Recent Orders */}
            {selectedSections.recentOrders && recentOrders.length > 0 && (
              <div className="report-section">
                <h3 className="section-title"><span className="section-num">8</span> Recent Orders</h3>
                <table className="print-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Order ID</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Delivery Proof</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td className="mono">#{(order._id || order.id || '').toString().slice(-6)}</td>
                        <td>{formatDateTime(order.created_at)}</td>
                        <td style={{ textTransform: 'capitalize' }}>
                          <span className={`status-dot status-${(order.status || 'pending').toLowerCase()}`}></span>
                          {order.status || 'pending'}
                        </td>
                        <td>{order.delivery_proof_url ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer */}
            <div className="report-footer">
              <div className="footer-line"></div>
              <p>FarmToClick E-Commerce Analytics Report &mdash; Generated on {generatedDate}</p>
              <p className="footer-sub">This report is auto-generated from the admin dashboard. Data is accurate as of the generation time.</p>
            </div>
          </>
        )}
      </div>

      <style>{`
        /* ═══════ SCREEN STYLES ═══════ */
        .printable-reports-page {
          min-height: 100vh;
          background: #f4f6f9;
        }

        .print-controls {
          background: white;
          border-bottom: 2px solid #e0e0e0;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        .controls-container {
          max-width: 1100px;
          margin: 0 auto;
        }

        .controls-header {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 18px;
        }

        .controls-header h2 {
          font-size: 1.3rem;
          color: #14532d;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .back-link {
          color: #2c7a2c;
          text-decoration: none;
          font-size: .9rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 8px;
          background: #f0f7f0;
          transition: all .2s;
        }
        .back-link:hover {
          background: #dff0df;
        }

        .controls-row {
          display: flex;
          gap: 30px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .control-group {
          flex: 1;
          min-width: 250px;
        }

        .control-group label {
          font-weight: 600;
          color: #555;
          font-size: .85rem;
          display: block;
          margin-bottom: 8px;
        }

        .period-btns {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .period-btn {
          padding: 8px 18px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 20px;
          cursor: pointer;
          font-size: .85rem;
          transition: all .2s;
        }
        .period-btn:hover { border-color: #2c7a2c; color: #2c7a2c; }
        .period-btn.active {
          background: #2c7a2c;
          color: white;
          border-color: #2c7a2c;
        }

        .section-toggles {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
        }

        .toggle-all-btn {
          padding: 4px 12px;
          border: 1px solid #ddd;
          background: #f8f9fa;
          border-radius: 6px;
          cursor: pointer;
          font-size: .8rem;
          color: #555;
          transition: all .2s;
        }
        .toggle-all-btn:hover { border-color: #2c7a2c; color: #2c7a2c; }

        .section-checkboxes {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 6px;
        }

        .section-checkbox {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: .85rem;
          color: #444;
          cursor: pointer;
        }
        .section-checkbox input { accent-color: #2c7a2c; }

        .print-btn {
          padding: 12px 32px;
          background: #2c7a2c;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all .2s;
          box-shadow: 0 4px 12px rgba(44,122,44,0.2);
        }
        .print-btn:hover { background: #1b5e20; transform: translateY(-1px); }
        .print-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ═══════ PRINT CONTENT ═══════ */
        .print-content {
          max-width: 1100px;
          margin: 0 auto;
          padding: 30px 20px;
        }

        .report-header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #2c7a2c;
        }

        .report-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 8px;
        }

        .report-logo h1 {
          font-size: 1.8rem;
          color: #14532d;
          margin: 0;
          font-weight: 800;
        }

        .report-title {
          font-size: 1.3rem;
          color: #333;
          margin: 0 0 8px;
          font-weight: 600;
        }

        .report-meta {
          font-size: .9rem;
          color: #666;
        }
        .report-meta-sep { margin: 0 10px; }

        .report-section {
          margin-bottom: 28px;
          page-break-inside: avoid;
        }

        .section-title {
          font-size: 1.1rem;
          color: #14532d;
          margin: 0 0 12px;
          padding: 8px 14px;
          background: #f0f7f0;
          border-left: 4px solid #2c7a2c;
          border-radius: 0 6px 6px 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .section-num {
          background: #2c7a2c;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: .8rem;
          font-weight: 700;
          flex-shrink: 0;
        }

        /* ═══════ TABLE STYLES ═══════ */
        .print-table {
          width: 100%;
          border-collapse: collapse;
          font-size: .88rem;
          margin-bottom: 4px;
        }

        .print-table th {
          text-align: left;
          padding: 10px 12px;
          background: #f8f9fa;
          color: #333;
          font-weight: 700;
          border-bottom: 2px solid #2c7a2c;
          border-top: 2px solid #2c7a2c;
          font-size: .82rem;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .print-table td {
          padding: 8px 12px;
          border-bottom: 1px solid #e8e8e8;
          color: #333;
        }

        .print-table tbody tr:nth-child(even) {
          background: #fafbfc;
        }

        .print-table tbody tr:hover {
          background: #f0f7f0;
        }

        .text-right { text-align: right !important; }

        .totals-row {
          background: #f0f7f0 !important;
          border-top: 2px solid #2c7a2c;
        }
        .totals-row td {
          font-weight: 700;
          color: #14532d;
          border-bottom: 2px solid #2c7a2c;
        }

        .zero-row td { color: #aaa; }

        .mono { font-family: 'Courier New', monospace; font-weight: 600; }

        .kpi-table td:first-child { width: 200px; }

        .compact-table { max-width: 700px; }

        .status-dot {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-right: 8px;
          vertical-align: middle;
        }
        .status-dot.status-pending { background: #ff9800; }
        .status-dot.status-confirmed { background: #2196f3; }
        .status-dot.status-preparing { background: #9c27b0; }
        .status-dot.status-ready { background: #00bcd4; }
        .status-dot.status-completed { background: #4caf50; }
        .status-dot.status-delivered { background: #2c7a2c; }
        .status-dot.status-cancelled { background: #f44336; }

        .report-footer {
          margin-top: 40px;
          text-align: center;
          color: #888;
          font-size: .85rem;
        }
        .footer-line {
          border-top: 2px solid #2c7a2c;
          margin-bottom: 14px;
        }
        .footer-sub {
          font-size: .78rem;
          color: #aaa;
          margin-top: 4px;
        }

        .loading-spinner {
          text-align: center;
          padding: 60px 20px;
          font-size: 1.1rem;
          color: #666;
        }

        /* ═══════ PRINT MEDIA STYLES ═══════ */
        @media print {
          .no-print,
          nav,
          .navbar,
          .print-controls {
            display: none !important;
          }

          .printable-reports-page {
            background: white !important;
          }

          .print-content {
            max-width: 100%;
            padding: 0;
            margin: 0;
          }

          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          @page {
            size: A4;
            margin: 15mm 12mm;
          }

          /* Logo/header only on first page */
          .report-header {
            margin-bottom: 20px;
            padding-bottom: 14px;
            position: static;
            display: block;
          }

          .report-logo i {
            color: #2c7a2c !important;
          }

          .report-section {
            page-break-inside: avoid;
            margin-bottom: 18px;
          }

          .section-title {
            background: #f0f7f0 !important;
            -webkit-print-color-adjust: exact;
          }

          .section-num {
            background: #2c7a2c !important;
            color: white !important;
            -webkit-print-color-adjust: exact;
          }

          .print-table {
            font-size: .82rem;
          }

          .print-table th {
            background: #f8f9fa !important;
            -webkit-print-color-adjust: exact;
          }

          .print-table tbody tr:nth-child(even) {
            background: #fafbfc !important;
            -webkit-print-color-adjust: exact;
          }

          .totals-row {
            background: #f0f7f0 !important;
            -webkit-print-color-adjust: exact;
          }

          .status-dot {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .zero-row td { color: #bbb; }

          .print-table tr {
            page-break-inside: avoid;
          }

          .report-footer {
            margin-top: 20px;
          }
        }

        /* ═══════ RESPONSIVE ═══════ */
        @media (max-width: 768px) {
          .controls-row {
            flex-direction: column;
            gap: 16px;
          }

          .controls-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }

          .section-checkboxes {
            grid-template-columns: 1fr;
          }

          .print-table {
            font-size: .8rem;
          }

          .print-table th,
          .print-table td {
            padding: 6px 8px;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminPrintableReports;
