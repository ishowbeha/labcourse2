import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Container,
  Row,
  Col,
  Card,
  ListGroup,
  Form,
  Button,
  Badge,
  Spinner,
  InputGroup,
} from 'react-bootstrap';
import LazyNavbar from '../components/layout/LazyNavbar';
import { useAuth } from '../context/AuthContext';
import { useSocketStore } from '../store/socketStore';
import api from '../services/api';

const EMPTY_MESSAGES = [];

const Chat = () => {
  const { user } = useAuth();
  const userId = user?.id || user?.userId;
  const [searchParams, setSearchParams] = useSearchParams();

  const connected = useSocketStore((s) => s.connected);
  const onlineUserIds = useSocketStore((s) => s.onlineUserIds);
  const typingUsers = useSocketStore((s) => s.typingUsers);
  const sendMessage = useSocketStore((s) => s.sendMessage);
  const sendTyping = useSocketStore((s) => s.sendTyping);
  const stopTyping = useSocketStore((s) => s.stopTyping);
  const setConversationMessages = useSocketStore((s) => s.setConversationMessages);

  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [activeContact, setActiveContact] = useState(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const conversationKey = userId && activeContact
    ? `${Math.min(userId, activeContact.id)}-${Math.max(userId, activeContact.id)}`
    : null;

  const conversations = useSocketStore((s) => s.conversations);
  const displayMessages = conversationKey
    ? conversations[conversationKey] ?? EMPTY_MESSAGES
    : EMPTY_MESSAGES;

  useEffect(() => {
    const loadContacts = async () => {
      setLoadingContacts(true);
      setError('');
      try {
        const res = await api.get('/chat/contacts');
        setContacts(res.data || []);
      } catch (e) {
        setError('Could not load contacts.');
        console.error(e);
      }
      setLoadingContacts(false);
    };
    loadContacts();
  }, []);

  useEffect(() => {
    const targetUserId = searchParams.get('user');
    if (!targetUserId || contacts.length === 0) return;

    const contact = contacts.find((c) => String(c.id) === String(targetUserId));
    if (contact) {
      setActiveContact(contact);
      setSearchParams({}, { replace: true });
    }
  }, [contacts, searchParams, setSearchParams]);

  useEffect(() => {
    if (!activeContact || !userId) return;

    const loadHistory = async () => {
      setLoadingMessages(true);
      try {
        const res = await api.get(`/chat/conversation/${activeContact.id}`);
        const history = res.data?.messages || [];
        setConversationMessages(userId, activeContact.id, history);
      } catch (e) {
        console.error(e);
      }
      setLoadingMessages(false);
    };
    loadHistory();
  }, [activeContact, userId, setConversationMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages, typingUsers, activeContact]);

  const handleDraftChange = (value) => {
    setDraft(value);
    if (!activeContact) return;

    sendTyping(activeContact.id);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(activeContact.id);
    }, 1500);
  };

  const handleSend = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeContact) return;

    stopTyping(activeContact.id);
    sendMessage(activeContact.id, text);
    setDraft('');
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isOnline = (id) => onlineUserIds.includes(Number(id));

  return (
    <div className="min-vh-100 bg-light">
      <LazyNavbar />
      <Container className="py-4 py-md-5">
        <div className="text-center mb-4">
          <h1 className="h2 text-dark">💬 Messages</h1>
          <p className="text-muted mb-0">
            Real-time internal chat
            {connected ? (
              <Badge bg="success" className="ms-2">Connected</Badge>
            ) : (
              <Badge bg="secondary" className="ms-2">Connecting…</Badge>
            )}
          </p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <Card className="shadow-sm border-0 overflow-hidden" style={{ minHeight: '70vh' }}>
          <Row className="g-0 h-100">
            <Col md={4} lg={3} className="border-end bg-white">
              <div className="p-3 border-bottom bg-light">
                <h2 className="h6 mb-0">Contacts</h2>
              </div>
              {loadingContacts ? (
                <div className="text-center py-5 text-muted">
                  <Spinner animation="border" size="sm" className="me-2" />
                  Loading…
                </div>
              ) : contacts.length === 0 ? (
                <p className="text-muted text-center py-4 mb-0">No other users available.</p>
              ) : (
                <ListGroup variant="flush" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                  {contacts.map((c) => (
                    <ListGroup.Item
                      key={c.id}
                      action
                      active={activeContact?.id === c.id}
                      onClick={() => setActiveContact(c)}
                      className="d-flex align-items-center justify-content-between"
                    >
                      <div>
                        <div className="fw-semibold">
                          {c.firstName} {c.lastName}
                        </div>
                        <small className="text-muted">{c.email}</small>
                      </div>
                      {isOnline(c.id) && (
                        <span className="text-success" title="Online">●</span>
                      )}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Col>

            <Col md={8} lg={9} className="d-flex flex-column bg-white">
              {!activeContact ? (
                <div className="flex-grow-1 d-flex align-items-center justify-content-center text-muted p-4">
                  <div className="text-center">
                    <div className="display-4 mb-3">💬</div>
                    <p className="mb-0">Select a contact to start chatting.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
                    <div>
                      <h2 className="h5 mb-0">
                        {activeContact.firstName} {activeContact.lastName}
                      </h2>
                      <small className={isOnline(activeContact.id) ? 'text-success' : 'text-muted'}>
                        {isOnline(activeContact.id) ? 'Online' : 'Offline'}
                      </small>
                    </div>
                  </div>

                  <div
                    className="flex-grow-1 p-3"
                    style={{ overflowY: 'auto', maxHeight: '55vh', minHeight: '300px' }}
                  >
                    {loadingMessages && displayMessages.length === 0 ? (
                      <div className="text-center text-muted py-4">
                        <Spinner animation="border" size="sm" className="me-2" />
                        Loading messages…
                      </div>
                    ) : displayMessages.length === 0 ? (
                      <p className="text-muted text-center py-4 mb-0">
                        No messages yet. Say hello!
                      </p>
                    ) : (
                      displayMessages.map((msg) => {
                        const isMine = msg.direction === 'out' || msg.from === userId;
                        return (
                          <div
                            key={msg.id}
                            className={`d-flex mb-2 ${isMine ? 'justify-content-end' : 'justify-content-start'}`}
                          >
                            <div
                              className={`rounded px-3 py-2 ${isMine ? 'bg-primary text-white' : 'bg-light border'}`}
                              style={{ maxWidth: '75%' }}
                            >
                              <div>{msg.message}</div>
                              <small className={`d-block mt-1 ${isMine ? 'text-white-50' : 'text-muted'}`}>
                                {formatTime(msg.timestamp)}
                              </small>
                            </div>
                          </div>
                        );
                      })
                    )}
                    {typingUsers[activeContact.id] && (
                      <div className="text-muted small fst-italic">typing…</div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-3 border-top mt-auto">
                    <Form onSubmit={handleSend}>
                      <InputGroup>
                        <Form.Control
                          placeholder="Type a message…"
                          value={draft}
                          onChange={(e) => handleDraftChange(e.target.value)}
                          disabled={!connected}
                          maxLength={2000}
                        />
                        <Button type="submit" variant="primary" disabled={!connected || !draft.trim()}>
                          Send
                        </Button>
                      </InputGroup>
                    </Form>
                  </div>
                </>
              )}
            </Col>
          </Row>
        </Card>
      </Container>
    </div>
  );
};

export default Chat;
