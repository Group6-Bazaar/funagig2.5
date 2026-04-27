import { useState, useCallback, useEffect } from 'react';
import { gigService } from '../services/gigService';
import { applicationService } from '../services/applicationService';
import { messageService } from '../services/messageService';
import toast from '../utils/toast';

export const useAppState = () => {
  const [state, setState] = useState({
    gigs: [],
    applications: [],
    conversations: [],
    messages: {}, // { convId: [msg1, msg2] }
    activeConversationId: null,
    metrics: null
  });
  
  const [loading, setLoading] = useState({
    gigs: false,
    applications: false,
    conversations: false,
    messages: false
  });
  
  const [errors, setErrors] = useState({});

  const updateLoading = (key, value) => setLoading(prev => ({ ...prev, [key]: value }));
  const updateError = (key, error) => setErrors(prev => ({ ...prev, [key]: error }));

  // --- GIG ACTIONS ---
  const fetchGigs = useCallback(async (filters = {}) => {
    updateLoading('gigs', true);
    try {
      const data = await gigService.getGigs(filters);
      setState(prev => ({ ...prev, gigs: data }));
      updateError('gigs', null);
    } catch (err) {
      updateError('gigs', err.message);
      toast.error('Failed to load gigs');
    } finally {
      updateLoading('gigs', false);
    }
  }, []);

  const postGig = useCallback(async (gigData) => {
    try {
      const newGig = await gigService.createGig(gigData);
      setState(prev => ({ ...prev, gigs: [newGig, ...prev.gigs] }));
      toast.success('Gig posted successfully');
      return newGig;
    } catch (err) {
      toast.error(err.message || 'Failed to post gig');
      throw err;
    }
  }, []);

  // --- APPLICATION ACTIONS ---
  const applyToGig = useCallback(async (gigId, message, resumePath) => {
    const optimisticApp = {
      id: Date.now(), 
      gig_id: gigId,
      status: 'pending',
      message,
      applied_at: new Date().toISOString()
    };
    
    setState(prev => ({ ...prev, applications: [optimisticApp, ...prev.applications] }));

    try {
      const app = await applicationService.createApplication({ gig_id: gigId, message, resume_path: resumePath });
      setState(prev => ({
        ...prev,
        applications: prev.applications.map(a => a.id === optimisticApp.id ? app : a)
      }));
      toast.success('Application submitted!');
      return app;
    } catch (err) {
      setState(prev => ({ ...prev, applications: prev.applications.filter(a => a.id !== optimisticApp.id) }));
      toast.error(err.message || 'Failed to apply');
      throw err;
    }
  }, []);

  const fetchStudentApplications = useCallback(async () => {
    updateLoading('applications', true);
    try {
      const data = await applicationService.getStudentApplications();
      setState(prev => ({ ...prev, applications: data }));
    } catch (err) {
      updateError('applications', err.message);
    } finally {
      updateLoading('applications', false);
    }
  }, []);

  const updateApplicationStatus = useCallback(async (appId, status) => {
    try {
      const updatedApp = await applicationService.updateApplicationStatus(appId, status);
      setState(prev => ({
        ...prev,
        applications: prev.applications.map(a => a.id === appId ? updatedApp : a)
      }));
      toast.success(`Application marked as ${status}`);
      return updatedApp;
    } catch (err) {
      toast.error(err.message || 'Failed to update application');
      throw err;
    }
  }, []);

  // --- MESSAGE ACTIONS ---
  const fetchConversations = useCallback(async () => {
    updateLoading('conversations', true);
    try {
      const data = await messageService.getConversations();
      setState(prev => ({ ...prev, conversations: data }));
    } catch (err) {
      updateError('conversations', err.message);
    } finally {
      updateLoading('conversations', false);
    }
  }, []);

  const openConversation = useCallback(async (convId) => {
    setState(prev => ({ ...prev, activeConversationId: convId }));
    updateLoading('messages', true);
    try {
      // Fetch history
      const history = await messageService.getMessages(convId);
      setState(prev => ({
        ...prev,
        messages: { ...prev.messages, [convId]: history }
      }));

      // Connect WebSocket for real-time
      messageService.connect(convId, (incomingMessage) => {
        setState(prev => {
          const currentMessages = prev.messages[convId] || [];
          // Avoid duplicates
          if (currentMessages.find(m => m.id === incomingMessage.id)) return prev;
          return {
            ...prev,
            messages: {
              ...prev.messages,
              [convId]: [...currentMessages, incomingMessage]
            }
          };
        });
      });
    } catch (err) {
      updateError('messages', err.message);
    } finally {
      updateLoading('messages', false);
    }
  }, []);

  const closeConversation = useCallback(() => {
    setState(prev => ({ ...prev, activeConversationId: null }));
    messageService.disconnect();
  }, []);

  const sendMessage = useCallback(async (convId, content) => {
    // Optimistic message UI update
    const optimisticMsg = {
      id: Date.now(),
      conversation_id: convId,
      content,
      created_at: new Date().toISOString(),
      isOptimistic: true
    };

    setState(prev => {
      const currentMessages = prev.messages[convId] || [];
      return {
        ...prev,
        messages: {
          ...prev.messages,
          [convId]: [...currentMessages, optimisticMsg]
        }
      };
    });

    try {
      // The websocket broker broadcasts to all, but sometimes it's best to rely on the REST response
      // to replace the optimistic one.
      const realMsg = await messageService.sendMessageRest(convId, content);
      
      setState(prev => {
        const currentMessages = prev.messages[convId] || [];
        return {
          ...prev,
          messages: {
            ...prev.messages,
            [convId]: currentMessages.map(m => m.id === optimisticMsg.id ? realMsg : m)
          }
        };
      });
    } catch (err) {
      toast.error('Failed to send message');
      setState(prev => {
        const currentMessages = prev.messages[convId] || [];
        return {
          ...prev,
          messages: {
            ...prev.messages,
            [convId]: currentMessages.filter(m => m.id !== optimisticMsg.id)
          }
        };
      });
    }
  }, []);

  // Cleanup websocket on unmount
  useEffect(() => {
    return () => {
      messageService.disconnect();
    };
  }, []);

  return {
    state,
    loading,
    errors,
    actions: {
      fetchGigs,
      postGig,
      applyToGig,
      fetchStudentApplications,
      updateApplicationStatus,
      fetchConversations,
      openConversation,
      closeConversation,
      sendMessage
    }
  };
};
