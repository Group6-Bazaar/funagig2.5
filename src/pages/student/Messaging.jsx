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
    const [isTyping, setIsTyping] = useState(false);
    
    const messagesEndRef = useRef(null);

    const loadConversations = async () => {
        if (!user) return;
        try {
            // Using conversation_details view
            const { data, error } = await supabase
                .from('conversation_details')
                .select('*')
                .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
                .order('updated_at', { ascending: false });

            if (data) {
                // Map the conversation view output for the current user
                const formatted = data.map(conv => {
                    const isUser1 = conv.user1_id === user.id;
                    return {
                        id: conv.id,
                        other_user_id: isUser1 ? conv.user2_id : conv.user1_id,
                        other_user_name: isUser1 ? conv.user2_name : conv.user1_name,
                        last_message: conv.last_message_content,
                        last_message_time: conv.updated_at,   
                        unread_count: 0 // Need separate query for unread
                    };
                });
                setConversations(formatted);
            }
        } catch (error) {
            console.error('Failed to load conversations', error);
        }
    };

    useEffect(() => {
        loadConversations();
    }, [user]);

    useEffect(() => {
        if (!selectedConversation) return;

        const loadMessages = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select('*, sender:users!messages_sender_id_fkey(name)')
                .eq('conversation_id', selectedConversation.id)
                .order('created_at', { ascending: true });

            if (data) {
                const formattedMsgs = data.map(m => ({
                    ...m,
                    sender_name: m.sender?.name || 'Unknown'
                }));
                setMessages(formattedMsgs);
                scrollToBottom();
            }
        };

        loadMessages();

        // Subscribe to new messages for this conversation
        const messageSubscription = supabase
            .channel(`public:messages:conversation_id=eq.${selectedConversation.id}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages',
                filter: `conversation_id=eq.${selectedConversation.id}` 
            }, async (payload) => {
                const newMsg = payload.new;
                // Fetch sender name
                const { data: senderData } = await supabase.from('users').select('name').eq('id', newMsg.sender_id).single();
                newMsg.sender_name = senderData?.name || 'Unknown';
                
                setMessages(prev => [...prev, newMsg]);
                
                // Mark as read if not sender
                if (newMsg.sender_id !== user.id) {
                    supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id).then();
                }
                
                scrollToBottom();
                loadConversations();
            })
            .subscribe();

        // Typing indicator via Supabase Presence (mocked with simple broadcast if preferred)
        const typingChannel = supabase.channel(`typing:${selectedConversation.id}`);
        typingChannel
            .on('broadcast', { event: 'typing' }, payload => {
                if (payload.user_id !== user.id) {
                    setIsTyping(payload.isTyping);
                }
            })
            .subscribe();

        return () => {
            messageSubscription.unsubscribe();
            typingChannel.unsubscribe();
        };
    }, [selectedConversation, user]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleSendMessage = async () => {
        if (!messageInput.trim() && !fileInput) return;

        let attachmentArr = null;
        
        if (fileInput) {
            try {
                const fileExt = fileInput.name.split('.').pop();
                const fileName = `${user.id}-${Math.random()}.${fileExt}`;
                const filePath = `chat-attachments/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('attachments')
                    .upload(filePath, fileInput);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('attachments')
                    .getPublicUrl(filePath);

                attachmentArr = [{
                    file_name: fileInput.name,
                    file_url: publicUrl,
                    file_type: fileInput.type
                }];
            } catch (error) {
                toast.error('Failed to upload file');
                return;
            }
        }

        const msgData = {
            conversation_id: selectedConversation.id,
            sender_id: user.id,
            receiver_id: selectedConversation.other_user_id,
            content: messageInput,
            attachments: attachmentArr ? JSON.stringify(attachmentArr) : null
        };

        try {
            const { error } = await supabase.from('messages').insert([msgData]);
            
            if (error) throw error;
            
            // Re-update conversation's updated_at
            await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', selectedConversation.id);

            setMessageInput('');
            setFileInput(null);
            scrollToBottom();
            
            // Clear typing
            const typingChannel = supabase.channel(`typing:${selectedConversation.id}`);
            typingChannel.send({ type: 'broadcast', event: 'typing', payload: { user_id: user.id, isTyping: false }});
            
        } catch (error) {
            toast.error('Error sending message');
        }
    };

    const typingTimeoutRef = useRef(null);
    const handleTyping = (e) => {
        setMessageInput(e.target.value);
        if (selectedConversation) {
            const typingChannel = supabase.channel(`typing:${selectedConversation.id}`);
            typingChannel.send({ type: 'broadcast', event: 'typing', payload: { user_id: user.id, isTyping: true }});
            
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                typingChannel.send({ type: 'broadcast', event: 'typing', payload: { user_id: user.id, isTyping: false }});
            }, 3000);
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
                                } catch (e) { /* ignore */ }

                                return (
                                <div key={msg.id || idx} className={`message ${isOwn ? 'own' : ''}`}>
                                    {!isOwn && <div className="message-avatar">{(msg.sender_name || 'U')[0].toUpperCase()}</div>}
                                    <div className="message-content">
                                        {msg.content && <div className="message-text">{msg.content}</div>}
                                        {attachmentHtml && <div style={{ marginTop: '8px' }}>{attachmentHtml}</div>}
                                        <div className="message-time">{formatTime(msg.created_at)}</div>
                                    </div>
                                    {isOwn && <div className="message-avatar">{user.name[0].toUpperCase()}</div>}
                                </div>
                                )
                            })}
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
                            <div className="chat-input-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label className="btn-icon" style={{ cursor: 'pointer', padding: '8px' }} title="Attach File">
                                    📎
                                    <input type="file" style={{ display: 'none' }} onChange={e => setFileInput(e.target.files[0])} />
                                </label>
                                <textarea 
                                    className="input"
                                    style={{ flex: 1, resize: 'none', margin: 0, padding: '12px' }}
                                    placeholder="Type message..." 
                                    rows="1" 
                                    value={messageInput} 
                                    onChange={handleTyping}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                />
                                <button className="btn-icon" style={{ padding: '8px 16px' }} onClick={handleSendMessage} disabled={(!messageInput.trim() && !fileInput)} title="Send">➤</button>
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
