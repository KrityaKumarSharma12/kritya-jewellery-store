import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Eye, Download, Printer, FileText, X,
  ChevronLeft, ChevronRight, Layers,
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const API = 'http://localhost:5000/api/admin';

const fmt = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const InvoiceManagement = () => {
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selected, setSelected] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchInvoices = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const res = await axios.get(`${API}/invoices`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { search: debounced || undefined, page, limit: 20 },
        });
        setInvoices(res.data.invoices || []);
        setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 });
      } catch (err) {
        console.error(err);
        toast.error('Failed to load invoices');
      } finally {
        setLoading(false);
      }
    },
    [debounced, token]
  );

  useEffect(() => { fetchInvoices(1); }, [debounced]); // eslint-disable-line

  // Used by downloadPdf, printPdf, exportCsv, backfill
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const downloadPdf = async (inv) => {
    try {
      const res = await axios.get(`${API}/invoices/${inv.id}/pdf`, {
        ...authHeaders,
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${inv.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error('Failed to download PDF');
    }
  };

  const printPdf = async (inv) => {
    try {
      const res = await axios.get(`${API}/invoices/${inv.id}/pdf`, {
        ...authHeaders,
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const w = window.open(url, '_blank');
      if (w) w.onload = () => setTimeout(() => w.print(), 300);
    } catch (err) {
      console.error(err);
      toast.error('Failed to open PDF');
    }
  };

  const exportCsv = async () => {
    try {
      const res = await axios.get(`${API}/invoices/export/csv`, {
        ...authHeaders,
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoices-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export CSV');
    }
  };

  const backfill = async () => {
    if (!window.confirm('Generate invoices for all existing orders without one?')) return;
    try {
      const res = await axios.post(`${API}/invoices/backfill`, {}, authHeaders);
      toast.success(res.data.message || 'Backfill complete');
      fetchInvoices(1);
    } catch (err) {
      console.error(err);
      toast.error('Backfill failed');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-playfair font-bold text-gray-800 dark:text-white truncate">
            Invoices
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            {pagination.total} invoice{pagination.total === 1 ? '' : 's'} total
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={backfill}
            className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg transition flex items-center gap-2 text-gray-700 dark:text-gray-300 text-xs sm:text-sm"
            title="Generate invoices for existing orders"
          >
            <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Backfill
          </button>
          <button
            onClick={exportCsv}
            className="px-3 sm:px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition flex items-center gap-2 shadow-lg text-xs sm:text-sm"
          >
            <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Export All
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by invoice #, order #, customer name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-600"></div>
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-10 sm:py-12 bg-white dark:bg-dark-card rounded-2xl shadow-lg px-4">
          <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-sm sm:text-base text-gray-500">No invoices found</p>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            {search
              ? 'Try a different search'
              : 'New orders auto-generate invoices. Click "Backfill" for existing orders.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 dark:bg-dark-bg">
                <tr>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Invoice</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Order</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Customer</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Date</th>
                  <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Total</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Payment</th>
                  <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-bg transition"
                  >
                    <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm font-mono text-gray-800 dark:text-white whitespace-nowrap">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-mono whitespace-nowrap">
                      #{inv.orderId?.slice(-8)}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm">
                      <p className="font-medium text-gray-800 dark:text-white truncate max-w-[140px] sm:max-w-none">{inv.customerName}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[140px] sm:max-w-none">{inv.customerEmail}</p>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {new Date(inv.generatedAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm font-semibold text-gold-600 text-right whitespace-nowrap">
                      {fmt(inv.total)}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                        inv.paymentStatus === 'PAID'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {inv.paymentStatus || 'PENDING'}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-right">
                      <div className="inline-flex gap-0.5 sm:gap-1">
                        <button
                          onClick={() => setSelected(inv)}
                          className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="View"
                          aria-label="View invoice"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => downloadPdf(inv)}
                          className="p-1.5 sm:p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition"
                          title="Download PDF"
                          aria-label="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => printPdf(inv)}
                          className="p-1.5 sm:p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition"
                          title="Print"
                          aria-label="Print invoice"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 px-3 sm:px-4 py-3 border-t border-gray-100 dark:border-dark-border">
              <p className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                Page {pagination.page} of {pagination.pages}
              </p>
              <div className="flex gap-2 justify-center sm:justify-end">
                <button
                  onClick={() => fetchInvoices(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-2 border border-gray-300 dark:border-dark-border rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-dark-bg"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => fetchInvoices(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="p-2 border border-gray-300 dark:border-dark-border rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-dark-bg"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 gap-2">
              <h2 className="text-base sm:text-lg md:text-xl font-playfair font-bold text-gray-800 dark:text-white truncate">
                Invoice {selected.invoiceNumber}
              </h2>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg flex-shrink-0"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 dark:bg-dark-bg rounded-lg mb-4">
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Customer</p>
                <p className="font-semibold text-sm sm:text-base text-gray-800 dark:text-white truncate">{selected.customerName}</p>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 truncate">{selected.customerEmail}</p>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">{selected.customerPhone}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs text-gray-500">Invoice Date</p>
                <p className="font-semibold text-sm sm:text-base text-gray-800 dark:text-white">
                  {new Date(selected.generatedAt).toLocaleDateString('en-IN')}
                </p>
                <p className="text-xs text-gray-500 mt-2">Order</p>
                <p className="font-mono text-xs sm:text-sm text-gray-700 dark:text-gray-200">
                  #{selected.orderId?.slice(-8)}
                </p>
              </div>
            </div>

            <h3 className="font-semibold text-sm sm:text-base text-gray-800 dark:text-white mb-2">Items</h3>
            <div className="space-y-2 mb-4">
              {(selected.items || []).map((it, i) => (
                <div
                  key={i}
                  className="flex justify-between p-3 bg-gray-50 dark:bg-dark-bg rounded-lg gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-xs sm:text-sm text-gray-800 dark:text-white truncate">{it.name}</p>
                    <p className="text-xs text-gray-500">
                      Qty {it.quantity} × {fmt(it.price)}
                    </p>
                  </div>
                  <span className="font-semibold text-xs sm:text-sm text-gray-800 dark:text-white whitespace-nowrap flex-shrink-0">
                    {fmt(it.total ?? it.price * it.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 dark:border-dark-border pt-4">
              <div className="space-y-1 max-w-sm ml-auto text-xs sm:text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-800 dark:text-white whitespace-nowrap">{fmt(selected.subtotal)}</span>
                </div>
                {selected.discount > 0 && (
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500">Discount</span>
                    <span className="text-gray-800 dark:text-white whitespace-nowrap">-{fmt(selected.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Tax (GST)</span>
                  <span className="text-gray-800 dark:text-white whitespace-nowrap">{fmt(selected.tax)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 dark:border-dark-border pt-2 mt-2 text-sm sm:text-base font-bold gap-2">
                  <span className="text-gray-800 dark:text-white">Total</span>
                  <span className="text-gold-600 whitespace-nowrap">{fmt(selected.total)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 mt-6">
              <button
                onClick={() => printPdf(selected)}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg transition flex items-center justify-center gap-2 text-gray-700 dark:text-gray-300 text-xs sm:text-sm"
              >
                <Printer className="h-4 w-4" /> Print
              </button>
              <button
                onClick={() => downloadPdf(selected)}
                className="w-full sm:w-auto px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition flex items-center justify-center gap-2 shadow-lg text-xs sm:text-sm"
              >
                <Download className="h-4 w-4" /> Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceManagement;