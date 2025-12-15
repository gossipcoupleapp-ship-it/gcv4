
import React, { useState } from 'react';
import {
  User,
  Users,
  DollarSign,
  Calendar,
  CheckCircle,
  ArrowRight,
  TrendingUp,
  Link,
  Copy,
  Play,
  MessageCircle,
  Camera,
  Upload,
  CalendarDays
} from 'lucide-react';
import { UserRole, OnboardingData } from '../types';
import { supabase } from '../src/lib/supabase';

interface OnboardingProps {
  userRole: UserRole;
  inviteToken?: string;
  onFinish: (data: OnboardingData) => void;
  calendarConnected?: boolean;
}

const Onboarding: React.FC<OnboardingProps> = ({ userRole, inviteToken, onFinish, calendarConnected = false }) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    userName: '',
    coupleName: '',
    monthlyIncome: '',
    incomeReceiptDate: '',
    riskProfile: 'medium',
    calendarConnected: false,
    profileImage: undefined
  });
  const [inviteLink, setInviteLink] = useState('');
  const [loadingInvite, setLoadingInvite] = useState(false);

  // Persistence: Load State
  React.useEffect(() => {
    const saved = localStorage.getItem('gossip_onboarding_backup');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.data) setData(d => ({ ...d, ...parsed.data }));
        if (parsed.step) setStep(parsed.step);
      } catch (e) {
        console.error("Failed to restore onboarding state", e);
      }
    }
  }, []);

  // Persistence: Save State
  React.useEffect(() => {
    localStorage.setItem('gossip_onboarding_backup', JSON.stringify({ data, step }));
  }, [data, step]);

  // Fetch Invite Link for P1 when reaching step 7
  React.useEffect(() => {
    if (userRole === 'P1' && step === 7 && !inviteLink) {
      const fetchInvite = async () => {
        setLoadingInvite(true);
        try {
          // Use invite-manager to create invite
          const { data, error } = await supabase.functions.invoke('invite-manager', {
            body: { action: 'create_invite' }
          });
          if (error) throw error;

          // Use 'token' param as expected by App.tsx
          const link = `${window.location.origin}/?token=${data.invite_token}`;
          setInviteLink(link);
        } catch (err) {
          console.error("Error creating invite:", err);
          setInviteLink("Erro ao gerar link. Tente recarregar.");
        } finally {
          setLoadingInvite(false);
        }
      };
      fetchInvite();
    }
  }, [userRole, step, inviteLink]);

  const handleNext = () => {
    setStep(step + 1);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setData({ ...data, profileImage: e.target.result as string });
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // --- SUPABASE PERSISTENCE ---

  const uploadAvatar = async (base64Image: string, userId: string): Promise<string | null> => {
    try {
      // Convert Base64 to Blob
      const res = await fetch(base64Image);
      const blob = await res.blob();
      const fileName = `${userId}-${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err) {
      console.error("Avatar Upload Error:", err);
      return null;
    }
  };

  const handleFinish = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      // 1. Upload Image (if exists)
      let avatarUrl = data.profileImage;
      if (data.profileImage && data.profileImage.startsWith('data:')) {
        const uploadedUrl = await uploadAvatar(data.profileImage, user.id);
        if (uploadedUrl) avatarUrl = uploadedUrl;
      }

      // 2. Update Profile
      const { error: profileError } = await (supabase
        .from('profiles') as any)
        .update({
          full_name: data.userName,
          income: parseFloat(data.monthlyIncome || '0'),
          income_date: parseInt(data.incomeReceiptDate || '1'),
          avatar_url: avatarUrl,
          onboarding_completed: true
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 3. Update Couple (P1 only)
      if (userRole === 'P1' && data.coupleName) {
        const { data: profile } = await (supabase.from('profiles') as any).select('couple_id').eq('id', user.id).maybeSingle();
        if (profile?.couple_id) {
          await (supabase
            .from('couples') as any)
            .update({
              name: data.coupleName,
              financial_risk_profile: data.riskProfile
            })
            .eq('id', profile.couple_id);
        }
      }

      // 4. Join Couple (P2 only)
      if (userRole === 'P2' && inviteToken) {
        const { error: joinError } = await supabase.functions.invoke('invite-manager', {
          body: {
            action: 'join_couple',
            invite_token: inviteToken
          }
        });

        if (joinError) throw joinError;
      }

      // 5. Finish
      onFinish(data); // This triggers parent to re-fetch/redirect

    } catch (err) {
      console.error("Onboarding Save Error:", err);
      alert("Erro ao salvar dados. Tente novamente.");
    }
  };

  const renderStepIndicator = () => {
    const totalSteps = userRole === 'P1' ? 8 : 5; // Added 1 step for Photo
    return (
      <div className="flex gap-2 mb-8 justify-center">
        {[...Array(totalSteps)].map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${i + 1 <= step ? 'w-8 bg-primary-mid' : 'w-2 bg-gray-200'
              }`}
          />
        ))}
      </div>
    );
  };

  // --- STEP CONTENT RENDERERS ---

  // 1. Basic Info (Both)
  const renderNameStep = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-start">
          <User size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          {userRole === 'P2' ? 'Bem-vindo(a) ao time!' : 'Vamos começar!'}
        </h2>
        <p className="text-gray-500 mt-2">
          {userRole === 'P2'
            ? 'Seu parceiro(a) te convidou para gerenciar as finanças juntos.'
            : 'Primeiro, como você gostaria de ser chamado?'}
        </p>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Seu Nome</label>
        <input
          type="text"
          value={data.userName}
          onChange={(e) => setData({ ...data, userName: e.target.value })}
          className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none text-lg"
          placeholder="Ex: Alex"
          autoFocus
        />
      </div>

      <button
        onClick={handleNext}
        disabled={!data.userName}
        className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
      >
        Continuar <ArrowRight size={20} />
      </button>
    </div>
  );

  // 2. Profile Photo Step (Both - NEW)
  const renderPhotoStep = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-600">
          <Camera size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Sua Foto de Perfil</h2>
        <p className="text-gray-500 mt-2">Adicione uma foto para personalizar sua experiência. (Opcional)</p>
      </div>

      <div className="flex flex-col items-center justify-center py-4">
        <div className="relative group">
          <div className="w-32 h-32 rounded-full bg-gray-100 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
            {data.profileImage ? (
              <img src={data.profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={48} className="text-gray-300" />
            )}
          </div>
          <label className="absolute bottom-0 right-0 bg-primary-mid text-white p-3 rounded-full shadow-lg cursor-pointer hover:bg-primary-start transition-all hover:scale-110">
            <Upload size={18} />
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleNext}
          className="flex-1 py-4 bg-white border border-gray-200 text-gray-500 font-bold rounded-xl hover:bg-gray-50 transition-colors"
        >
          Pular
        </button>
        <button
          onClick={handleNext}
          className="flex-1 py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
        >
          {data.profileImage ? 'Ficou ótimo!' : 'Continuar'} <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );

  // 3. Couple Info (P1 Only)
  const renderCoupleStep = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-start">
          <Users size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Nome do Casal</h2>
        <p className="text-gray-500 mt-2">Como vocês querem chamar o time financeiro de vocês?</p>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Casal</label>
        <input
          type="text"
          value={data.coupleName}
          onChange={(e) => setData({ ...data, coupleName: e.target.value })}
          className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none text-lg"
          placeholder="Ex: Casal Power, Família Silva"
        />
      </div>

      <button
        onClick={handleNext}
        disabled={!data.coupleName}
        className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
      >
        Continuar <ArrowRight size={20} />
      </button>
    </div>
  );

  // 4. Calendar Connection (Both)
  const renderCalendarStep = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
          <Calendar size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Sincronizar Agenda</h2>
        <p className="text-gray-500 mt-2">Conecte seu Google Calendar para que a IA possa organizar seus compromissos.</p>
      </div>

      {data.calendarConnected ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center animate-fade-in">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 text-green-600">
            <CheckCircle size={24} />
          </div>
          <h3 className="font-bold text-green-800">Google Calendar Conectado!</h3>
          <p className="text-sm text-green-700 mt-1">Sua agenda será sincronizada automaticamente.</p>
        </div>
      ) : (
        <button
          onClick={() => {
            // Save state explicitly before redirect (though effect handles it too)
            localStorage.setItem('gossip_onboarding_backup', JSON.stringify({ data, step }));

            const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '74342658672-an85oqs0lb7us7lr1km1pgor3kdfnd8r.apps.googleusercontent.com';
            const redirectUri = window.location.origin;
            const scope = 'https://www.googleapis.com/auth/calendar';
            // access_type=offline and prompt=consent are CRITICAL for receiving a refresh_token
            const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
            window.location.href = url;
          }}
          className="w-full py-4 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Conectar Google Calendar
        </button>
      )}

      {/* Manual Continue Button (Disabled if not connected? Optional, maybe strictly require it or allow skip) */}
      {/* For now allowing continue regardless but encouraging connection */}
      <button
        onClick={() => {
          if (data.calendarConnected) {
            setData({ ...data, calendarConnected: true });
          }
          handleNext();
        }}
        className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-black transition-all"
      >
        {data.calendarConnected ? 'Continuar' : 'Pular por enquanto'}
      </button>
    </div>
  );

  // 5. Risk Profile (P1 Only)
  const renderRiskStep = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-600">
          <TrendingUp size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Perfil de Investidor</h2>
        <p className="text-gray-500 mt-2">Qual a tolerância a risco do casal para investimentos?</p>
      </div>

      <div className="space-y-3">
        {['low', 'medium', 'high'].map((risk) => (
          <div
            key={risk}
            onClick={() => setData({ ...data, riskProfile: risk as any })}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-4 ${data.riskProfile === risk ? 'border-primary-mid bg-pink-50' : 'border-gray-100 bg-white'}`}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${data.riskProfile === risk ? 'border-primary-mid' : 'border-gray-300'}`}>
              {data.riskProfile === risk && <div className="w-2 h-2 bg-primary-mid rounded-full" />}
            </div>
            <div>
              <h4 className="font-bold text-gray-800 capitalize">
                {risk === 'low' ? 'Conservador' : risk === 'medium' ? 'Moderado' : 'Arrojado'}
              </h4>
              <p className="text-xs text-gray-500">
                {risk === 'low' ? 'Segurança acima de tudo.' : risk === 'medium' ? 'Equilíbrio entre risco e retorno.' : 'Foco em alta rentabilidade.'}
              </p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleNext}
        className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
      >
        Continuar <ArrowRight size={20} />
      </button>
    </div>
  );

  // 6. Income (Both)
  const renderIncomeStep = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
          <DollarSign size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Renda Mensal</h2>
        <p className="text-gray-500 mt-2">Para ajudar a IA a planejar o orçamento.</p>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor da Renda</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
          <input
            type="number"
            value={data.monthlyIncome}
            onChange={(e) => setData({ ...data, monthlyIncome: e.target.value })}
            className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none text-lg font-bold text-gray-800"
            placeholder="0,00"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dia do Recebimento</label>
        <div className="relative">
          <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="number"
            min="1"
            max="31"
            value={data.incomeReceiptDate}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if ((val >= 1 && val <= 31) || e.target.value === '') {
                setData({ ...data, incomeReceiptDate: e.target.value });
              }
            }}
            className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none text-lg font-bold text-gray-800"
            placeholder="Dia (1-31)"
          />
        </div>
      </div>

      <button
        onClick={handleNext}
        disabled={!data.monthlyIncome || !data.incomeReceiptDate}
        className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
      >
        Continuar <ArrowRight size={20} />
      </button>
    </div>
  );

  // 7. Invite (P1 Only)
  const renderInviteStep = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary-start/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-start">
          <Link size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Convide seu Amor</h2>
        <p className="text-gray-500 mt-2">Envie o link para conectar as contas.</p>
      </div>

      <div className="bg-gray-100 p-4 rounded-xl break-all text-xs text-gray-500 font-mono text-center flex items-center justify-center min-h-[3rem]">
        {loadingInvite ? (
          <span className="animate-pulse">Gerando link exclusivo...</span>
        ) : (
          inviteLink
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => {
            navigator.clipboard.writeText(inviteLink);
            alert("Link copiado!");
          }}
          className="py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
        >
          <Copy size={18} /> Copiar
        </button>
        <button
          onClick={() => {
            const msg = `Oi! Acabei de criar nossa conta no Gossip Couple para o casal '${data.coupleName}'. Entra aí pra gente organizar tudo: ${inviteLink}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
          }}
          className="py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 flex items-center justify-center gap-2"
        >
          <MessageCircle size={18} /> WhatsApp
        </button>
      </div>

      <button
        onClick={handleNext}
        className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4"
      >
        Já enviei, continuar <ArrowRight size={20} />
      </button>
    </div>
  );

  // 8. Tutorial (Both)
  const renderVideoStep = () => (
    <div className="space-y-6 animate-fade-in text-center">
      <h2 className="text-2xl font-bold text-gray-900">Como usar a plataforma</h2>
      <p className="text-gray-500 -mt-2 mb-4">Um guia rápido de 1 minuto.</p>

      <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-xl bg-black">
        <iframe
          width="100%"
          height="100%"
          src="https://www.youtube.com/embed/80tr5oYM27E?rel=0"
          title="Gossip Couple Tutorial"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        ></iframe>
      </div>

      <button
        onClick={handleFinish}
        className="w-full py-4 bg-gradient-to-r from-primary-start to-primary-mid text-white font-bold rounded-xl shadow-lg hover:shadow-primary-start/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
      >
        Ir para o Dashboard <ArrowRight size={20} />
      </button>
    </div>
  );

  // Main Logic to choose step based on User Role
  let content;
  if (userRole === 'P1') {
    switch (step) {
      case 1: content = renderNameStep(); break;
      case 2: content = renderPhotoStep(); break;
      case 3: content = renderCoupleStep(); break;
      case 4: content = renderCalendarStep(); break;
      case 5: content = renderRiskStep(); break;
      case 6: content = renderIncomeStep(); break;
      case 7: content = renderInviteStep(); break;
      case 8: content = renderVideoStep(); break;
      default: content = <div>Erro</div>;
    }
  } else {
    // P2 Flow
    switch (step) {
      case 1: content = renderNameStep(); break;
      case 2: content = renderPhotoStep(); break;
      case 3: content = renderIncomeStep(); break;
      case 4: content = renderCalendarStep(); break;
      case 5: content = renderVideoStep(); break;
      default: content = <div>Erro</div>;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative">
        {renderStepIndicator()}
        {content}
      </div>
    </div>
  );
};

export default Onboarding;
