// MOCK API CLIENT
// This file replaces the old BaaS client to prevent the app from crashing.
// As you migrate components to use `useAppState` and the Express backend, 
// you will gradually remove imports to this apiClient.

const createChainable = (resolveValue) => {
    const chainable = {
        select: () => chainable,
        eq: () => chainable,
        or: () => chainable,
        in: () => chainable,
        order: () => chainable,
        limit: () => chainable,
        single: () => Promise.resolve(resolveValue),
        insert: () => chainable,
        update: () => chainable,
        delete: () => chainable,
        then: (cb) => Promise.resolve(resolveValue).then(cb)
    };
    // Make the chainable itself a promise so `await apiClient.from(...)` works
    chainable.then = (onFulfilled) => Promise.resolve(resolveValue).then(onFulfilled);
    return chainable;
};

export const apiClient = {
    from: (tableName) => {
        return createChainable({ data: [], error: null });
    },
    channel: () => ({
        on: () => ({ subscribe: () => {} }),
        send: () => Promise.resolve(),
        unsubscribe: () => Promise.resolve()
    }),
    removeChannel: () => Promise.resolve(),
    auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: () => Promise.resolve({ data: { user: null }, error: null }),
        signUp: () => Promise.resolve({ data: { user: null }, error: null }),
        signOut: () => Promise.resolve({ error: null })
    },
    storage: {
        from: () => ({
            upload: () => Promise.resolve({ data: null, error: null }),
            getPublicUrl: () => ({ data: { publicUrl: '' } }),
            remove: () => Promise.resolve({ data: null, error: null })
        })
    }
};
