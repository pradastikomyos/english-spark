import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// WARNING: The service role key should be stored as an environment variable
// and not be hardcoded in the function. This is for demonstration purposes.
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

serve(async (req) => {
  // 1. Check if the request method is POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // 2. Parse the request body
    const { name, email } = await req.json()
    if (!name || !email) {
      return new Response(JSON.stringify({ error: 'Name and email are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 3. Create a Supabase client with the service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    // 4. Generate a random temporary password
    const temporaryPassword = Math.random().toString(36).slice(-8)

    // 5. Create the new user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.createUser({
      email: email,
      password: temporaryPassword,
      email_confirm: true, // Auto-confirm email for simplicity
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('User creation failed')

    const userId = authData.user.id

    // 6. Create the teacher profile
    const { data: teacherData, error: teacherError } = await supabaseAdmin
      .from('teachers')
      .insert({ name, email, id: userId }) // Using user_id as teacher id
      .select()
      .single()

    if (teacherError) throw teacherError

    // 7. Assign the user role
    const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
      user_id: userId,
      role: 'teacher',
      profile_id: teacherData.id,
    })

    if (roleError) throw roleError

    // 8. Return success response
    // In a real application, you might want to email the temporary password to the teacher.
    return new Response(
      JSON.stringify({ 
        message: 'Teacher created successfully!', 
        teacher: teacherData,
        temporaryPassword: temporaryPassword // For demonstration only
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
