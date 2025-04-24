import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button'; // Corrected path
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // Corrected path
import { Input } from '@/components/ui/input'; // Corrected path
import { Label } from '@/components/ui/label'; // Corrected path
import { supabase } from '@/lib/supabase'; // Corrected path
import { Loader2 } from 'lucide-react'; // Import Loader icon

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      // Navigate to dashboard on successful login
      navigate('/dashboard'); 

    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Ocorreu um erro durante o login.');
    } finally {
      setIsLoading(false);
    }
  };

  // TODO: Implement Social Logins (Apple/Google) later if needed
  // const handleSocialLogin = async (provider: 'apple' | 'google') => { ... };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Bem-vindo de volta</CardTitle>
          <CardDescription>Entre com seu email e senha</CardDescription>
          {/* Social login can be added back later */}
          {/* <CardDescription>Login with your Apple or Google account</CardDescription> */}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="grid gap-6">
              {/* Social Login Buttons (Placeholder) */}
              {/* 
              <div className="flex flex-col gap-4">
                <Button variant="outline" className="w-full" type="button" disabled={isLoading}>
                  Login with Apple
                </Button>
                <Button variant="outline" className="w-full" type="button" disabled={isLoading}>
                  Login with Google
                </Button>
              </div>
              <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                <span className="relative z-10 bg-background px-2 text-muted-foreground">Ou continue com</span>
              </div> 
              */}
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="seu@email.com" 
                    required
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password">Senha</Label>
                    {/* TODO: Implement Forgot Password */}
                    {/* <a href="#" className="ml-auto text-sm underline-offset-4 hover:underline">
                      Esqueceu sua senha?
                    </a> */}
                  </div>
                  <Input 
                    id="password" 
                    type="password" 
                    required
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Entrar'}
                </Button>
              </div>
              <div className="text-center text-sm">
                Não tem uma conta?{" "}
                <a href="/signup" className="underline underline-offset-4 hover:text-primary">
                  Cadastre-se
                </a>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      {/* Optional: Terms links can be added if needed */}
      {/* <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary  ">
        By clicking continue, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
      </div> */}
    </div>
  );
}
