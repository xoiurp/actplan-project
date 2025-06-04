# 🔧 COMO CORRIGIR: Descrições DARF Perdidas

## ❌ **Problema**
Após salvar um pedido, a tabela DARF perde as descrições dos impostos, mostrando apenas os códigos (ex: `6912` em vez de `6912 - PIS - NÃO CUMULATIVO`).

## ✅ **Causa**
O campo `denominacao` não existe na tabela `order_items` do banco de dados.

## 🛠️ **SOLUÇÃO RÁPIDA**

### **Opção 1: Supabase Dashboard (RECOMENDADO)**

1. **Acesse o Supabase Dashboard:**
   - Vá para [app.supabase.com](https://app.supabase.com)
   - Faça login na sua conta
   - Selecione seu projeto

2. **Abra o SQL Editor:**
   - No menu lateral, clique em **SQL Editor** (ícone `</>`)
   - Ou vá para: `https://app.supabase.com/project/SEU_PROJETO_ID/sql`

3. **Execute este SQL:**
   ```sql
   -- Adicionar campo denominacao à tabela order_items
   ALTER TABLE order_items ADD COLUMN IF NOT EXISTS denominacao text;
   
   -- Verificar se foi adicionado
   SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'order_items' 
   AND column_name = 'denominacao';
   ```

4. **Verificar resultado:**
   - Deve retornar uma linha com: `denominacao | text | YES`
   - Se retornar vazio, tente novamente

### **Opção 2: Console do Navegador**

1. **Abra o DevTools:**
   - Pressione `F12` na aplicação
   - Vá para a aba **Console**

2. **Execute este código:**
   ```javascript
   // Verificar se o campo existe
   const checkField = async () => {
     const { data, error } = await window.supabase
       .from('order_items')
       .select('id, denominacao')
       .limit(1);
     
     if (error) {
       console.error('❌ Campo denominacao não existe:', error.message);
       return false;
     }
     
     console.log('✅ Campo denominacao existe!');
     return true;
   };
   
   checkField();
   ```

### **Opção 3: Via psql (Usuários Avançados)**

Se você tem acesso direto ao PostgreSQL:

```bash
psql "postgresql://postgres:[SUA_SENHA]@db.[SEU_PROJETO].supabase.co:5432/postgres"
```

```sql
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS denominacao text;
```

## 🧪 **TESTE**

Após executar a migração:

1. **Crie um novo pedido** com importação DARF
2. **Salve o pedido**
3. **Acesse o pedido novamente**
4. **Verifique** se as descrições aparecem na coluna "Código/Receita"

**Resultado esperado:**
```
Antes: 6912
Depois: 6912
        PIS - NÃO CUMULATIVO (LEI 10.637/02)
```

## 🐛 **Debug Temporário**

O sistema agora mostra logs no console do navegador. Abra o DevTools (`F12`) e verifique:

- ✅ **Se aparecer:** `🔍 DARF Item Debug: { denominacao: "PIS - NÃO CUMULATIVO..." }`
- ❌ **Se aparecer:** `🔍 DARF Item Debug: { denominacao: null }`

## 📞 **Se não funcionar**

1. **Verifique as permissões** do usuário no Supabase
2. **Tente usar o usuário admin** para executar o SQL
3. **Confirme** que está no projeto correto
4. **Reinicie** a aplicação após a migração

## 🎯 **Arquivos Alterados**

- ✅ `api.ts` - Salvamento da denominacao
- ✅ `darfProcessor.ts` - Extração da denominacao
- ✅ `OrderItemsTable.tsx` - Exibição da denominacao
- ❌ **BANCO DE DADOS** - Campo denominacao ausente (CORRIGIR!)

## 🔄 **Processo Completo**

1. **Extração PDF** → Backend retorna `{ codigo: "6912", denominacao: "PIS..." }`
2. **Frontend** → Processa e cria item com `denominacao`
3. **Salvamento** → ✅ Agora salva a `denominacao` no banco
4. **Recarregamento** → ✅ Agora recupera a `denominacao` do banco
5. **Exibição** → ✅ Mostra código + descrição

**Execute o SQL e teste!** 🚀 