@echo off
echo Aplicando migration para adicionar campo valor_reducao...
npx supabase db push
echo Migration aplicada com sucesso!
pause
