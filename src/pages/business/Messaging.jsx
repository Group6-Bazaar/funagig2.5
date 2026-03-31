import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import toast from '../../utils/toast';

const Messaging = () => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messageInput, setMessageInput] = useState('');
    const [fileInput, setFileInput] = useState(null);
    const [filePreviewUrl, setFilePreviewUrl] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showMobileSidebar, setShowMobileSidebar] = useState(true);

    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const fileInputRef = useRef(null);

    const loadConversations = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('conversation_summary')
                .select('*')
                .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
                .order('last_message_time', { ascending: false, nullsFirst: false });

            if (error) throw error;

            if (data) {
                const formatted = data.map(conv => {
                    const isUser1 = conv.user1_id === user.id;
                    return {
                        id: conv.id,
                        other_user_id: isUser1 ? conv.user2_id : conv.user1_id,
                        other_user_name: isUser1 ? conv.user2_name : conv.user1_name,
                        last_message: conv.last_message,
                        last_message_time: conv.last_message_time || conv.created_at,
                        unread_count: 0,
                    };
                });
                setConversations(formatted);
            }
        } catch (err) { console.error('Error loading conversations:', err); }
    };

    useEffect(() => { loadConversations(); }, [user]);

    useEffect(() => {
        if (!selectedConversation) return;

        const loadMessages = async () => {
            const { data } = await supabase
                .from('messages')
                .select('*, sender:users!messages_sender_id_fkey(name)')
                .eq('conversation_id', selectedConversation.id)
                .order('created_at', { ascending: true });

            if (data) {
                setMessages(data.map(m => ({ ...m, sender_name: m.sender?.name || 'Unknown' })));
                scrollToBottom();
            }
        };

        loadMessages();

        const msgSub = supabase
            .channel(`messages:${selectedConversation.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedConversation.id}` },
                async (payload) => {
                    const newMsg = payload.new;
                    const { data: sd } = await supabase.from('users').select('name').eq('id', newMsg.sender_id).single();
                    newMsg.sender_name = sd?.name || 'Unknown';
                    setMessages(prev => [...prev, newMsg]);
                    if (newMsg.sender_id !== user.id) {
                        supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id).then();
                    }
                    scrollToBottom();
                    loadConversations();
                })
            .subscribe();

        const typingCh = supabase.channel(`typing:${selectedConversation.id}`)
            .on('broadcast', { event: 'typing' }, payload => {
                if (payload.user_id !== user.id) setIsTyping(payload.isTyping);
            })
            .subscribe();

        return () => { msgSub.unsubscribe(); typingCh.unsubscribe(); };
    }, [selectedConversation, user]);

    const scrollToBottom = () => setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setFileInput(file);
        if (file.type.startsWith('image/')) {
            setFilePreviewUrl(URL.createObjectURL(file));
        } else {
            setFilePreviewUrl(null);
        }
    };

    const handleSendMessage = async () => {
        if (!messageInput.trim() && !fileInput) return;
        let attachmentArr = null;

        if (fileInput) {
            try {
                const ext = fileInput.name.split('.').pop();
                const path = `chat-attachments/${user.id}-${Date.now()}.${ext}`;
                const { error: upErr } = await supabase.storage.from('attachments').upload(path, fileInput);
                if (upErr) throw upErr;
                const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(path);
                attachmentArr = [{ file_name: fileInput.name, file_url: publicUrl, file_type: fileInput.type }];
            } catch { toast.error('Failed to upload file'); return; }
        }

        try {
            const { error } = await supabase.from('messages').insert([{
                conversation_id: selectedConversation.id,
                sender_id: user.id,
                content: messageInput,
            }]);
            if (error) throw error;
            await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', selectedConversation.id);
            setMessageInput('');
            setFileInput(null);
            setFilePreviewUrl(null);
        } catch (error) { 
            console.error('Send message error:', error);
            toast.error(error?.message || 'Error sending message'); 
        }
    };

    const handleTyping = (e) => {
        setMessageInput(e.target.value);
        if (!selectedConversation) return;
        const ch = supabase.channel(`typing:${selectedConversation.id}`);
        ch.send({ type: 'broadcast', event: 'typing', payload: { user_id: user.id, isTyping: true } });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            ch.send({ type: 'broadcast', event: 'typing', payload: { user_id: user.id, isTyping: false } });
        }, 3000);
    };

    const formatTime = (ts) => {
        if (!ts) return '';
        const d = new Date(ts);
        const now = new Date();
        const diffDays = Math.floor((now - d) / 86400000);
        if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const avatarColors = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b'];
    const getAvatarColor = (name) => avatarColors[(name || '').charCodeAt(0) % avatarColors.length];

    const Avatar = ({ name, size = 40, style = {} }) => (
        <div style={{
            width: size, height: size, borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg, ${getAvatarColor(name)}, ${getAvatarColor((name || '  ')[1])})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: '700', fontSize: size * 0.4,
            fontFamily: 'var(--font-heading)', ...style
        }}>
            {(name || 'U')[0].toUpperCase()}
        </div>
    );

    const filteredConversations = conversations.filter(c =>
        (c.other_user_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const onSelectConversation = (conv) => {
        setSelectedConversation(conv);
        setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
        setShowMobileSidebar(false);
    };

    return (
        <div className="ig-dm-container">
            {/* Conversations Sidebar */}
            <div className={`ig-sidebar ${showMobileSidebar ? 'mobile-visible' : 'mobile-hidden'}`}>
                <div className="ig-sidebar-header">
                    <span className="ig-sidebar-title">{user?.name || 'Messages'}</span>
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ cursor: 'pointer', opacity: 0.7 }}>
                        <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                </div>

                <div className="ig-search-bar">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ opacity: 0.5, flexShrink: 0 }}>
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        className="ig-search-input"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="ig-conv-list">
                    {filteredConversations.length === 0 ? (
                        <div className="ig-empty-state">
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
                            <p>No conversations yet</p>
                        </div>
                    ) : filteredConversations.map(conv => (
                        <div
                            key={conv.id}
                            className={`ig-conv-item ${selectedConversation?.id === conv.id ? 'active' : ''}`}
                            onClick={() => onSelectConversation(conv)}
                        >
                            <div style={{ position: 'relative' }}>
                                <Avatar name={conv.other_user_name} size={56} />
                                <div className="ig-online-dot" />
                            </div>
                            <div className="ig-conv-info">
                                <div className="ig-conv-name">{conv.other_user_name}</div>
                                <div className="ig-conv-preview">
                                    {conv.last_message ? conv.last_message.substring(0, 35) + (conv.last_message.length > 35 ? '…' : '') : 'No messages yet'}
                                    {conv.last_message_time && <span className="ig-conv-dot">·</span>}
                                    {conv.last_message_time && <span className="ig-conv-time">{formatTime(conv.last_message_time)}</span>}
                                </div>
                            </div>
                            {conv.unread_count > 0 && <div className="ig-unread-dot">{conv.unread_count}</div>}
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className={`ig-chat-area ${!showMobileSidebar ? 'mobile-visible' : 'mobile-hidden'}`}>
                {selectedConversation ? (
                    <>
                        {/* Chat Header */}
                        <div className="ig-chat-header">
                            <button className="ig-back-btn" onClick={() => setShowMobileSidebar(true)}>
                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path d="M19 12H5M12 5l-7 7 7 7" />
                                </svg>
                            </button>
                            <Avatar name={selectedConversation.other_user_name} size={40} />
                            <div style={{ marginLeft: '12px' }}>
                                <div className="ig-chat-name">{selectedConversation.other_user_name}</div>
                                <div className="ig-chat-status">Active now</div>
                            </div>
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '18px' }}>
                                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ cursor: 'pointer', opacity: 0.8 }}>
                                    <path d="M22 16.92V19a2 2 0 01-2.18 2A19.79 19.79 0 013 4.18 2 2 0 015 2h2.09a2 2 0 012 1.72c.13.96.37 1.9.72 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0122 16.92z" />
                                </svg>
                                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ cursor: 'pointer', opacity: 0.8 }}>
                                    <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                                </svg>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="ig-messages">
                            {/* Date divider for first message */}
                            {messages.length === 0 && (
                                <div className="ig-date-divider">
                                    <Avatar name={selectedConversation.other_user_name} size={80} style={{ margin: '0 auto 16px' }} />
                                    <div className="ig-chat-name" style={{ textAlign: 'center', marginBottom: '4px' }}>{selectedConversation.other_user_name}</div>
                                    <p style={{ color: 'var(--muted)', fontSize: '13px', textAlign: 'center' }}>Say hi to start the conversation</p>
                                </div>
                            )}

                            {messages.map((msg, idx) => {
                                const isOwn = msg.sender_id === user.id;
                                const prevMsg = messages[idx - 1];
                                const showAvatar = !isOwn && (!prevMsg || prevMsg.sender_id !== msg.sender_id);
                                const isSameGroup = prevMsg && prevMsg.sender_id === msg.sender_id;

                                let attachment = null;
                                try {
                                    if (msg.attachments) {
                                        const atts = typeof msg.attachments === 'string' ? JSON.parse(msg.attachments) : msg.attachments;
                                        if (atts?.length > 0) {
                                            const att = atts[0];
                                            const isImg = /\.(jpeg|jpg|gif|png|webp)$/i.test(att.file_url);
                                            attachment = isImg ? (
                                                <a href={att.file_url} target="_blank" rel="noopener noreferrer">
                                                    <img src={att.file_url} alt="img" className="ig-msg-image" />
                                                </a>
                                            ) : (
                                                <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="ig-msg-file">
                                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                                                    </svg>
                                                    {att.file_name}
                                                </a>
                                            );
                                        }
                                    }
                                } catch (_) {}

                                return (
                                    <div key={msg.id || idx} className={`ig-msg-row ${isOwn ? 'own' : ''} ${isSameGroup ? 'grouped' : ''}`}>
                                        {!isOwn && (
                                            <div style={{ width: 28, flexShrink: 0 }}>
                                                {showAvatar && <Avatar name={msg.sender_name} size={28} />}
                                            </div>
                                        )}
                                        <div className="ig-msg-group">
                                            {msg.content && <div className={`ig-msg-bubble ${isOwn ? 'own' : ''}`}>{msg.content}</div>}
                                            {attachment && <div style={{ marginTop: '4px' }}>{attachment}</div>}
                                            {(idx === messages.length - 1 || messages[idx + 1]?.sender_id !== msg.sender_id) && (
                                                <div className={`ig-msg-time ${isOwn ? 'own' : ''}`}>{formatTime(msg.created_at)}</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {isTyping && (
                                <div className="ig-msg-row">
                                    <Avatar name={selectedConversation.other_user_name} size={28} />
                                    <div className="ig-typing-bubble">
                                        <span /><span /><span />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="ig-input-area">
                            {fileInput && (
                                <div className="ig-file-preview">
                                    {filePreviewUrl ? (
                                        <img src={filePreviewUrl} alt="preview" style={{ height: '60px', borderRadius: '8px' }} />
                                    ) : (
                                        <div className="ig-msg-file" style={{ display: 'inline-flex' }}>
                                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                                            </svg>
                                            {fileInput.name}
                                        </div>
                                    )}
                                    <button className="ig-file-remove" onClick={() => { setFileInput(null); setFilePreviewUrl(null); }}>×</button>
                                </div>
                            )}

                            <div className="ig-input-row">
                                {/* Emoji (visual only) */}
                                <button className="ig-icon-btn" title="Emoji">
                                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
                                    </svg>
                                </button>

                                <input
                                    className="ig-text-input"
                                    placeholder="Message…"
                                    value={messageInput}
                                    onChange={handleTyping}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                />

                                {messageInput.trim() || fileInput ? (
                                    <button className="ig-send-btn" onClick={handleSendMessage}>Send</button>
                                ) : (
                                    <>
                                        {/* Attach */}
                                        <label className="ig-icon-btn" title="Attach file">
                                            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                                            </svg>
                                            <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileChange} />
                                        </label>
                                        {/* Photo */}
                                        <label className="ig-icon-btn" title="Send photo">
                                            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                                            </svg>
                                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                                        </label>
                                        {/* Like heart */}
                                        <button className="ig-icon-btn" onClick={() => { setMessageInput('❤️'); }} title="Send heart">
                                            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                            </svg>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="ig-no-conv">
                        <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity: 0.3, marginBottom: '20px' }}>
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <h3 style={{ marginBottom: '8px' }}>Your Messages</h3>
                        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Select a conversation to start chatting</p>
                    </div>
                )}
            </div>

            <style>{`
                .ig-dm-container {
                    display: flex;
                    height: calc(100vh - 64px);
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    overflow: hidden;
                    background: var(--panel-solid);
                }

                /* Sidebar */
                .ig-sidebar {
                    width: 360px;
                    min-width: 360px;
                    border-right: 1px solid var(--border);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                .ig-sidebar-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 20px 20px 12px;
                    color: var(--text);
                }
                .ig-sidebar-title {
                    font-family: var(--font-heading);
                    font-size: 18px;
                    font-weight: 700;
                }
                .ig-search-bar {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin: 0 16px 12px;
                    padding: 10px 14px;
                    background: var(--bg);
                    border-radius: 12px;
                    border: 1px solid var(--border);
                }
                .ig-search-input {
                    background: transparent;
                    border: none;
                    outline: none;
                    flex: 1;
                    font-size: 14px;
                    color: var(--text);
                }
                .ig-search-input::placeholder { color: var(--muted); }
                .ig-conv-list { flex: 1; overflow-y: auto; padding: 0 8px; }
                .ig-conv-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px 12px;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: background 0.15s;
                    margin-bottom: 2px;
                }
                .ig-conv-item:hover { background: var(--bg); }
                .ig-conv-item.active { background: var(--primary-light); }
                .ig-online-dot {
                    width: 12px; height: 12px; border-radius: 50%;
                    background: #22c55e;
                    border: 2px solid var(--panel-solid);
                    position: absolute; bottom: 2px; right: 2px;
                }
                .ig-conv-info { flex: 1; min-width: 0; }
                .ig-conv-name { font-weight: 600; font-size: 14px; color: var(--text); margin-bottom: 2px; }
                .ig-conv-preview { font-size: 13px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .ig-conv-dot { margin: 0 4px; }
                .ig-conv-time { font-size: 12px; }
                .ig-unread-dot {
                    width: 20px; height: 20px; border-radius: 50%; background: var(--primary);
                    color: white; font-size: 11px; font-weight: 700;
                    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
                }
                .ig-empty-state { display: flex; flex-direction: column; align-items: center; padding: 40px 20px; color: var(--muted); font-size: 14px; }

                /* Chat area */
                .ig-chat-area {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                    overflow: hidden;
                }
                .ig-chat-header {
                    display: flex;
                    align-items: center;
                    padding: 14px 20px;
                    border-bottom: 1px solid var(--border);
                    gap: 0;
                    flex-shrink: 0;
                }
                .ig-back-btn {
                    background: none; border: none; cursor: pointer; padding: 4px 12px 4px 0;
                    color: var(--text); display: none;
                }
                .ig-chat-name { font-weight: 700; font-size: 15px; color: var(--text); }
                .ig-chat-status { font-size: 12px; color: #22c55e; }

                /* Messages */
                .ig-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .ig-msg-row {
                    display: flex;
                    align-items: flex-end;
                    gap: 8px;
                    margin-bottom: 2px;
                }
                .ig-msg-row.own { flex-direction: row-reverse; }
                .ig-msg-row.grouped { margin-bottom: 1px; }
                .ig-msg-group { display: flex; flex-direction: column; max-width: 65%; }
                .ig-msg-row.own .ig-msg-group { align-items: flex-end; }
                .ig-msg-bubble {
                    padding: 10px 14px;
                    border-radius: 22px;
                    font-size: 14px;
                    line-height: 1.5;
                    color: var(--text);
                    background: var(--bg);
                    border: 1px solid var(--border);
                    word-break: break-word;
                    display: inline-block;
                }
                .ig-msg-bubble.own {
                    background: var(--primary);
                    color: white;
                    border-color: transparent;
                }
                .ig-msg-time {
                    font-size: 11px;
                    color: var(--muted);
                    margin: 3px 4px 6px;
                }
                .ig-msg-time.own { text-align: right; }
                .ig-msg-image {
                    max-width: 220px;
                    border-radius: 16px;
                    display: block;
                }
                .ig-msg-file {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 12px;
                    background: var(--bg);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    font-size: 13px;
                    color: var(--primary);
                    text-decoration: none;
                    font-weight: 600;
                }
                .ig-typing-bubble {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    padding: 12px 16px;
                    background: var(--bg);
                    border: 1px solid var(--border);
                    border-radius: 22px;
                }
                .ig-typing-bubble span {
                    width: 7px; height: 7px; border-radius: 50%;
                    background: var(--muted);
                    animation: igTyping 1.2s infinite ease-in-out;
                }
                .ig-typing-bubble span:nth-child(2) { animation-delay: 0.2s; }
                .ig-typing-bubble span:nth-child(3) { animation-delay: 0.4s; }
                @keyframes igTyping {
                    0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
                    40% { transform: scale(1.1); opacity: 1; }
                }
                .ig-date-divider { padding: 24px 0; text-align: center; }

                /* Input area */
                .ig-input-area {
                    border-top: 1px solid var(--border);
                    padding: 12px 16px;
                    flex-shrink: 0;
                }
                .ig-file-preview {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px 12px;
                    margin-bottom: 8px;
                    background: var(--bg);
                    border-radius: 12px;
                    border: 1px solid var(--border);
                }
                .ig-file-remove {
                    background: none; border: none; cursor: pointer; font-size: 18px;
                    color: var(--muted); margin-left: auto; padding: 0 4px;
                }
                .ig-input-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: var(--bg);
                    border: 1.5px solid var(--border);
                    border-radius: 24px;
                    padding: 6px 8px 6px 14px;
                }
                .ig-text-input {
                    flex: 1;
                    background: transparent;
                    border: none;
                    outline: none;
                    font-size: 14px;
                    color: var(--text);
                    font-family: var(--font-body);
                    padding: 4px 0;
                    min-width: 0;
                }
                .ig-text-input::placeholder { color: var(--muted); }
                .ig-icon-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: var(--text);
                    padding: 4px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.15s;
                    flex-shrink: 0;
                }
                .ig-icon-btn:hover { background: var(--primary-light); }
                .ig-send-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: var(--primary);
                    font-weight: 700;
                    font-size: 14px;
                    padding: 4px 8px;
                    flex-shrink: 0;
                }
                .ig-send-btn:hover { opacity: 0.75; }

                /* No conversation */
                .ig-no-conv {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: var(--text);
                }

                /* Responsive */
                @media (max-width: 768px) {
                    .ig-sidebar { width: 100%; min-width: unset; border-right: none; }
                    .ig-sidebar.mobile-hidden { display: none; }
                    .ig-chat-area.mobile-hidden { display: none; }
                    .ig-chat-area.mobile-visible,
                    .ig-sidebar.mobile-visible { display: flex; }
                    .ig-back-btn { display: flex; }
                    .ig-dm-container { border-radius: 0; height: calc(100vh - 58px); }
                }
            `}</style>
        </div>
    );
};

export default Messaging;
