import React, { useState, useEffect } from 'react';
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

const STORAGE_KEY = 'gossip_onboarding_state';

const Onboarding: React.FC<OnboardingProps> = ({ userRole, inviteToken, onFinish, calendarConnected = false }) => {

  // 1. Lazy State Initialization (Reads from storage BEFORE first render)
  const [step, setStep] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.step || 1;
      }
    } catch (e) {
      console.warn("Failed to load saved step:", e);
    }
    return 1;
  });

  const [data, setData] = useState<OnboardingData>(() => {
    const initialData: OnboardingData = {
      userName: '',
      coupleName: '',
      monthlyIncome: '',
      incomeReceiptDate: '',
      riskProfile: 'medium',
      calendarConnected: false,
      profileImage: undefined
    };

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.data ? { ...initialData, ...parsed.data } : initialData;
      }
    } catch (e) {
      console.warn("Failed to load saved data:", e);
    }
    return initialData;
  });

  const [inviteLink, setInviteLink] = useState('');
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // 2. React to Prop Updates (Calendar Connection from App.tsx)
  useEffect(() => {
    if (calendarConnected && !data.calendarConnected) {
      setData(prev => ({ ...prev, calendarConnected: true }));
    }
  }, [calendarConnected]);

  // 3. Persist State on Change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, step }));
    } catch (e) {
      console.warn("Storage quota exceeded or error:", e);
    }
  }, [data, step]);

  // 4. Invite Token Logic (P1)
  useEffect(() => {
    if (userRole === 'P1' && step === 7 && !inviteLink) {
      const fetchInvite = async () => {
        setLoadingInvite(true);
        try {
          const { data, error } = await supabase.functions.invoke('invite-manager', {
            body: { action: 'create_invite' }
          });
          if (error) throw error;
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


  // 5. Handlers

  // Progressive Save Helper
  const saveToDatabase = async (currentData: OnboardingData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Map to DB Schema (Snake Case)
      const updates: any = {
        full_name: currentData.userName,
        // Only parse if set to avoid NaN
        monthly_income: currentData.monthlyIncome ? parseFloat(currentData.monthlyIncome) : null,
        income_receipt_day: currentData.incomeReceiptDate ? parseInt(currentData.incomeReceiptDate) : null,
        avatar_url: currentData.profileImage,
        role: userRole // Ensure role is kept sync
      };

      // 2. Update Profile
      const { error: profileError } = await (supabase.from('profiles') as any)
        .update(updates)
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 3. Update Couple (P1 Only & if name exists)
      if (userRole === 'P1' && currentData.coupleName) {
        // Get couple_id from profile
        const { data: profile } = await (supabase.from('profiles') as any).select('couple_id').eq('id', user.id).maybeSingle();

        if (profile?.couple_id) {
          await (supabase.from('couples') as any)
            .update({
              name: currentData.coupleName,
              financial_risk_profile: currentData.riskProfile
            })
            .eq('id', profile.couple_id);
        }
      }

    } catch (err) {
      console.error("Progressive Save Error:", err);
      // Silent fail or toast? For now silent to not block flow, detailed log
    }
  };

  const handleNext = async () => {
    // Save before moving next
    await saveToDatabase(data);
    setStep(prev => prev + 1);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadingImage(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not found for upload");

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        // Direct Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        // Store URL Only
        const newData = { ...data, profileImage: publicUrl };
        setData(newData);

        // Auto-save image link to DB immediately
        await saveToDatabase(newData);

      } catch (error) {
        console.error('Error uploading avatar:', error);
        alert('Erro ao fazer upload da imagem. Tente novamente.');
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleFinish = async () => {
    try {
      // Clear Storage FIRST
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) { console.error("Error clearing storage:", e); }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      // Final Save to ensure everything is synced
      // Explicitly set onboarding_completed here
      const { error: profileError } = await (supabase.from('profiles') as any)
        .update({
          onboarding_completed: true,
          // Re-send key fields just in case
          full_name: data.userName,
          monthly_income: data.monthlyIncome ? parseFloat(data.monthlyIncome) : null,
          income_receipt_day: data.incomeReceiptDate ? parseInt(data.incomeReceiptDate) : null,
          avatar_url: data.profileImage
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Join Couple (P2 Only) - Logic remains same
      if (userRole === 'P2' && inviteToken) {
        const { error: joinError } = await supabase.functions.invoke('invite-manager', {
          body: {
            action: 'join_couple',
            invite_token: inviteToken
          }
        });
        if (joinError) throw joinError;
      }

      // Notify Parent
      onFinish(data);

    } catch (err) {
      console.error("Onboarding Finish Error:", err);
      alert("Erro ao finalizar. Seus dados foram salvos parcialmente. Tente novamente.");
    }
  };

  // --- Renderers ---

  const renderStepIndicator = () => {
    const totalSteps = userRole === 'P1' ? 8 : 5;
    return (
      <div className="flex gap-2 mb-8 justify-center">
        {[...Array(totalSteps)].map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${i + 1 <= step ? 'w-8 bg-primary-mid' : 'w-2 bg-gray-200'}`}
          />
        ))}
      </div>
    );
  };

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

  const renderPhotoStep = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-600">
          <Camera size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Sua Foto de Perfil</h2>
        <p className="text-gray-500 mt-2">Adicione uma foto para personalizar sua experiência.</p>
      </div>

      <div className="flex flex-col items-center justify-center py-4">
        <div className="relative group">
          <div className="w-32 h-32 rounded-full bg-gray-100 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden relative">
            {data.profileImage ? (
              <img src={data.profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : uploadingImage ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="w-8 h-8 border-2 border-primary-mid border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <User size={48} className="text-gray-300" />
            )}
          </div>
          <label className={`absolute bottom-0 right-0 bg-primary-mid text-white p-3 rounded-full shadow-lg cursor-pointer hover:bg-primary-start transition-all hover:scale-110 ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <Upload size={18} />
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
          </label>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={handleNext} className="flex-1 py-4 bg-white border border-gray-200 text-gray-500 font-bold rounded-xl hover:bg-gray-50 transition-colors">
          Pular
        </button>
        <button onClick={handleNext} className="flex-1 py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
          {data.profileImage ? 'Ficou ótimo!' : 'Continuar'} <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );

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
      <button onClick={handleNext} disabled={!data.coupleName} className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2">
        Continuar <ArrowRight size={20} />
      </button>
    </div>
  );

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
            // Explicit Save (Redundant due to effect, but safe)
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, step })); } catch (e) { }

            const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
            if (!clientId) {
              console.error('Missing Google Client ID');
              alert('Erro de configuração: Google Client ID não encontrado.');
              return;
            }
            const redirectUri = window.location.origin;
            const scope = 'https://www.googleapis.com/auth/calendar';
            const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
            window.location.href = url;
          }}
          className="w-full py-4 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Conectar Google Calendar
        </button>
      )}

      <button
        onClick={() => {
          // Optimistic update if they clicked to continue (maybe they connected in another tab or just skip)
          if (calendarConnected) setData(prev => ({ ...prev, calendarConnected: true }));
          handleNext();
        }}
        className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-black transition-all"
      >
        {data.calendarConnected ? 'Continuar' : 'Pular por enquanto'}
      </button>
    </div>
  );

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
      <button onClick={handleNext} className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
        Continuar <ArrowRight size={20} />
      </button>
    </div>
  );

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

      <button onClick={handleNext} disabled={!data.monthlyIncome || !data.incomeReceiptDate} className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2">
        Continuar <ArrowRight size={20} />
      </button>
    </div>
  );

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
        {loadingInvite ? <span className="animate-pulse">Gerando link exclusivo...</span> : inviteLink}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => { navigator.clipboard.writeText(inviteLink); alert("Link copiado!"); }} className="py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2">
          <Copy size={18} /> Copiar
        </button>
        <button onClick={() => { const msg = `Oi! Acabei de criar nossa conta no Gossip Couple para o casal '${data.coupleName}'. Entra aí pra gente organizar tudo: ${inviteLink}`; window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank'); }} className="py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 flex items-center justify-center gap-2">
          <MessageCircle size={18} /> WhatsApp
        </button>
      </div>

      <button onClick={handleNext} className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4">
        Já enviei, continuar <ArrowRight size={20} />
      </button>
    </div>
  );

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
      <button onClick={handleFinish} className="w-full py-4 bg-gradient-to-r from-primary-start to-primary-mid text-white font-bold rounded-xl shadow-lg hover:shadow-primary-start/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
        Ir para o Dashboard <ArrowRight size={20} />
      </button>
    </div>
  );

  // --- Step Router ---
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
      default: content = <div>Erro: Passo {step} não encontrado. <button onClick={() => setStep(1)} className="text-primary-mid underline">Reiniciar</button></div>;
    }
  } else {
    // P2 Flow
    switch (step) {
      case 1: content = renderNameStep(); break;
      case 2: content = renderPhotoStep(); break;
      case 3: content = renderIncomeStep(); break;
      case 4: content = renderCalendarStep(); break;
      case 5: content = renderVideoStep(); break;
      default: content = <div>Erro: Passo {step} não encontrado. <button onClick={() => setStep(1)} className="text-primary-mid underline">Reiniciar</button></div>;
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
