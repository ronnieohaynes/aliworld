export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: null } }),
    getUser: async () => ({ data: { user: null }, error: null }),
  },
  from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
    upsert: async () => ({ error: null }),
    insert: async () => ({ error: null }),
  }),
  functions: {
    invoke: async () => ({ data: null, error: new Error('stub') }),
  },
}
