// Script para adicionar o campo denominacao à tabela order_items
// Execute com: node fix-denominacao.js

import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase (substitua pelas suas)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'SUA_URL_AQUI';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'SUA_CHAVE_AQUI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function addDenominacaoField() {
  console.log('🔧 Iniciando correção do campo denominacao...');
  
  try {
    // Tentar adicionar o campo denominacao
    const { data, error } = await supabase.rpc('add_denominacao_field');
    
    if (error) {
      console.error('❌ Erro ao adicionar campo:', error);
      
      // Instrução manual caso não funcione
      console.log('\n📋 Execute este SQL manualmente no Supabase Dashboard:');
      console.log('ALTER TABLE order_items ADD COLUMN IF NOT EXISTS denominacao text;');
      console.log('\n🌐 Acesse: https://app.supabase.com > Seu Projeto > SQL Editor');
      
      return false;
    }
    
    console.log('✅ Campo denominacao adicionado com sucesso!');
    return true;
    
  } catch (err) {
    console.error('❌ Erro inesperado:', err);
    
    // Instrução manual
    console.log('\n📋 Execute este SQL manualmente no Supabase Dashboard:');
    console.log('ALTER TABLE order_items ADD COLUMN IF NOT EXISTS denominacao text;');
    console.log('\n🌐 Acesse: https://app.supabase.com > Seu Projeto > SQL Editor');
    
    return false;
  }
}

async function verifyField() {
  console.log('🔍 Verificando se o campo foi adicionado...');
  
  try {
    // Tentar fazer uma query simples que use o campo
    const { data, error } = await supabase
      .from('order_items')
      .select('id, denominacao')
      .limit(1);
    
    if (error) {
      console.error('❌ Campo denominacao ainda não existe:', error.message);
      return false;
    }
    
    console.log('✅ Campo denominacao existe e está funcionando!');
    return true;
    
  } catch (err) {
    console.error('❌ Erro ao verificar campo:', err);
    return false;
  }
}

// Executar o script
async function main() {
  console.log('🚀 Script de Correção do Campo DENOMINACAO');
  console.log('==========================================\n');
  
  // Verificar se já existe
  const exists = await verifyField();
  
  if (exists) {
    console.log('✅ Campo denominacao já existe! Nenhuma ação necessária.');
    return;
  }
  
  // Tentar adicionar
  const added = await addDenominacaoField();
  
  if (added) {
    // Verificar novamente
    await verifyField();
  }
  
  console.log('\n🎯 PRÓXIMOS PASSOS:');
  console.log('1. Se o campo foi adicionado: teste criar um novo pedido DARF');
  console.log('2. Se não funcionou: execute o SQL manualmente no dashboard');
  console.log('3. Reinicie a aplicação após a correção');
}

main().catch(console.error); 