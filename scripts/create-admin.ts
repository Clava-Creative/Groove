/**
 * Run once to create the first admin user:
 * npx tsx scripts/create-admin.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as readline from 'readline'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const ask = (q: string) => new Promise<string>((res) => rl.question(q, res))

async function main() {
  console.log('\n=== Criar admin Groove ===\n')
  const name = await ask('Nome: ')
  const email = await ask('E-mail: ')
  const password = await ask('Senha (mín. 8 chars): ')
  rl.close()

  const { data: user, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authErr || !user.user) {
    console.error('Erro ao criar auth user:', authErr?.message)
    process.exit(1)
  }

  const { error: profileErr } = await supabase.from('users').insert({
    auth_id: user.user.id,
    role: 'admin',
    name,
    email,
    client_id: null,
  })

  if (profileErr) {
    console.error('Erro ao criar perfil:', profileErr.message)
    await supabase.auth.admin.deleteUser(user.user.id)
    process.exit(1)
  }

  console.log(`\n✅ Admin criado com sucesso! E-mail: ${email}`)
  process.exit(0)
}

main().catch(console.error)
