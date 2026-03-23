import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from '../utils/toast';

const WebSocketContext = createContext();

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (!user) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
                setConnected(false);
            }
            return;
        }

        const WEBSOCKET_URL = 'http://localhost:3001';
        let sessionId = null;
        
        // Simple way to extract PHPSESSID or just use the user token.
        // FunaGig backend auth currently relies on standard PHP sessions via cookies.
        const match = document.cookie.match(/(?:(?:^|.*;\s*)PHPSESSID\s*\=\s*([^;]*).*$)|^.*$/);
        if (match && match[1]) {
            sessionId = match[1];
        }

        const newSocket = io(WEBSOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            autoConnect: false
        });

        newSocket.on('connect', () => {
            console.log('WebSocket connected');
            setConnected(true);
            
            // Authenticate immediately after connection
            newSocket.emit('authenticate', {
                session_id: sessionId,
                user_id: user.id,
                role: user.role
            });
        });

        newSocket.on('authenticated', (data) => {
            console.log('WebSocket authenticated:', data);
        });

        newSocket.on('unauthorized', (error) => {
            console.error('WebSocket authentication error:', error);
            toast.error('Real-time connection failed. Please refresh.');
        });

        newSocket.on('disconnect', (reason) => {
            console.log('WebSocket disconnected:', reason);
            setConnected(false);
        });

        newSocket.on('notification_received', (notification) => {
            toast.info(notification.message || 'You have a new notification');
        });

        newSocket.connect();
        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [user]);

    const value = {
        socket,
        connected,
        emit: (event, data) => socket?.emit(event, data),
        on: (event, callback) => socket?.on(event, callback),
        off: (event, callback) => socket?.off(event, callback)
    };

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    );
};
