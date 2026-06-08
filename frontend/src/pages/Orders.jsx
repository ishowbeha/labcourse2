import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Badge, Modal, Form } from 'react-bootstrap';
import LazyNavbar from '../components/layout/LazyNavbar';
import OrderService from '../services/OrderService';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import AdvancedSearchBar from '../components/search/AdvancedSearchBar';

const Orders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Advanced search state
  const [searchText, setSearchText] = useState('');
  const [advFilters, setAdvFilters] = useState({});
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  const orderSortOptions = [
    { value: 'date', label: 'Date Placed' },
    { value: 'total', label: 'Total Amount' },
    { value: 'status', label: 'Status' },
    { value: 'tickets', label: '# Tickets' },
  ];

  const orderFilterDefs = [
    { id: 'status', label: 'Status', type: 'select', options: [
      { value: 'confirmed', label: 'Confirmed' },
      { value: 'pending', label: 'Pending' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' },
      { value: 'refunded', label: 'Refunded' },
    ]},
    { id: 'dateFrom', label: 'Date From', type: 'date' },
    { id: 'dateTo', label: 'Date To', type: 'date' },
    { id: 'amountMin', label: 'Min Amount (€)', type: 'number', placeholder: '0', min: 0 },
    { id: 'amountMax', label: 'Max Amount (€)', type: 'number', placeholder: '5000', min: 0 },
  ];

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // First try fetching from backend API using raw axios (avoid 401 redirect interceptor)
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/orders', { 
        params: { limit: 50 },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true 
      });
      const responseData = response.data;
      let apiOrders = [];
      if (responseData?.success && responseData?.data?.orders) {
        apiOrders = responseData.data.orders.map(o => {
          let subtotal = o.total_amount || 0;
          let fees = Math.round((o.total_amount || 0) * 0.05 / 1.05 * 100) / 100;
          let discount = 0;
          let couponCode = '';

          if (o.notes) {
            const subtotalMatch = o.notes.match(/Subtotal:\s*([\d.]+)/);
            const feesMatch = o.notes.match(/Fees:\s*([\d.]+)/);
            const discountMatch = o.notes.match(/Discount:\s*([\d.]+)/);
            const couponMatch = o.notes.match(/Coupon:\s*([^|]+)/);
            
            if (subtotalMatch) subtotal = parseFloat(subtotalMatch[1]);
            if (feesMatch) fees = parseFloat(feesMatch[1]);
            if (discountMatch) discount = parseFloat(discountMatch[1]);
            if (couponMatch) couponCode = couponMatch[1].trim();
          }

          return {
            id: o.id,
            orderNumber: o.order_number,
            date: o.created_at ? new Date(o.created_at).toISOString().split('T')[0] : 'N/A',
            match: o.match_name || `${o.home_team || ''} vs ${o.away_team || ''}` || 'Unknown Match',
            matchDate: o.match_date || 'N/A',
            matchTime: o.match_time || '',
            competition: o.competition || 'Match',
            stadium: o.stadium_name || 'TBD',
            tickets: o.ticket_count || o.items_count || 0,
            seats: o.section_names ? o.section_names.split(', ') : [],
            subtotal: subtotal,
            fees: fees,
            discount: discount,
            couponCode: couponCode || null,
            total: o.total_amount || 0,
            status: o.status || 'confirmed',
            paymentMethod: o.payment_method || 'credit-card',
          };
        });
      }
      
      // Always use API results (database is the source of truth)
      setOrders(apiOrders);
    } catch (err) {
      console.log('Failed to fetch orders from API:', err);
      // Fallback to per-user localStorage (each user has own key)
      const localOrders = OrderService.getOrders();
      setOrders(localOrders.length > 0 ? localOrders : []);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status) => {
    switch(status) {
      case 'confirmed': return 'success';
      case 'pending': return 'warning';
      case 'completed': return 'info';
      case 'cancelled': return 'danger';
      case 'refunded': return 'secondary';
      default: return 'secondary';
    }
  };

  const getTotalSpent = () => {
    return orders
      .filter(o => o.status === 'confirmed' || o.status === 'completed')
      .reduce((sum, o) => sum + (o.total || 0), 0);
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedOrder(null);
  };

  const handleAdvFilterChange = (id, value) => setAdvFilters((prev) => ({ ...prev, [id]: value }));

  const handleAdvReset = () => {
    setSearchText('');
    setAdvFilters({});
    setSortField('date');
    setSortDir('desc');
  };

  // Client-side filtered + sorted orders
  const filteredOrders = useMemo(() => {
    let list = [...orders];

    // Text search
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter((o) =>
        (o.orderNumber || '').toLowerCase().includes(q) ||
        (o.match || '').toLowerCase().includes(q) ||
        (o.stadium || '').toLowerCase().includes(q)
      );
    }

    // Status filter
    if (advFilters.status) {
      list = list.filter((o) => o.status === advFilters.status);
    }

    // Date range
    if (advFilters.dateFrom) {
      list = list.filter((o) => o.date && o.date >= advFilters.dateFrom);
    }
    if (advFilters.dateTo) {
      list = list.filter((o) => o.date && o.date <= advFilters.dateTo);
    }

    // Amount range
    if (advFilters.amountMin !== '' && advFilters.amountMin !== undefined) {
      list = list.filter((o) => (o.total || 0) >= Number(advFilters.amountMin));
    }
    if (advFilters.amountMax !== '' && advFilters.amountMax !== undefined) {
      list = list.filter((o) => (o.total || 0) <= Number(advFilters.amountMax));
    }

    // Sort
    list = [...list].sort((a, b) => {
      let aVal, bVal;
      if (sortField === 'total') { aVal = a.total || 0; bVal = b.total || 0; }
      else if (sortField === 'status') { aVal = a.status || ''; bVal = b.status || ''; }
      else if (sortField === 'tickets') { aVal = a.tickets || 0; bVal = b.tickets || 0; }
      else { aVal = a.date || ''; bVal = b.date || ''; } // date
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [orders, searchText, advFilters, sortField, sortDir]);

  const handleDownloadInvoice = (order) => {
    try {
      const doc = new jsPDF();
      
      // Title / Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(44, 62, 80); // #2c3e50
      doc.text('STADIUM TICKETS INVOICE', 14, 20);
      
      // Separator Line
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.line(14, 26, 196, 26);
      
      // Invoice Meta Info
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(127, 140, 141); // #7f8c8d
      doc.text(`Invoice Number: ${order.orderNumber}`, 14, 34);
      doc.text(`Date: ${order.date}`, 14, 40);
      doc.text(`Status: ${order.status.toUpperCase()}`, 14, 46);
      
      // Section Header: Order Details
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.text('ORDER DETAILS', 14, 58);
      doc.line(14, 61, 196, 61);
      
      // Order details content
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      doc.text(`Match:`, 14, 68);
      doc.setFont('helvetica', 'bold');
      doc.text(`${order.match}`, 45, 68);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Match Date:`, 14, 74);
      doc.text(`${order.matchDate} ${order.matchTime ? `at ${order.matchTime}` : ''}`, 45, 74);
      
      doc.text(`Stadium:`, 14, 80);
      doc.text(`${order.stadium}`, 45, 80);
      
      doc.text(`Competition:`, 14, 86);
      doc.text(`${order.competition}`, 45, 86);
      
      doc.text(`Tickets Purchased:`, 14, 92);
      doc.text(`${order.tickets}`, 45, 92);
      
      if (order.seats && order.seats.length > 0) {
        doc.text(`Seats / Sections:`, 14, 98);
        doc.text(`${order.seats.join(', ')}`, 45, 98);
      }
      
      // Section Header: Payment Info
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.text('PAYMENT DETAILS', 14, 112);
      doc.line(14, 115, 196, 115);
      
      // Payment content
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      
      doc.text(`Subtotal:`, 14, 122);
      doc.text(`€${(order.subtotal || 0).toFixed(2)}`, 150, 122, { align: 'right' });
      
      doc.text(`Booking Fees:`, 14, 128);
      doc.text(`€${(order.fees || 0).toFixed(2)}`, 150, 128, { align: 'right' });
      
      let nextY = 134;
      if (order.discount > 0) {
        doc.text(`Discount ${order.couponCode ? `(${order.couponCode})` : ''}:`, 14, 134);
        doc.setTextColor(39, 174, 96); // green
        doc.text(`-€${Number(order.discount).toFixed(2)}`, 150, 134, { align: 'right' });
        doc.setTextColor(50, 50, 50);
        nextY = 140;
      }
      
      doc.line(14, nextY, 196, nextY);
      doc.setFont('helvetica', 'bold');
      doc.text(`TOTAL AMOUNT PAID:`, 14, nextY + 8);
      doc.text(`€${(order.total || 0).toFixed(2)}`, 150, nextY + 8, { align: 'right' });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(127, 140, 141);
      doc.text(`Payment Method: ${order.paymentMethod}`, 14, nextY + 18);
      
      // Footer Note
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(11);
      doc.setTextColor(44, 62, 80);
      doc.text('Thank you for your purchase!', 105, nextY + 35, { align: 'center' });
      
      // Save the PDF
      doc.save(`Invoice_${order.orderNumber}.pdf`);
    } catch (pdfError) {
      console.error('PDF Generation failed:', pdfError);
      // Fallback to text file download if PDF fails
      const invoiceContent = `
═══════════════════════════════════════════
          STADIUM TICKETS INVOICE
═══════════════════════════════════════════

Invoice Number: ${order.orderNumber}
Date: ${order.date}
Status: ${order.status.toUpperCase()}

───────────────────────────────────────────
                 ORDER DETAILS
───────────────────────────────────────────

Match: ${order.match}
Date: ${order.matchDate} ${order.matchTime ? `at ${order.matchTime}` : ''}
Stadium: ${order.stadium}
Competition: ${order.competition}

Tickets: ${order.tickets}
${order.seats?.length ? 'Seats: ' + order.seats.join(', ') : ''}

───────────────────────────────────────────
                  PAYMENT
───────────────────────────────────────────

Subtotal: €${(order.subtotal || 0).toFixed(2)}
Fees: €${(order.fees || 0).toFixed(2)}
${order.discount > 0 ? `Discount: -€${Number(order.discount).toFixed(2)}\n` : ''}
───────────────────────────────────────────
TOTAL: €${(order.total || 0).toFixed(2)}
───────────────────────────────────────────

Payment Method: ${order.paymentMethod}

═══════════════════════════════════════════
        Thank you for your purchase!
═══════════════════════════════════════════
      `;
      const blob = new Blob([invoiceContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${order.orderNumber}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const renderOrderSummary = (order) => (
    <div className="bg-light rounded p-3">
      <div className="d-flex justify-content-between small text-muted mb-2">
        <span>Subtotal</span>
        <span>€{(order.subtotal || 0).toFixed(2)}</span>
      </div>
      <div className="d-flex justify-content-between small text-muted mb-2">
        <span>Fees</span>
        <span>€{(order.fees || 0).toFixed(2)}</span>
      </div>
      {order.discount > 0 && (
        <div className="d-flex justify-content-between small text-success mb-2">
          <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
          <span className="fw-semibold">-€{Number(order.discount).toFixed(2)}</span>
        </div>
      )}
      <div className="d-flex justify-content-between fw-bold border-top pt-2 mt-2">
        <span>Total</span>
        <span>€{(order.total || 0).toFixed(2)}</span>
      </div>
      <p className="small text-muted text-center mt-3 mb-0">Paid via {order.paymentMethod}</p>
    </div>
  );

  return (
    <div className="min-vh-100 bg-light">
      <LazyNavbar />

      <Container className="py-4 py-md-5">
        <div className="text-center mb-4">
          <h1 className="h2 text-dark">📋 My Orders</h1>
          <p className="text-muted mb-0">View your order history and track your purchases</p>
        </div>

        {/* Advanced Search */}
        <div className="mb-4">
          <AdvancedSearchBar
            searchValue={searchText}
            onSearchChange={setSearchText}
            onSearch={() => {}}
            onReset={handleAdvReset}
            placeholder="Search by order number or match name…"
            filters={orderFilterDefs}
            filterValues={advFilters}
            onFilterChange={handleAdvFilterChange}
            sortOptions={orderSortOptions}
            sortValue={sortField}
            sortDir={sortDir}
            onSortChange={(f, d) => { setSortField(f); setSortDir(d); }}
            resultCount={filteredOrders.length}
            totalCount={orders.length}
          />
        </div>

        <Row className="g-3 mb-4">
          <Col xs={12} md={4}>
            <Card className="text-center shadow-sm border-0">
              <Card.Body>
                <div className="display-6 fw-bold text-dark">{orders.length}</div>
                <div className="small text-muted">Total Orders</div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} md={4}>
            <Card className="text-center shadow-sm border-0">
              <Card.Body>
                <div className="display-6 fw-bold text-dark">
                  {orders.filter(o => o.status === 'confirmed' || o.status === 'completed').length}
                </div>
                <div className="small text-muted">Completed</div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} md={4}>
            <Card className="text-center shadow-sm border-0">
              <Card.Body>
                <div className="display-6 fw-bold text-dark">€{getTotalSpent()}</div>
                <div className="small text-muted">Total Spent</div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {orders.length === 0 ? (
          <Card className="text-center shadow-sm border-0 p-4 p-md-5">
            <div className="display-3 mb-3">📋</div>
            <h2 className="h4">No Orders Yet</h2>
            <p className="text-muted mb-4">You haven&apos;t purchased any tickets yet.</p>
            <Button variant="primary" size="lg" onClick={() => navigate('/matches')}>
              Browse Matches
            </Button>
          </Card>
        ) : filteredOrders.length === 0 ? (
          <Card className="text-center shadow-sm border-0 p-4">
            <div className="display-4 mb-3">🔍</div>
            <h2 className="h5">No Orders Match Your Search</h2>
            <p className="text-muted mb-3">Try adjusting your filters.</p>
            <Button variant="outline-secondary" size="sm" onClick={handleAdvReset}>Reset Filters</Button>
          </Card>
        ) : (
          <div className="d-flex flex-column gap-3">
            {filteredOrders.map(order => (
              <Card key={order.id} className="shadow-sm border-0">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
                    <div>
                      <div className="fw-bold text-dark">{order.orderNumber}</div>
                      <div className="small text-muted">Placed on {order.date}</div>
                    </div>
                    <Badge bg={getStatusVariant(order.status)}>{order.status.toUpperCase()}</Badge>
                  </div>

                  <Row className="g-3 mb-3">
                    <Col md={8}>
                      <h3 className="h5 text-dark mb-2">{order.match}</h3>
                      <p className="small text-muted mb-1">📅 Match Date: {order.matchDate} {order.matchTime ? `at ${order.matchTime}` : ''}</p>
                      <p className="small text-muted mb-1">🏟️ {order.stadium || 'TBD'}</p>
                      <p className="small text-muted mb-1">🏆 {order.competition || 'Match'}</p>
                      <p className="small mb-2">🎫 {order.tickets} ticket(s)</p>
                      <div className="d-flex flex-wrap gap-2">
                        {order.seats?.map((seat, idx) => (
                          <Badge key={idx} bg="light" text="dark" className="fw-normal">{seat}</Badge>
                        ))}
                      </div>
                    </Col>
                    <Col md={4}>
                      {renderOrderSummary(order)}
                    </Col>
                  </Row>

                  <div className="d-flex flex-column flex-sm-row gap-2 border-top pt-3">
                    <Button variant="primary" onClick={() => handleViewDetails(order)}>View Details</Button>
                    {order.status !== 'pending' && (
                      <Button variant="outline-primary" onClick={() => handleDownloadInvoice(order)}>Download Invoice</Button>
                    )}
                    {order.status === 'pending' && (
                      <Button variant="success">Complete Payment</Button>
                    )}
                  </div>
                </Card.Body>
              </Card>
            ))}
          </div>
        )}

        <Modal show={showDetailsModal} onHide={closeDetailsModal} centered>
          <Modal.Header closeButton>
            <Modal.Title>Order Details</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedOrder && (
              <>
                <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
                  <div>
                    <div className="fw-bold text-dark">{selectedOrder.orderNumber}</div>
                    <div className="small text-muted">Placed on {selectedOrder.date}</div>
                  </div>
                  <Badge bg={getStatusVariant(selectedOrder.status)}>{selectedOrder.status.toUpperCase()}</Badge>
                </div>

                <div className="mb-3">
                  <h3 className="h5 text-dark mb-2">{selectedOrder.match}</h3>
                  <p className="small text-muted mb-1">📅 Match Date: {selectedOrder.matchDate} {selectedOrder.matchTime ? `at ${selectedOrder.matchTime}` : ''}</p>
                  <p className="small text-muted mb-1">🏟️ {selectedOrder.stadium || 'TBD'}</p>
                  <p className="small text-muted mb-1">🏆 {selectedOrder.competition || 'Match'}</p>
                  <p className="small mb-2">🎫 {selectedOrder.tickets} ticket(s)</p>
                  <div className="d-flex flex-wrap gap-2">
                    {selectedOrder.seats?.map((seat, idx) => (
                      <Badge key={idx} bg="light" text="dark" className="fw-normal">{seat}</Badge>
                    ))}
                  </div>
                </div>

                {renderOrderSummary(selectedOrder)}
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            {selectedOrder?.status !== 'pending' && (
              <Button variant="outline-primary" onClick={() => handleDownloadInvoice(selectedOrder)}>Download Invoice</Button>
            )}
            <Button variant="primary" onClick={closeDetailsModal}>Close</Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
};

export default Orders;
