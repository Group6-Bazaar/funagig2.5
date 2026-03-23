import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';
import api from '../../utils/api';
import toast from '../../utils/toast';

const Messaging = () => {
    const { user } = useAuth();
    const { socket, isConnected } = useWebSocket();
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [fileAttachment, setFileAttachment] = useState(null);
    const [sending, setSending] = useState(false);
    
    // Typing indicator
    const [typingUsers, setTypingUsers] = useState({});
    const typingTimeoutRef = useRef(null);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        loadConversations();
        const pollInterval = setInterval(loadConversations, 10000);
        return () => clearInterval(pollInterval);
    }, []);

    useEffect(() => {
        if (socket) {
            socket.on('message_received', handleNewMessage);
            socket.on('user_typing', handleUserTyping);
            
            return () => {
                socket.off('message_received', handleNewMessage);
                socket.off('user_typing', handleUserTyping);
            };
        }
    }, [socket, activeConversation]);

    const handleNewMessage = (data) => {
        if (activeConversation && data.conversationId === activeConversation.id) {
            loadMessages(activeConversation.id);
        } else {
            loadConversations();
            toast.info('New message received');
        }
    };

    const handleUserTyping = (data) => {
        if (activeConversation && data.conversationId === activeConversation.id && data.userId !== user.id) {
            setTypingUsers(prev => ({ ...prev, [data.userId]: data.isTyping ? data.userName : null }));
            if (!data.isTyping) {
                setTypingUsers(prev => {
                    const newDict = { ...prev };
                    delete newDict[data.userId];
                    return newDict;
                });
            }
        }
    };

    const loadConversations = async () => {
        try {
            const res = await api.get('/conversations', { silent: true, retry: false });
            if (res.success) {
                setConversations(res.conversations || []);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const loadMessages = async (conversationId) => {
        try {
            const res = await api.get(`/messages/${conversationId}`, { silent: true, retry: false });
            if (res.success) {
                setMessages(res.messages || []);
                scrollToBottom();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const selectConversation = (conv) => {
        setActiveConversation(conv);
        loadMessages(conv.id);
        // Clean unread count locally
        setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleTyping = (e) => {
        setMessageInput(e.target.value);
        if (socket && isConnected && activeConversation) {
            socket.emit('typing', { conversationId: activeConversation.id, isTyping: true, userName: user.name });
            
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                socket.emit('typing', { conversationId: activeConversation.id, isTyping: false, userName: user.name });
            }, 3000);
        }
    };

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if ((!messageInput.trim() && !fileAttachment) || !activeConversation || sending) return;

        setSending(true);
        try {
            // First upload file if exists
            let attachmentContent = null;
            if (fileAttachment) {
                const formData = new FormData();
                formData.append('file', fileAttachment);
                formData.append('type', 'message');
                const uploadRes = await api.post('/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (uploadRes.success) {
                    attachmentContent = JSON.stringify([{
                        file_name: fileAttachment.name,
                        file_url: uploadRes.file_url || uploadRes.file_path,
                        file_type: fileAttachment.type || fileAttachment.name.split('.').pop()
                    }]);
                } else {
                    throw new Error('Upload failed');
                }
            }

            const receiverId = activeConversation.other_user_id || 
                (activeConversation.user1_id === user.id ? activeConversation.user2_id : activeConversation.user1_id);

            const res = await api.post('/messages', {
                conversation_id: activeConversation.id,
                receiver_id: receiverId,
                content: messageInput,
                attachments: attachmentContent
            });

            if (res.success) {
                setMessageInput('');
                setFileAttachment(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
                
                // Clear typing
                if (socket && isConnected) {
                    socket.emit('typing', { conversationId: activeConversation.id, isTyping: false, userName: user.name });
                }
                
                loadMessages(activeConversation.id);
                loadConversations();
            } else {
                toast.error('Failed to send message');
            }
        } catch (err) {
            toast.error('Error sending message');
        } finally {
            setSending(false);
        }
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.charAt(0).toUpperCase();
    };

    const activeTypingNames = Object.values(typingUsers).filter(Boolean);

    return (
        <React.Fragment>
            <div className="flex items-center justify-between mb-20">
                <h1 className="h1" style={{ fontSize: '28px', margin: 0 }}>Messages</h1>
            </div>

            <main className="messaging-container" style={{ margin: 0, height: 'calc(100vh - 150px)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                <div className="conversations-sidebar">
                    <div className="conversations-header">
                        <h2 style={{ fontSize: '18px', margin: '0 0 16px 0' }}>Conversations</h2>
                    </div>
                    <div className="conversations-list" style={{ overflowY: 'auto', flex: 1 }}>
                        {conversations.length === 0 ? (
                            <div className="p-20 text-center subtle">No conversations yet</div>
                        ) : (
                            conversations.map(conv => {
                                const activeName = conv.other_user_name || 'Student';
                                const isActive = activeConversation?.id === conv.id;
                                const isUnread = conv.unread_count > 0;
                                return (
                                    <div 
                                        key={conv.id} 
                                        className={`conversation-item ${isActive ? 'active' : ''} ${isUnread ? 'unread' : ''}`}
                                        onClick={() => selectConversation(conv)}
                                    >
                                        <div className="conversation-avatar" style={{ backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {getInitials(activeName)}
                                        </div>
                                        <div className="conversation-content">
                                            <div className="conversation-name" style={{ fontWeight: isUnread ? 600 : 400 }}>{activeName}</div>
                                            <div className="conversation-preview subtle" style={{ fontSize: '12px' }}>
                                                {conv.last_message ? conv.last_message.substring(0, 30) + (conv.last_message.length > 30 ? '...' : '') : 'No messages'}
                                            </div>
                                        </div>
                                        <div className="conversation-meta text-right">
                                            {conv.unread_count > 0 && <div className="unread-badge" style={{ backgroundColor: 'var(--danger)', color: 'white', borderRadius: '10px', padding: '2px 6px', fontSize: '10px', display: 'inline-block' }}>{conv.unread_count}</div>}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="chat-area" style={{ display: 'flex', flexDirection: 'column' }}>
                    {activeConversation ? (
                        <>
                            <div className="chat-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
                                <h3>{activeConversation.other_user_name || 'Student'}</h3>
                            </div>
                            <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: 'var(--bg-secondary)' }}>
                                {messages.map((msg, idx) => {
                                    const isOwn = msg.sender_id === user.id;
                                    let attachmentHtml = null;
                                    try {
                                        if (msg.attachments) {
                                            const atts = typeof msg.attachments === 'string' ? JSON.parse(msg.attachments) : msg.attachments;
                                            if (atts && atts.length > 0) {
                                                const att = atts[0];
                                                const isImg = att.file_url.match(/\\.(jpeg|jpg|gif|png)$/i) != null;
                                                attachmentHtml = isImg ? (
                                                    <a href={att.file_url} target="_blank" rel="noopener noreferrer"><img src={att.file_url} alt="Attachment" style={{ maxWidth: '200px', borderRadius: '8px' }} /></a>
                                                ) : (
                                                    <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="pill blue" style={{ display: 'inline-block' }}>📄 {att.file_name}</a>
                                                );
                                            }
                                        }
                                    } catch (e) { /* ignore parse error */ }

                                    return (
                                        <div key={idx} className={`message ${isOwn ? 'own' : ''}`} style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', marginBottom: '16px' }}>
                                            {!isOwn && <div className="message-avatar" style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '8px', fontSize: '12px' }}>{getInitials(msg.sender_name)}</div>}
                                            <div style={{ maxWidth: '70%' }}>
                                                <div style={{ padding: '12px 16px', borderRadius: '16px', backgroundColor: isOwn ? 'var(--primary)' : 'white', color: isOwn ? 'white' : 'inherit', border: isOwn ? 'none' : '1px solid var(--border)' }}>
                                                    {msg.content && <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</div>}
                                                    {attachmentHtml && <div style={{ marginTop: '8px' }}>{attachmentHtml}</div>}
                                                </div>
                                                <div className="subtle" style={{ fontSize: '10px', marginTop: '4px', textAlign: isOwn ? 'right' : 'left' }}>
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {activeTypingNames.length > 0 && (
                                    <div className="subtle" style={{ fontSize: '12px', fontStyle: 'italic', marginBottom: '8px' }}>
                                        {activeTypingNames.join(', ')} is typing...
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                            <div className="chat-input-area" style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', backgroundColor: 'white' }}>
                                {fileAttachment && (
                                    <div className="mb-10 flex items-center gap-10">
                                        <span className="pill blue">📎 {fileAttachment.name}</span>
                                        <button className="btn-icon" onClick={() => { setFileAttachment(null); fileInputRef.current.value = ''; }}>&times;</button>
                                    </div>
                                )}
                                <form className="chat-input-row" style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }} onSubmit={handleSendMessage}>
                                    <input type="file" style={{ display: 'none' }} ref={fileInputRef} onChange={e => setFileAttachment(e.target.files[0])} />
                                    <button type="button" className="btn secondary" onClick={() => fileInputRef.current.click()} style={{ padding: '12px' }}>📎</button>
                                    <textarea 
                                        className="input" 
                                        style={{ flex: 1, resize: 'none', minHeight: '44px', padding: '12px' }} 
                                        placeholder="Type a message..." 
                                        value={messageInput} 
                                        onChange={handleTyping}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                                        rows="1"
                                    />
                                    <button type="submit" className="btn" disabled={sending || (!messageInput.trim() && !fileAttachment)} style={{ padding: '12px 24px' }}>
                                        {sending ? '...' : 'Send'}
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px', color: 'var(--border)' }}>💬</div>
                            <h3 style={{ color: 'var(--text-secondary)' }}>Select a Conversation</h3>
                            <p className="subtle">Choose a conversation from the left to start messaging</p>
                        </div>
                    )}
                </div>
            </main>
        </React.Fragment>
    );
};

export default Messaging;
