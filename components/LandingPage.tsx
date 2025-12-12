import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  ArrowRight,
  Play,
  Star,
  ChevronDown,
  ChevronUp,
  Calendar,
  TrendingUp,
  MessageSquare,
  Heart,
  ArrowLeft,
  Check,
  CreditCard,
  Lock,
  ShieldCheck,
  User,
  Mail,
  Key,
  RefreshCw,
  Menu,
  X
} from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import PrivacyView from './PrivacyView';
import {
  FeaturesView,
  SecurityView,
  PricingView,
  AboutView,
  CareersView,
  BlogView,
  TermsView
} from './StaticPages';

interface LandingPageProps {
  onAuthSuccess: (type: 'P1' | 'P2') => void;
}

type ViewState =
  | 'landing'
  | 'subscribe'
  | 'signup'
  | 'login'
  | 'forgot_password'
  | 'verify_code'
  | 'reset_password'
  | 'privacy'
  | 'terms'
  | 'features'
  | 'security'
  | 'pricing'
  | 'about'
  | 'careers'
  | 'blog';

const LandingPage: React.FC<LandingPageProps> = ({ onAuthSuccess }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [view, setView] = useState<ViewState>('landing');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simulation state for P2 Invite
  const [isP2Invite, setIsP2Invite] = useState(false);

  // Recovery Flow State
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');

  // Scroll to top when view changes
  useEffect(() => {
    window.scrollTo(0, 0);
    setError('');
    setIsMobileMenuOpen(false); // Close mobile menu on view change
  }, [view]);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    try {
      if (isP2Invite) {
        // P2 Logic: Just sign up, association happens via invite link/token later
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) {
          // Se já existe, tenta logar para não travar o usuário
          if (error.message.includes('already registered') || error.status === 422) {
            const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
            if (signInError) throw new Error('Conta já existe. Tente entrar, mas a senha parece incorreta.');
            // Se logou, prossegue como sucesso
          } else {
            throw error;
          }
        }
        onAuthSuccess('P2');
      } else {
        // P1 Logic: Sign Up with Resilience
        let user = null;

        // 1. Tenta Criar Conta
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        // 2. Trata Erro "Already Registered"
        if (authError) {
          if (authError.message?.includes('already registered') || authError.status === 422) {
            console.log("Usuário já existe. Tentando login de recuperação...");
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email,
              password
            });

            if (signInError) {
              // Se a senha estiver errada, não podemos fazer nada, é erro mesmo.
              throw new Error('Este email já está cadastrado. Tente fazer Login.');
            }
            user = signInData.user;
          } else {
            throw authError;
          }
        } else {
          user = authData.user;
        }

        if (user) {
          // 3. Verificação de Estado (Profile Check)
          // Verifica se o perfil JÁ existe para evitar erro 406 ou duplicação
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id, role')
            .eq('id', user.id)
            .maybeSingle();

          if (existingProfile) {
            // Cenário A: Tudo certo, usuário só estava confuso. Redireciona.
            console.log("Perfil já existe. Redirecionando...");
            onAuthSuccess((existingProfile.role as 'P1' | 'P2') || 'P1');
          } else {
            // Cenário B: Usuário Zumbi (Auth ok, Profile missing). Vamos criar via RPC.
            console.log("Perfil não encontrado. Criando dados do casal via RPC...");

            // 1. RPC segura que cria o casal e tenta vincular (bypass RLS)
            const { data: coupleId, error: rpcError } = await supabase.rpc('create_couple_and_link', {
              p_couple_name: 'My Couple',
              p_risk_profile: 'medium'
            });

            if (rpcError) throw rpcError;

            // 2. Garante a criação/atualização do perfil com os dados restantes (Email, Nome, Role)
            // O RPC tenta dar update, mas se o perfil não existir (ex: falha na trigger de signup),
            // este upsert cria o registro corretamente, já com o couple_id válido.
            const { error: profileError } = await supabase
              .from('profiles')
              .upsert({
                id: user.id,
                couple_id: coupleId,
                role: 'P1',
                email: email,
                full_name: 'User',
                risk_profile: 'medium'
              });

            if (profileError) throw profileError;

            onAuthSuccess('P1');
          }
        }
      }
    } catch (err: any) {
      console.error("Erro no cadastro:", err);
      setError(err.message || 'Erro ao criar conta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // Fetch profile to determine role
      if (data.user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
        onAuthSuccess((profile?.role as 'P1' | 'P2') || 'P1');
      }
    } catch (err: any) {
      setError("Email ou senha inválidos.");
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        scopes: 'https://www.googleapis.com/auth/calendar',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    });
  };

  const handleSimulateP2 = () => {
    setIsP2Invite(true);
    setView('signup');
    alert("Simulando acesso via link de convite (P2). Você pulará o pagamento.");
  };

  // --- PASSWORD RECOVERY HANDLERS ---
  const handleRequestReset = (e: React.FormEvent) => {
    e.preventDefault();
    setView('verify_code');
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryCode.length > 0) {
      setView('reset_password');
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Senha redefinida com sucesso!");
    setView('login');
  };

  // --- HELPER FOR STATIC PAGES ---
  const renderStaticPage = (ContentComponent: React.FC) => (
    <div className="min-h-screen bg-white text-gray-800 font-sans animate-fade-in flex flex-col">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <button
            onClick={() => setView('landing')}
            className="flex items-center text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" /> Voltar
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-start to-primary-mid rounded-lg flex items-center justify-center shadow-md text-white font-bold">G</div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-primary-start via-primary-mid to-primary-end text-transparent bg-clip-text">
              Gossip Couple
            </span>
          </div>
          <div className="w-20"></div>
        </div>
      </nav>
      <div className="flex-1 bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <ContentComponent />
      </div>
      <footer className="bg-white py-8 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} Gossip Couple. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );

  // --- ROUTING FOR STATIC PAGES ---
  if (view === 'privacy') return renderStaticPage(PrivacyView);
  if (view === 'terms') return renderStaticPage(TermsView);
  if (view === 'features') return renderStaticPage(FeaturesView);
  if (view === 'security') return renderStaticPage(SecurityView);
  if (view === 'pricing') return renderStaticPage(PricingView);
  if (view === 'about') return renderStaticPage(AboutView);
  if (view === 'careers') return renderStaticPage(CareersView);
  if (view === 'blog') return renderStaticPage(BlogView);

  // --- FORGOT PASSWORD FLOW VIEWS ---
  if (view === 'forgot_password' || view === 'verify_code' || view === 'reset_password') {
    return (
      <div className="min-h-screen bg-white text-gray-800 font-sans animate-fade-in flex flex-col">
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <button
              onClick={() => setView('login')}
              className="flex items-center text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} className="mr-2" /> <span className="hidden sm:inline">Voltar ao Login</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-start to-primary-mid rounded-lg flex items-center justify-center shadow-md text-white font-bold">G</div>
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-primary-start via-primary-mid to-primary-end text-transparent bg-clip-text">
                Gossip Couple
              </span>
            </div>
            <div className="w-20"></div>
          </div>
        </nav>

        <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-pink-50/30">
          <div className="max-w-md w-full bg-white p-8 rounded-[2rem] shadow-2xl border border-gray-100 relative overflow-hidden">

            {view === 'forgot_password' && (
              <form onSubmit={handleRequestReset} className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-mid">
                    <Key size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">Recuperar Senha</h2>
                  <p className="text-gray-500 text-sm mt-2">
                    Digite seu email para receber o código de recuperação.
                  </p>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={18} className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    placeholder="Seu Email cadastrado"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-primary-mid focus:ring-1 focus:ring-primary-mid sm:text-sm transition-colors"
                    required
                  />
                </div>
                <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-gradient-to-r from-primary-start to-primary-mid hover:shadow-lg transition-all">
                  Enviar Código
                </button>
              </form>
            )}

            {view === 'verify_code' && (
              <form onSubmit={handleVerifyCode} className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500">
                    <MessageSquare size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">Verificar Email</h2>
                  <p className="text-gray-500 text-sm mt-2">
                    Insira o código de 6 dígitos enviado para <strong>{recoveryEmail}</strong>.
                  </p>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    className="block w-full text-center tracking-[0.5em] py-4 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-300 focus:outline-none focus:bg-white focus:border-primary-mid focus:ring-1 focus:ring-primary-mid text-2xl font-bold transition-colors"
                    required
                  />
                </div>
                <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-gradient-to-r from-primary-start to-primary-mid hover:shadow-lg transition-all">
                  Verificar Código
                </button>
                <div className="text-center">
                  <button type="button" onClick={() => setView('forgot_password')} className="text-xs text-primary-start font-bold hover:underline">Reenviar código</button>
                </div>
              </form>
            )}

            {view === 'reset_password' && (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500">
                    <RefreshCw size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">Nova Senha</h2>
                  <p className="text-gray-500 text-sm mt-2">
                    Crie uma senha forte para sua conta.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock size={18} className="text-gray-400" />
                    </div>
                    <input
                      type="password"
                      placeholder="Nova Senha"
                      className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-primary-mid focus:ring-1 focus:ring-primary-mid sm:text-sm transition-colors"
                      required
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock size={18} className="text-gray-400" />
                    </div>
                    <input
                      type="password"
                      placeholder="Confirmar Nova Senha"
                      className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-primary-mid focus:ring-1 focus:ring-primary-mid sm:text-sm transition-colors"
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-gradient-to-r from-primary-start to-primary-mid hover:shadow-lg transition-all">
                  Redefinir Senha
                </button>
              </form>
            )}

          </div>
        </div>
      </div>
    );
  }

  // --- LOGIN VIEW ---
  if (view === 'login') {
    return (
      <div className="min-h-screen bg-white text-gray-800 font-sans animate-fade-in flex flex-col">
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <button
              onClick={() => setView('landing')}
              className="flex items-center text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} className="mr-2" /> Voltar
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-start to-primary-mid rounded-lg flex items-center justify-center shadow-md text-white font-bold">G</div>
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-primary-start via-primary-mid to-primary-end text-transparent bg-clip-text">
                Gossip Couple
              </span>
            </div>
            <div className="w-20"></div>
          </div>
        </nav>

        <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-pink-50/30">
          <div className="max-w-md w-full bg-white p-8 rounded-[2rem] shadow-2xl border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary-start/10 to-transparent rounded-bl-full pointer-events-none"></div>

            <div className="text-center mb-8 relative z-10">
              <h2 className="text-3xl font-extrabold tracking-tight mb-1 bg-gradient-to-r from-primary-start via-primary-mid to-primary-end text-transparent bg-clip-text">
                Bem-vindo de volta
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Acesse sua conta para continuar.
              </p>
              {error && <p className="text-red-500 text-sm mt-2 font-bold">{error}</p>}
            </div>

            <form className="space-y-4" onSubmit={handleLoginSubmit}>
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={18} className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-primary-mid focus:ring-1 focus:ring-primary-mid sm:text-sm transition-colors"
                    required
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-primary-mid focus:ring-1 focus:ring-primary-mid sm:text-sm transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setView('forgot_password')}
                  className="text-xs font-bold text-primary-start hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-gradient-to-r from-primary-start to-primary-mid hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
              >
                Entrar
              </button>
            </form>

            <div className="mt-6 relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500 font-medium">OU</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-200 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="h-5 w-5 mr-2" aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M12.0003 20.45c-4.6667 0-8.4503-3.7836-8.4503-8.45 0-4.6667 3.7836-8.4503 8.4503-8.4503 2.2827 0 4.3497.829 5.9613 2.3363L16.225 7.673c-.9807-.9383-2.344-1.5227-3.9247-1.5227-3.385 0-6.15 2.765-6.15 6.15 0 3.385 2.765 6.15 6.15 2.9317 0 5.363-2.086 6.0197-4.816h-6.02v-3.45h9.488c.088.514.132 1.036.132 1.562 0 5.494-3.675 9.703-9.92 9.703z" fill="currentColor" />
                </svg>
                Entrar com Google
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Não tem uma conta?{' '}
                <button onClick={() => setView('subscribe')} className="font-bold text-primary-start hover:underline">
                  Cadastre-se
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- SIGNUP VIEW (Existing Code Refactored to match ViewState) ---
  if (view === 'signup') {
    return (
      <div className="min-h-screen bg-white text-gray-800 font-sans animate-fade-in flex flex-col">
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <button
              onClick={() => {
                if (isP2Invite) {
                  setIsP2Invite(false);
                  setView('landing');
                } else {
                  setView('subscribe');
                }
              }}
              className="flex items-center text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} className="mr-2" /> Voltar
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-start to-primary-mid rounded-lg flex items-center justify-center shadow-md text-white font-bold">G</div>
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-primary-start via-primary-mid to-primary-end text-transparent bg-clip-text">
                Gossip Couple
              </span>
            </div>
            <div className="w-20"></div>
          </div>
        </nav>

        <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-pink-50/30">
          <div className="max-w-md w-full bg-white p-8 rounded-[2rem] shadow-2xl border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary-start/10 to-transparent rounded-bl-full pointer-events-none"></div>
            <div className="text-center mb-8 relative z-10">
              <h2 className="text-3xl font-extrabold tracking-tight mb-1 bg-gradient-to-r from-primary-start via-primary-mid to-primary-end text-transparent bg-clip-text">
                Gossip Couple
              </h2>
              <h3 className="text-xl font-bold text-gray-800 mt-2">{isP2Invite ? 'Aceitar Convite' : 'Criar Conta'}</h3>
              <p className="text-gray-500 text-sm mt-1">
                {isP2Invite ? 'Cadastre-se para acessar o ambiente do casal.' : 'Comece a planejar o futuro juntos.'}
              </p>
              {error && <p className="text-red-500 text-sm mt-2 font-bold">{error}</p>}
            </div>

            <form className="space-y-4" onSubmit={handleSignupSubmit}>
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={18} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Nome Completo"
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-primary-mid focus:ring-1 focus:ring-primary-mid sm:text-sm transition-colors"
                    required
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={18} className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-primary-mid focus:ring-1 focus:ring-primary-mid sm:text-sm transition-colors"
                    required
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-primary-mid focus:ring-1 focus:ring-primary-mid sm:text-sm transition-colors"
                    required
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    placeholder="Confirmar Senha"
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-primary-mid focus:ring-1 focus:ring-primary-mid sm:text-sm transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="flex items-start mt-4">
                <div className="flex items-center h-5">
                  <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    className="focus:ring-primary-mid h-4 w-4 text-primary-start border-gray-300 rounded"
                    required
                  />
                </div>
                <div className="ml-3 text-xs">
                  <label htmlFor="terms" className="font-medium text-gray-600">
                    Aceito os <button type="button" onClick={() => setView('terms')} className="text-primary-start hover:underline">Termos de Serviço</button> e <button type="button" onClick={() => setView('privacy')} className="text-primary-start hover:underline">Política de Privacidade</button>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-gradient-to-r from-primary-start to-primary-mid hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
              >
                {isP2Invite ? 'Entrar no Casal' : 'Criar Conta'}
              </button>
            </form>

            <div className="mt-6 relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500 font-medium">OU</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-200 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="h-5 w-5 mr-2" aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M12.0003 20.45c-4.6667 0-8.4503-3.7836-8.4503-8.45 0-4.6667 3.7836-8.4503 8.4503-8.4503 2.2827 0 4.3497.829 5.9613 2.3363L16.225 7.673c-.9807-.9383-2.344-1.5227-3.9247-1.5227-3.385 0-6.15 2.765-6.15 6.15 0 3.385 2.765 6.15 6.15 2.9317 0 5.363-2.086 6.0197-4.816h-6.02v-3.45h9.488c.088.514.132 1.036.132 1.562 0 5.494-3.675 9.703-9.92 9.703z" fill="currentColor" />
                </svg>
                Cadastrar com Google
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Já tem conta?{' '}
                <button onClick={() => setView('login')} className="font-bold text-primary-start hover:underline">
                  Entrar
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- SUBSCRIPTION VIEW (P1 Flow) ---
  if (view === 'subscribe') {
    return (
      <div className="min-h-screen bg-white text-gray-800 font-sans animate-fade-in selection:bg-pink-100 flex flex-col">
        {/* Simplified Nav */}
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <button
              onClick={() => setView('landing')}
              className="flex items-center text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} className="mr-2" /> Voltar
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-start to-primary-mid rounded-lg flex items-center justify-center shadow-md text-white font-bold">G</div>
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-primary-start via-primary-mid to-primary-end text-transparent bg-clip-text">
                Gossip Couple
              </span>
            </div>
            <div className="w-20"></div> {/* Spacer for centering */}
          </div>
        </nav>

        <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-pink-50/30">
          <div className="max-w-md w-full space-y-8 text-center">

            <div>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-primary-start via-primary-mid to-primary-end text-transparent bg-clip-text pb-1">
                Menos que uma pizza
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Assinatura mensal com acesso completo para você e seu parceiro(a)
              </p>
            </div>

            {/* Pricing Card */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary-start to-primary-end rounded-[2rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-white rounded-[2rem] shadow-2xl p-8 border border-gray-100">

                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-gradient-to-r from-green-400 to-green-500 text-white text-sm font-bold px-6 py-2 rounded-full shadow-lg flex items-center gap-1 w-max">
                    <Star size={14} fill="currentColor" /> 7 dias grátis
                  </span>
                </div>

                <div className="mt-6 mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Gossip Couple Premium</h3>
                  <div className="mt-4 flex items-baseline justify-center">
                    <span className="text-5xl font-extrabold text-gray-900">R$ 29,90</span>
                    <span className="ml-2 text-xl font-medium text-gray-500">/mês</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8 text-left">
                  {[
                    "Acesso ilimitado para 2 pessoas",
                    "Assistente de IA completo",
                    "Integração com Google Calendar",
                    "Análise de investimentos em tempo real",
                    "Metas e objetivos compartilhados",
                    "Histórico financeiro completo",
                    "Suporte prioritário"
                  ].map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-pink-50 flex items-center justify-center mt-0.5">
                        <Check size={14} className="text-primary-start" />
                      </div>
                      <span className="ml-3 text-gray-600 font-medium text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => setView('signup')}
                  className="w-full bg-gradient-to-r from-primary-start to-primary-mid text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
                >
                  Assinar Agora <ArrowRight size={20} />
                </button>

                <p className="mt-4 text-xs text-gray-400">
                  Após a confirmação do pagamento, você poderá convidar seu parceiro(a) gratuitamente.
                </p>
              </div>
            </div>

            {/* Footer Trust Signals */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-center gap-6 text-gray-400 grayscale opacity-70">
                <div className="flex flex-col items-center gap-1">
                  <ShieldCheck size={24} />
                  <span className="text-[10px]">Seguro</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <CreditCard size={24} />
                  <span className="text-[10px]">Aceita cartões</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Lock size={24} />
                  <span className="text-[10px]">Cancele quando quiser</span>
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Cancele a qualquer momento. Sem taxas ocultas.
              </p>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // --- MAIN LANDING VIEW ---
  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans selection:bg-pink-100 animate-fade-in relative">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex-shrink-0 flex items-center gap-2 cursor-pointer" onClick={() => setView('login')}>
              <div className="w-8 h-8 bg-gradient-to-br from-primary-start to-primary-mid rounded-lg flex items-center justify-center shadow-md text-white font-bold">G</div>
              <span className="font-bold text-2xl tracking-tight bg-gradient-to-r from-primary-start via-primary-mid to-primary-end text-transparent bg-clip-text">
                Gossip Couple
              </span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex space-x-8">
              <button onClick={() => setView('features')} className="text-gray-500 hover:text-primary-start font-medium transition-colors">Como Funciona</button>
              <button onClick={() => setView('features')} className="text-gray-500 hover:text-primary-start font-medium transition-colors">Benefícios</button>
              <button onClick={() => setView('pricing')} className="text-gray-500 hover:text-primary-start font-medium transition-colors">Preços</button>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={() => setView('login')}
                className="text-gray-600 hover:text-primary-start font-medium px-4 py-2 transition-colors"
              >
                Entrar
              </button>
              <button
                onClick={() => setView('subscribe')}
                className="bg-gradient-to-r from-primary-start to-primary-mid text-white px-6 py-2.5 rounded-full font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center"
              >
                Assinar Agora
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg">
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-white border-b border-gray-100 shadow-xl py-4 px-4 flex flex-col space-y-4 animate-fade-in-up z-40">
            <button onClick={() => { setView('features'); setIsMobileMenuOpen(false); }} className="text-gray-700 hover:text-primary-start font-medium py-2 border-b border-gray-50 text-left">Como Funciona</button>
            <button onClick={() => { setView('features'); setIsMobileMenuOpen(false); }} className="text-gray-700 hover:text-primary-start font-medium py-2 border-b border-gray-50 text-left">Benefícios</button>
            <button onClick={() => { setView('pricing'); setIsMobileMenuOpen(false); }} className="text-gray-700 hover:text-primary-start font-medium py-2 border-b border-gray-50 text-left">Preços</button>
            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={() => setView('login')}
                className="w-full text-center text-gray-700 font-bold py-3 border border-gray-200 rounded-xl"
              >
                Entrar
              </button>
              <button
                onClick={() => setView('subscribe')}
                className="w-full text-center bg-primary-start text-white font-bold py-3 rounded-xl shadow-lg"
              >
                Assinar Agora
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-12 md:pt-20 pb-20 md:pb-32 overflow-hidden">
        <div className="absolute top-0 right-0 w-full md:w-1/2 h-full bg-gradient-to-bl from-pink-50 to-white -z-10 rounded-bl-[50px] md:rounded-bl-[100px]"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-pink-50 text-primary-start text-xs md:text-sm font-semibold mb-6 animate-fade-in">
            <Heart size={14} className="mr-2 fill-current" />
            A plataforma #1 para casais inteligentes
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-gray-900 tracking-tight mb-6">
            Finanças do Casal, <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-primary-start via-primary-mid to-primary-end text-transparent bg-clip-text block md:inline mt-2 md:mt-0">
              Transparentes e Inteligentes
            </span>
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-gray-500 mb-10 px-4">
            Gerencie investimentos, metas e despesas juntos. Com uma IA que entende vocês e ajuda a realizar sonhos mais rápido.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-12 md:mb-16 w-full max-w-sm mx-auto sm:max-w-none">
            <button
              onClick={() => setView('subscribe')}
              className="w-full sm:w-auto bg-gradient-to-r from-primary-start to-primary-mid text-white px-8 py-4 rounded-full font-bold text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center"
            >
              Assinar Agora <ArrowRight className="ml-2" size={20} />
            </button>
            <button
              onClick={() => setView('login')}
              className="w-full sm:w-auto bg-white text-gray-700 border-2 border-gray-100 hover:border-primary-mid px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 flex items-center justify-center"
            >
              Entrar
            </button>
          </div>

          {/* Helper for Prototype Testing */}
          <div className="mt-4 text-center">
            <button
              onClick={handleSimulateP2}
              className="text-xs text-gray-300 hover:text-gray-500 underline"
            >
              (Dev: Simular Link de Convite P2)
            </button>
          </div>

          {/* Hero Image/Dashboard Preview */}
          <div className="relative mx-auto max-w-5xl px-4 md:px-0">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
                alt="App Dashboard"
                className="w-full h-auto opacity-90"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/5 group cursor-pointer hover:bg-black/10 transition-colors">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg text-primary-start group-hover:scale-110 transition-transform">
                  <Play className="w-7 h-7 md:w-8 md:h-8 ml-1 fill-current" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Por que o Gossip Couple?</h2>
            <p className="text-lg md:text-xl text-gray-500">Tudo que vocês precisam para crescer juntos.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
            <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-primary-start shadow-sm mb-6">
                <TrendingUp size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Investimentos em Tempo Real</h3>
              <p className="text-gray-500">Acompanhem a carteira do casal com atualização de valores de mercado e sugestões baseadas no perfil de risco.</p>
            </div>

            <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-primary-start shadow-sm mb-6">
                <MessageSquare size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Assistente IA Dedicado</h3>
              <p className="text-gray-500">Um agente inteligente que ajuda a registrar gastos, agenda compromissos e dá conselhos financeiros no chat.</p>
            </div>

            <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-primary-start shadow-sm mb-6">
                <Calendar size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Sincronização Total</h3>
              <p className="text-gray-500">Integração com Google Calendar e sistema de metas compartilhadas para estarem sempre na mesma página.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 md:py-24 bg-gradient-to-b from-white to-pink-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Como Funciona</h2>
            <p className="text-lg md:text-xl text-gray-500">Simples, rápido e seguro.</p>
          </div>

          <div className="relative">
            {/* Connection Line (Desktop) */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -translate-y-1/2 z-0"></div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center">
                <div className="w-16 h-16 mx-auto bg-primary-start text-white rounded-full flex items-center justify-center text-2xl font-bold mb-6 shadow-lg shadow-primary-start/30">1</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Conectem-se</h3>
                <p className="text-gray-500">Crie sua conta e convide seu parceiro(a) para o ambiente compartilhado.</p>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center">
                <div className="w-16 h-16 mx-auto bg-primary-mid text-white rounded-full flex items-center justify-center text-2xl font-bold mb-6 shadow-lg shadow-primary-mid/30">2</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Definam Metas</h3>
                <p className="text-gray-500">Estabeleçam objetivos financeiros e deixem a IA criar o plano de ação.</p>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center">
                <div className="w-16 h-16 mx-auto bg-primary-end text-white rounded-full flex items-center justify-center text-2xl font-bold mb-6 shadow-lg shadow-primary-end/30">3</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Acompanhem</h3>
                <p className="text-gray-500">Monitore o progresso, receba insights e comemore as conquistas juntos.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Video Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="w-full aspect-video rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl relative bg-black">
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/80tr5oYM27E?rel=0"
              title="Gossip Couple Demo"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            ></iframe>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">O que os casais dizem</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-8 rounded-2xl shadow-sm">
                <div className="flex text-yellow-400 mb-4">
                  {[...Array(5)].map((_, idx) => <Star key={idx} size={16} fill="currentColor" />)}
                </div>
                <p className="text-gray-600 mb-6 italic text-sm md:text-base">"Mudou completamente nossa relação com o dinheiro. A IA nos ajudou a economizar para nossa lua de mel em tempo recorde!"</p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-200 rounded-full mr-3"></div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">Casal {i}</p>
                    <p className="text-xs text-gray-500">Assinantes há 6 meses</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 md:mb-12 text-center">Perguntas Frequentes</h2>
          <div className="space-y-4">
            {[
              { q: "Preciso conectar minha conta bancária?", a: "Não. O Gossip Couple funciona com registros manuais ou importação de dados, garantindo que você tenha controle total e privacidade, sem conexões bancárias diretas." },
              { q: "Podemos usar em dispositivos diferentes?", a: "Com certeza. O Gossip Couple funciona em qualquer dispositivo web ou mobile, sincronizado em tempo real." },
              { q: "Como funciona a IA?", a: "Nossa IA analisa seus dados anonimizados para sugerir otimizações de gastos e investimentos personalizados para seus objetivos." }
            ].map((item, idx) => (
              <div key={idx} className="border border-gray-200 rounded-2xl overflow-hidden">
                <button
                  className="w-full flex justify-between items-center p-6 text-left bg-white hover:bg-gray-50 transition-colors"
                  onClick={() => toggleFaq(idx)}
                >
                  <span className="font-semibold text-gray-900 text-sm md:text-base">{item.q}</span>
                  {openFaq === idx ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                </button>
                {openFaq === idx && (
                  <div className="p-6 pt-0 bg-gray-50 text-gray-600 text-sm leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="py-16 md:py-24 bg-gray-900 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary-start/20 to-transparent"></div>
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Prontos para evoluir juntos?</h2>
          <p className="text-lg md:text-xl text-gray-400 mb-10">Comecem hoje o futuro financeiro do casal.</p>
          <button
            onClick={() => setView('subscribe')}
            className="w-full sm:w-auto bg-gradient-to-r from-primary-start to-primary-mid text-white px-10 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-primary-start/50 transition-all"
          >
            Começar Gratuitamente
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-primary-start to-primary-mid text-transparent bg-clip-text mb-4 block">
                Gossip Couple
              </span>
              <p className="text-sm text-gray-500">
                Amor e finanças, em perfeita sintonia.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><button onClick={() => setView('features')} className="hover:text-primary-start">Funcionalidades</button></li>
                <li><button onClick={() => setView('security')} className="hover:text-primary-start">Segurança</button></li>
                <li><button onClick={() => setView('pricing')} className="hover:text-primary-start">Preços</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><button onClick={() => setView('about')} className="hover:text-primary-start">Sobre nós</button></li>
                <li><button onClick={() => setView('careers')} className="hover:text-primary-start">Carreiras</button></li>
                <li><button onClick={() => setView('blog')} className="hover:text-primary-start">Blog</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><button onClick={() => setView('privacy')} className="hover:text-primary-start">Privacidade</button></li>
                <li><button onClick={() => setView('terms')} className="hover:text-primary-start">Termos</button></li>
              </ul>
            </div>
          </div>
          <div className="text-center pt-8 border-t border-gray-100 text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Gossip Couple. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;