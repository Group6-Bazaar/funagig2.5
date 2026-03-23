import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';
import api from '../../utils/api';
import toast from '../../utils/toast';

const Messaging = () => {
    const { user } = useAuth();
    const { connected, emit, on, off } = useWebSocket();
    
    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messageInput, setMessageInput] = useState('');
    const [fileInput, setFileInput] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    
    const messagesEndRef = useRef(null);

    const loadConversations = async (silent = false) => {
        try {
            const res = await api.get('/conversations').catch(() => ({ success: false }));
            if (res.success && res.conversations) {
                setConversations(res.conversations);
            }
        } catch (error) {
            if (!silent) toast.error('Failed to load conversations.');
        }
    };

    useEffect(() => {
        loadConversations();
        const poll = setInterval(() => { if (!connected) loadConversations(true); }, 10000);
        return () => clearInterval(poll);
    }, [connected]);

    useEffect(() => {
        if (!selectedConversation) return;

        const loadMessages = async () => {
            try {
                const res = await api.get(`/messages/${selectedConversation.id}`).catch(() => ({ success: false }));
                if (res.success && res.messages) {
                    setMessages(res.messages);
                    scrollToBottom();
                }
            } catch (error) {
                toast.error('Failed to load messages.');
            }
        };

        loadMessages();
        
        if (connected) {
            emit('join_conversation', selectedConversation.id);
            emit('mark_read', { conversation_id: selectedConversation.id });

            const handleNewMessage = (msg) => {
                if (msg.conversation_id === selectedConversation.id) {
                    setMessages(prev => [...prev, msg]);
                    emit('mark_read', { conversation_id: selectedConversation.id, message_ids: [msg.id] });
                    scrollToBottom();
                }
            };

            const handleUserTyping = (data) => {
                if (data.conversation_id === selectedConversation.id && data.user_id !== user.id) {
                    setIsTyping(true);
                    setTimeout(() => setIsTyping(false), 3000);
                }
            };

            on('new_message', handleNewMessage);
            on('user_typing', handleUserTyping);

            return () => {
                off('new_message', handleNewMessage);
                off('user_typing', handleUserTyping);
                emit('leave_conversation', selectedConversation.id);
            };
        }
    }, [selectedConversation, connected, emit, on, off, user.id]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleSendMessage = async () => {
        if (!messageInput.trim() && !fileInput) return;

        let attachmentPath = null;
        let attachmentName = null;
        
        if (fileInput) {
            const formData = new FormData();
            formData.append('file', fileInput);
            formData.append('type', 'message');
            
            try {
                const uploadRes = await api.post('/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' } // Browser sets boundary automatically for most clients
                });
                
                if (uploadRes.success) {
                    attachmentPath = uploadRes.file_path;
                    attachmentName = fileInput.name;
                } else {
                    toast.error(uploadRes.error || 'Failed to upload attachment');
                    return;
                }
            } catch (error) {
                toast.error('Failed to upload file');
                return;
            }
        }

        const msgData = {
            conversation_id: selectedConversation.id,
            receiver_id: selectedConversation.other_user_id,
            content: messageInput,
            attachment_path: attachmentPath,
            attachment_name: attachmentName
        };

        try {
            const res = await api.post('/messages', msgData);
            if (res.success && res.message) {
                setMessages(prev => [...prev, res.message]);
                setMessageInput('');
                setFileInput(null);
                scrollToBottom();
                loadConversations(true); 
            } else {
                toast.error(res.error || 'Failed to send message');
            }
        } catch (error) {
            toast.error('Error sending message');
        }
    };

    const handleTyping = (e) => {
        setMessageInput(e.target.value);
        if (connected && selectedConversation) {
            emit('typing', { conversation_id: selectedConversation.id });
        }
    };

    const formatTime = (ts) => {
        if (!ts) return '';
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="messaging-container" style={{ height: 'calc(100vh - 120px)' }}>
            <div className="conversations-sidebar">
                <div className="conversations-header">
                    <h2>Messages</h2>
                </div>
                <div className="conversations-list">
                    {conversations.length === 0 ? (
                        <p className="subtle text-center mt-20">No conversations yet.</p>
                    ) : (
                        conversations.map(conv => (
                            <div 
                                key={conv.id} 
                                className={`conversation-item ${conv.unread_count > 0 ? 'unread' : ''} ${selectedConversation?.id === conv.id ? 'active' : ''}`}
                                onClick={() => {
                                    setSelectedConversation(conv);
                                    // Map local unread visually
                                    setConversations(conversations.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
                                }}
                            >
                                <div className="conversation-avatar">{(conv.other_user_name || 'U')[0].toUpperCase()}</div>
                                <div className="conversation-content">
                                    <div className="conversation-name">{conv.other_user_name}</div>
                                    <div className="conversation-preview">{conv.last_message || 'No messages yet'}</div>
                                </div>
                                <div className="conversation-meta">
                                    <div className="conversation-time">{formatTime(conv.last_message_time)}</div>
                                    {conv.unread_count > 0 && <div className="unread-badge">{conv.unread_count}</div>}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="chat-area" style={{ display: 'flex', flexDirection: 'column' }}>
                {selectedConversation ? (
                    <>
                        <div className="chat-header">
                            <div className="chat-user-info">
                                <div className="chat-user-avatar">{(selectedConversation.other_user_name || 'U')[0].toUpperCase()}</div>
                                <div className="chat-user-details">
                                    <h3>{selectedConversation.other_user_name}</h3>
                                </div>
                            </div>
                        </div>

                        <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                            {messages.map(msg => (
                                <div key={msg.id} className={`message ${msg.sender_id === user.id ? 'own' : ''}`}>
                                    {msg.sender_id !== user.id && <div className="message-avatar">{(msg.sender_name || 'U')[0].toUpperCase()}</div>}
                                    <div className="message-content">
                                        {msg.content && <div className="message-text">{msg.content}</div>}
                                        {msg.attachments?.map((att, i) => (
                                            <div key={i} className="message-attachment">
                                                <a href={att.file_url || `/${att.file_path}`} target="_blank" rel="noreferrer" className="attachment-link">
                                                    📄 {att.file_name}
                                                </a>
                                            </div>
                                        ))}
                                        <div className="message-time">{formatTime(msg.created_at)}</div>
                                    </div>
                                    {msg.sender_id === user.id && <div className="message-avatar">{user.name[0].toUpperCase()}</div>}
                                </div>
                            ))}
                            {isTyping && (
                                <div className="typing-indicator" style={{ display: 'flex' }}>
                                    <div className="typing-dots"><span></span><span></span><span></span></div>
                                    <span className="typing-text">{selectedConversation.other_user_name} is typing...</span>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="chat-input-area">
                            {fileInput && (
                                <div className="file-preview-container" style={{ display: 'block' }}>
                                    <div className="file-preview-item">
                                        <span className="file-preview-name">{fileInput.name}</span>
                                        <button className="file-preview-remove" onClick={() => setFileInput(null)}>×</button>
                                    </div>
                                </div>
                            )}
                            <div className="chat-input-row">
                                <label className="btn-icon" style={{ cursor: 'pointer' }} title="Attach File">
                                    📎
                                    <input type="file" style={{ display: 'none' }} onChange={e => setFileInput(e.target.files[0])} />
                                </label>
                                <textarea 
                                    placeholder="Type message..." 
                                    rows="1" 
                                    value={messageInput} 
                                    onChange={handleTyping}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                />
                                <button className="btn-icon" onClick={handleSendMessage} title="Send">➤</button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="no-conversation">
                        <h3>Select Conversation</h3>
                        <p>Chats start when an employer messages you.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Messaging;
